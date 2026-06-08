import { useEffect, useState } from "react";
import { AttendancePayrollTable, AttendanceTable, TrackingLink } from "../components/AttendanceTable";
import { ActionList, EmptyState, LoadingWorkspace, MetricCard } from "../components/shared";
import { apiFetch, apiFetchVoid, ApiRequestError } from "../lib/api";
import {
  formatDateTime,
  formatLocalDateKey,
  formatMoney,
  formatMonthKey,
  formatTimeOnly,
  formatWorkedHours,
  isLateCheckIn
} from "../lib/format";
import type {
  AdminTracking,
  AttendancePreview,
  AttendanceRow,
  Branch,
  Dashboard,
  Employee,
  PayrollSummary,
  Session
} from "../types";

type EmployeeFormState = {
  employeeCode: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  branchId: string;
  monthlySalary: string;
  monthlyLeaveAllowance: string;
  advancePaid: string;
};

export function AdminScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [tracking, setTracking] = useState<AdminTracking | null>(null);
  const [trackingDate, setTrackingDate] = useState(() => formatLocalDateKey(new Date()));
  const [previewImage, setPreviewImage] = useState<AttendancePreview | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeFormStatus, setEmployeeFormStatus] = useState("");
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(() => formatMonthKey(new Date()));
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({
    employeeCode: "",
    name: "",
    designation: "",
    email: "",
    phone: "",
    branchId: "",
    monthlySalary: "",
    monthlyLeaveAllowance: "0",
    advancePaid: "0"
  });

  function resetEmployeeForm(nextBranches: Branch[] = branches) {
    setEditingEmployeeId(null);
    setEmployeeFormStatus("");
    setEmployeeForm({
      employeeCode: "",
      name: "",
      designation: "",
      email: "",
      phone: "",
      branchId: nextBranches[0]?.id ?? "",
      monthlySalary: "",
      monthlyLeaveAllowance: "0",
      advancePaid: "0"
    });
  }

  async function loadAdminData() {
    try {
      setLoadError("");
      const [dashboardData, employeeData, branchData, attendanceData, trackingData, payrollData] = await Promise.all([
        apiFetch<Dashboard>(session, "/admin/dashboard"),
        apiFetch<Employee[]>(session, "/admin/employees"),
        apiFetch<Branch[]>(session, "/admin/branches"),
        apiFetch<AttendanceRow[]>(session, "/admin/attendance"),
        apiFetch<AdminTracking>(session, `/admin/tracking?date=${trackingDate}`),
        apiFetch<PayrollSummary>(session, `/admin/payroll?month=${payrollMonth}`)
      ]);

      setDashboard(dashboardData);
      setEmployees(employeeData);
      setBranches(branchData);
      setAttendance(attendanceData);
      setTracking(trackingData);
      setPayroll(payrollData);
      setEmployeeForm((current) =>
        current.branchId || !branchData.length
          ? current
          : { ...current, branchId: branchData[0].id }
      );
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        onLogout();
        return;
      }

      setLoadError(error instanceof Error ? error.message : "Unable to load your dashboard.");
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [session, trackingDate, payrollMonth, onLogout]);

  function updateEmployeeForm(key: keyof EmployeeFormState, value: string) {
    setEmployeeForm((current) => ({ ...current, [key]: value }));
  }

  function startEditingEmployee(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setEmployeeFormStatus("");
    setEmployeeForm({
      employeeCode: employee.employeeCode,
      name: employee.name,
      designation: employee.designation,
      email: employee.email,
      phone: employee.phone,
      branchId: employee.branchId,
      monthlySalary: employee.monthlySalary,
      monthlyLeaveAllowance: String(employee.monthlyLeaveAllowance),
      advancePaid: employee.advancePaid
    });
  }

  async function handleEmployeeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmployeeSaving(true);
    setEmployeeFormStatus("");

    try {
      const payload = {
        ...employeeForm,
        monthlySalary: Number(employeeForm.monthlySalary || "0"),
        monthlyLeaveAllowance: Number(employeeForm.monthlyLeaveAllowance || "0"),
        advancePaid: Number(employeeForm.advancePaid || "0")
      };

      await apiFetch<Employee>(
        session,
        editingEmployeeId ? `/admin/employees/${editingEmployeeId}` : "/admin/employees",
        {
          method: editingEmployeeId ? "PUT" : "POST",
          body: JSON.stringify(payload)
        }
      );

      setEmployeeFormStatus(
        editingEmployeeId ? "Employee updated successfully." : "Employee added successfully."
      );
      resetEmployeeForm();
      await loadAdminData();
    } catch (error) {
      setEmployeeFormStatus(
        error instanceof Error ? error.message : "Unable to save employee."
      );
    } finally {
      setEmployeeSaving(false);
    }
  }

  async function changeEmployeeStatus(employeeId: string, status: "ACTIVE" | "INACTIVE") {
    setEmployeeFormStatus("");
    try {
      await apiFetch<Employee>(session, `/admin/employees/${employeeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadAdminData();
    } catch (error) {
      setEmployeeFormStatus(
        error instanceof Error ? error.message : "Unable to update employee status."
      );
    }
  }

  async function removeEmployee(employeeId: string, employeeName: string) {
    if (!window.confirm(`Remove ${employeeName} from this property? Existing attendance records will stay visible in reports.`)) {
      return;
    }

    setEmployeeFormStatus("");
    try {
      await apiFetchVoid(session, `/admin/employees/${employeeId}`, {
        method: "DELETE"
      });
      if (editingEmployeeId === employeeId) {
        resetEmployeeForm();
      }
      await loadAdminData();
    } catch (error) {
      setEmployeeFormStatus(
        error instanceof Error ? error.message : "Unable to remove employee."
      );
    }
  }

  if (!dashboard) {
    if (loadError) {
      return (
        <main className="workspace">
          <section className="panel">
            <span className="eyebrow">ATTENDIFY</span>
            <h2>Unable to open your dashboard</h2>
            <p className="error-text">{loadError}</p>
            <div className="action-row">
              <button className="primary-button" onClick={() => window.location.reload()}>
                Try again
              </button>
              <button className="ghost-button" onClick={onLogout}>
                Back to sign in
              </button>
            </div>
          </section>
        </main>
      );
    }

    return <LoadingWorkspace title="Loading your dashboard" lines={5} />;
  }

  const todayKey = formatLocalDateKey(new Date());
  const todayAttendance = attendance.filter((record) => record.date === todayKey);
  const todayAttendanceIds = new Set(todayAttendance.map((record) => record.employeeId));
  const absentEmployees = employees.filter(
    (employee) => employee.status === "ACTIVE" && !todayAttendanceIds.has(employee.id)
  );
  const checkedInEmployees = todayAttendance.filter((record) => record.status === "CHECKED_IN");
  const checkedOutEmployees = todayAttendance.filter((record) => record.status === "COMPLETED");
  const lateArrivals = todayAttendance.filter((record) => isLateCheckIn(record.checkInTime));

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">ATTENDIFY admin view</span>
          <h2>{session.user.name}</h2>
          <p className="muted">
            Track today&apos;s attendance, review proof, and focus on what needs attention first.
          </p>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="metric-grid">
        <MetricCard label="Total employees" value={dashboard.cards.totalEmployees} />
        <MetricCard label="Present today" value={dashboard.cards.presentToday} />
        <MetricCard label="Checked out" value={dashboard.cards.checkedOutToday} />
        <MetricCard label="Absent today" value={dashboard.cards.absentToday} />
      </section>

      <section className="grid two-column">
        <article className="panel">
          <div className="topbar">
            <div>
              <h3>{editingEmployeeId ? "Edit employee" : "Add employee"}</h3>
              <p className="muted section-intro">
                Owners can add staff after property setup, keep people active or inactive, and store salary rules in one place.
              </p>
            </div>
            {editingEmployeeId ? (
              <button className="ghost-button" onClick={() => resetEmployeeForm()}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <form className="admin-form-grid" onSubmit={handleEmployeeSubmit}>
            <div className="grid two-column compact-grid">
              <label>
                Employee code
                <input
                  required
                  value={employeeForm.employeeCode}
                  onChange={(event) => updateEmployeeForm("employeeCode", event.target.value)}
                  placeholder="EMP-001"
                />
              </label>
              <label>
                Full name
                <input
                  required
                  value={employeeForm.name}
                  onChange={(event) => updateEmployeeForm("name", event.target.value)}
                  placeholder="Rahul Sharma"
                />
              </label>
            </div>
            <div className="grid two-column compact-grid">
              <label>
                Designation
                <input
                  required
                  value={employeeForm.designation}
                  onChange={(event) => updateEmployeeForm("designation", event.target.value)}
                  placeholder="Front desk / Cashier / Manager"
                />
              </label>
              <label>
                Branch
                <select
                  required
                  value={employeeForm.branchId}
                  onChange={(event) => updateEmployeeForm("branchId", event.target.value)}
                >
                  <option value="" disabled>
                    Select branch
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid two-column compact-grid">
              <label>
                Email
                <input
                  required
                  type="email"
                  value={employeeForm.email}
                  onChange={(event) => updateEmployeeForm("email", event.target.value)}
                  placeholder="employee@property.com"
                />
              </label>
              <label>
                Phone
                <input
                  required
                  value={employeeForm.phone}
                  onChange={(event) => updateEmployeeForm("phone", event.target.value)}
                  placeholder="+91-98xxxxxxx"
                />
              </label>
            </div>
            <div className="grid three-column compact-grid">
              <label>
                Monthly salary
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={employeeForm.monthlySalary}
                  onChange={(event) => updateEmployeeForm("monthlySalary", event.target.value)}
                  placeholder="20000"
                />
              </label>
              <label>
                Allowed leaves / month
                <input
                  required
                  min="0"
                  max="31"
                  type="number"
                  value={employeeForm.monthlyLeaveAllowance}
                  onChange={(event) => updateEmployeeForm("monthlyLeaveAllowance", event.target.value)}
                  placeholder="2"
                />
              </label>
              <label>
                Advance already paid
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={employeeForm.advancePaid}
                  onChange={(event) => updateEmployeeForm("advancePaid", event.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
            <div className="action-row">
              <button className="primary-button" disabled={employeeSaving} type="submit">
                {employeeSaving
                  ? "Saving..."
                  : editingEmployeeId
                    ? "Update employee"
                    : "Add employee"}
              </button>
              <span className="muted">New employees can sign in with their email and starter password `password`.</span>
            </div>
            {employeeFormStatus ? (
              <p className={employeeFormStatus.includes("successfully") ? "status-text" : "error-text"}>
                {employeeFormStatus}
              </p>
            ) : null}
          </form>
        </article>

        <article className="panel">
          <div className="topbar">
            <div>
              <h3>Payroll snapshot</h3>
              <p className="muted section-intro">
                Check how much is payable this month after worked days, allowed leave, and advances.
              </p>
            </div>
            <label className="date-filter">
              Payroll month
              <input
                type="month"
                value={payrollMonth}
                onChange={(event) => setPayrollMonth(event.target.value)}
              />
            </label>
          </div>
          {payroll?.employees.length ? (
            <>
              <div className="payroll-summary-grid">
                <MetricCard label="People in payroll" value={payroll.employees.length} />
                <MetricCard
                  label="Total payable"
                  value={formatMoney(
                    payroll.employees.reduce(
                      (sum, employee) => sum + Number(employee.netPayable.value),
                      0
                    )
                  )}
                />
              </div>
              <div className="attendance-card-list payroll-card-list">
                {payroll.employees.map((employeePayroll) => (
                  <article className="attendance-card" key={employeePayroll.employeeId}>
                    <div className="attendance-card-header">
                      <strong>{employeePayroll.employeeName}</strong>
                      <span className="pill">{employeePayroll.status}</span>
                    </div>
                    <div className="attendance-card-grid">
                      <span>Worked days</span>
                      <strong>{employeePayroll.workedDays}</strong>
                      <span>Allowed leaves</span>
                      <strong>{employeePayroll.allowedLeaves}</strong>
                      <span>Unpaid leaves</span>
                      <strong>{employeePayroll.unpaidLeaveDays}</strong>
                      <span>Advance paid</span>
                      <strong>{formatMoney(employeePayroll.advancePaid.value)}</strong>
                      <span>Net payable</span>
                      <strong>{formatMoney(employeePayroll.netPayable.value)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No payroll data yet"
              message="Payroll will appear here after employees are added with salary details."
            />
          )}
        </article>
      </section>

      <section className="panel">
        <div className="topbar">
          <div>
            <h3>Employees</h3>
            <p className="muted section-intro">
              Manage active staff, remove old records, and review monthly salary rules quickly.
            </p>
          </div>
        </div>
        {employees.length ? (
          <>
            <table className="data-table desktop-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Branch</th>
                  <th>Salary</th>
                  <th>Allowed leaves</th>
                  <th>Advance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>
                      <div className="table-subtext">{employee.designation}</div>
                    </td>
                    <td>{employee.employeeCode}</td>
                    <td>{employee.branchName}</td>
                    <td>{formatMoney(employee.monthlySalary)}</td>
                    <td>{employee.monthlyLeaveAllowance}</td>
                    <td>{formatMoney(employee.advancePaid)}</td>
                    <td>{employee.status}</td>
                    <td>
                      <div className="table-action-row">
                        <button className="ghost-button compact-button" onClick={() => startEditingEmployee(employee)}>
                          Edit
                        </button>
                        <button
                          className="ghost-button compact-button"
                          onClick={() =>
                            void changeEmployeeStatus(
                              employee.id,
                              employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                            )
                          }
                        >
                          {employee.status === "ACTIVE" ? "Make inactive" : "Make active"}
                        </button>
                        <button
                          className="ghost-button compact-button danger-button"
                          onClick={() => void removeEmployee(employee.id, employee.name)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="attendance-card-list employee-card-list">
              {employees.map((employee) => (
                <article className="attendance-card" key={employee.id}>
                  <div className="attendance-card-header">
                    <strong>{employee.name}</strong>
                    <span className="pill">{employee.status}</span>
                  </div>
                  <div className="attendance-card-grid">
                    <span>Code</span>
                    <strong>{employee.employeeCode}</strong>
                    <span>Branch</span>
                    <strong>{employee.branchName}</strong>
                    <span>Salary</span>
                    <strong>{formatMoney(employee.monthlySalary)}</strong>
                    <span>Leaves / month</span>
                    <strong>{employee.monthlyLeaveAllowance}</strong>
                    <span>Advance paid</span>
                    <strong>{formatMoney(employee.advancePaid)}</strong>
                  </div>
                  <div className="table-action-row card-action-row">
                    <button className="ghost-button compact-button" onClick={() => startEditingEmployee(employee)}>
                      Edit
                    </button>
                    <button
                      className="ghost-button compact-button"
                      onClick={() =>
                        void changeEmployeeStatus(
                          employee.id,
                          employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                        )
                      }
                    >
                      {employee.status === "ACTIVE" ? "Make inactive" : "Make active"}
                    </button>
                    <button
                      className="ghost-button compact-button danger-button"
                      onClick={() => void removeEmployee(employee.id, employee.name)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No employees added yet"
            message="Employee records will show up here after you add your first team members."
          />
        )}
      </section>

      <section className="panel">
        <h3>Payroll details</h3>
        <p className="muted section-intro">
          Owners can see monthly salary, worked days, excess leave deduction, and advance settlement in one report.
        </p>
        {payroll?.employees.length ? (
          <AttendancePayrollTable payroll={payroll} />
        ) : (
          <EmptyState
            title="No salary records yet"
            message="Add salary details to employees and this section will show daily rate, gross, advance, and net payable."
          />
        )}
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Branch coverage</h3>
          <p className="muted section-intro">A simple branch-by-branch view of today&apos;s presence.</p>
          <div className="branch-list">
            {dashboard.branchSnapshots.length ? (
              dashboard.branchSnapshots.map((branch) => (
                <div className="branch-item" key={branch.branchId}>
                  <div>
                    <strong>{branch.branchName}</strong>
                    <span>
                      {branch.present} present / {branch.headcount} assigned
                    </span>
                  </div>
                  <span className="pill">
                    {Math.round((branch.present / Math.max(branch.headcount, 1)) * 100)}%
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No branch activity yet"
                message="Branch coverage will appear here after your first staff records and attendance entries are added."
              />
            )}
          </div>
        </article>

        <article className="panel">
          <h3>Configured branches</h3>
          <p className="muted section-intro">Your attendance zones and branch details.</p>
          <div className="branch-list">
            {branches.length ? (
              branches.map((branch) => (
                <div className="branch-item" key={branch.id}>
                  <div>
                    <strong>{branch.name}</strong>
                    <span>{branch.address}</span>
                  </div>
                  <span className="pill">{branch.radiusMeters}m</span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No branches yet"
                message="Add your first branch to start assigning employees and accepting attendance nearby."
              />
            )}
          </div>
        </article>
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Needs attention today</h3>
          <p className="muted section-intro">Start here to follow up with missing staff.</p>
          <ActionList
            items={absentEmployees.map((employee) => `${employee.name} · ${employee.designation}`)}
            emptyMessage="Everyone assigned today has already marked attendance."
          />
        </article>
        <article className="panel">
          <h3>Late arrivals</h3>
          <p className="muted section-intro">Quick reminders for check-ins that happened later than usual.</p>
          <ActionList
            items={lateArrivals.map(
              (record) => `${record.employeeName} · checked in at ${formatTimeOnly(record.checkInTime)}`
            )}
            emptyMessage="No late arrivals so far today."
          />
        </article>
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Currently checked in</h3>
          <p className="muted section-intro">People who are still marked as on shift.</p>
          <ActionList
            items={checkedInEmployees.map(
              (record) => `${record.employeeName} · ${record.branchName} · ${formatTimeOnly(record.checkInTime)}`
            )}
            emptyMessage="No one is currently marked as checked in."
          />
        </article>
        <article className="panel">
          <h3>Completed today</h3>
          <p className="muted section-intro">Finished shifts with their worked hours.</p>
          <ActionList
            items={checkedOutEmployees.map(
              (record) => `${record.employeeName} · ${formatWorkedHours(record.checkInTime, record.checkOutTime)}`
            )}
            emptyMessage="Completed shifts will appear here after check-out."
          />
        </article>
      </section>

      <section className="panel">
        <h3>Attendance evidence report</h3>
        <p className="muted section-intro">Review check-in and check-out proof with timestamps.</p>
        <AttendanceTable
          records={attendance}
          onPreviewImage={setPreviewImage}
          emptyMessage="Attendance evidence will appear here once your staff start checking in and out."
        />
      </section>

      <section className="panel">
        <div className="topbar">
          <div>
            <h3>On-duty location tracking</h3>
            <p className="muted section-intro">
              View the places employees visited after check-in and before checkout.
            </p>
          </div>
          {tracking?.enabled ? (
            <label className="date-filter">
              Tracking date
              <input
                type="date"
                value={trackingDate}
                onChange={(event) => setTrackingDate(event.target.value)}
              />
            </label>
          ) : null}
        </div>
        {tracking?.enabled ? (
          tracking.employees.length ? (
            <div className="tracking-card-list">
              {tracking.employees.map((employeeRoute) => (
                <article className="tracking-card" key={employeeRoute.employeeId}>
                  <div className="tracking-card-header">
                    <div>
                      <strong>{employeeRoute.employeeName}</strong>
                      <span className="muted">
                        {employeeRoute.branchName} · {employeeRoute.attendanceStatus}
                      </span>
                    </div>
                    <span className="pill">{employeeRoute.totalPings} updates</span>
                  </div>
                  <div className="tracking-card-summary">
                    <span>Check-in: {formatDateTime(employeeRoute.checkInTime)}</span>
                    <span>
                      {employeeRoute.checkOutTime
                        ? `Check-out: ${formatDateTime(employeeRoute.checkOutTime)}`
                        : "Still on duty"}
                    </span>
                  </div>
                  <div className="tracking-point-list">
                    {employeeRoute.points.map((point, index) => (
                      <TrackingLink
                        key={`${employeeRoute.employeeId}-${point.capturedAt}`}
                        latitude={point.latitude}
                        longitude={point.longitude}
                      >
                        <span className="tracking-point-order">{index + 1}</span>
                        <div>
                          <strong>{formatDateTime(point.capturedAt)}</strong>
                          <span>
                            {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                          </span>
                          <span>
                            {point.accuracyMeters !== null
                              ? `Accuracy ${point.accuracyMeters.toFixed(0)}m`
                              : "Accuracy unavailable"}
                          </span>
                        </div>
                      </TrackingLink>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tracked routes for this date"
              message="Location updates will appear here after employees check in and keep the portal open during their shift."
            />
          )
        ) : (
          <EmptyState
            title="Tracking add-on is off"
            message="This is a separate optional feature. Turn on TRACKING_FEATURE_ENABLED in the backend when you want to offer on-duty live movement tracking."
          />
        )}
      </section>
      {previewImage ? (
        <div className="image-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="ghost-button image-modal-close" onClick={() => setPreviewImage(null)}>
              Close
            </button>
            <strong>{previewImage.label}</strong>
            <span className="muted">{previewImage.employeeName}</span>
            <span className="muted">{formatDateTime(previewImage.time)}</span>
            <img alt="Attendance evidence preview" src={previewImage.image} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
