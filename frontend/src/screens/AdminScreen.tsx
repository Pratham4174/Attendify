import { useEffect, useState } from "react";
import { AttendancePayrollTable, AttendanceTable, TrackingLink } from "../components/AttendanceTable";
import { AttendanceCorrectionTable } from "../components/AttendanceCorrections";
import { BulkEmployeeImport } from "../components/BulkEmployeeImport";
import { EmployeeDirectory } from "../components/EmployeeDirectory";
import { HolidayList, LeaveRequestTable } from "../components/LeaveManagement";
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
import { downloadPayrollCsv, downloadSalarySlip } from "../lib/payroll";
import type {
  AdminTracking,
  AttendancePreview,
  AttendanceRow,
  Branch,
  Dashboard,
  Employee,
  AttendanceCorrection,
  Holiday,
  LeaveRequest,
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

type AdminTab =
  | "overview"
  | "add-employee"
  | "employees"
  | "corrections"
  | "leave"
  | "payroll"
  | "attendance"
  | "tracking"
  | "branches";

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
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [previewImage, setPreviewImage] = useState<AttendancePreview | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeFormStatus, setEmployeeFormStatus] = useState("");
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(() => formatMonthKey(new Date()));
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [advancePaymentStatus, setAdvancePaymentStatus] = useState("");
  const [advancePaymentSaving, setAdvancePaymentSaving] = useState(false);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    employeeId: "",
    paymentDate: formatLocalDateKey(new Date()),
    amount: "",
    note: ""
  });
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [leaveStatusMessage, setLeaveStatusMessage] = useState("");
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    holidayDate: ""
  });
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

  const adminTabs: Array<{ id: AdminTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "add-employee", label: "Add employee" },
    { id: "employees", label: "View employees" },
    { id: "corrections", label: "Corrections" },
    { id: "leave", label: "Leave management" },
    { id: "payroll", label: "Payroll" },
    { id: "attendance", label: "Attendance" },
    { id: "tracking", label: "Tracking" },
    { id: "branches", label: "Branches" }
  ];

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
      const [dashboardData, employeeData, branchData, attendanceData, trackingData, payrollData, correctionData, leaveData, holidayData] = await Promise.all([
        apiFetch<Dashboard>(session, "/admin/dashboard"),
        apiFetch<Employee[]>(session, "/admin/employees"),
        apiFetch<Branch[]>(session, "/admin/branches"),
        apiFetch<AttendanceRow[]>(session, "/admin/attendance"),
        apiFetch<AdminTracking>(session, `/admin/tracking?date=${trackingDate}`),
        apiFetch<PayrollSummary>(session, `/admin/payroll?month=${payrollMonth}`),
        apiFetch<AttendanceCorrection[]>(session, "/admin/corrections"),
        apiFetch<LeaveRequest[]>(session, "/admin/leaves"),
        apiFetch<Holiday[]>(session, "/admin/holidays")
      ]);

      setDashboard(dashboardData);
      setEmployees(employeeData);
      setBranches(branchData);
      setAttendance(attendanceData);
      setTracking(trackingData);
      setPayroll(payrollData);
      setCorrections(correctionData);
      setLeaveRequests(leaveData);
      setHolidays(holidayData);
      setEmployeeForm((current) =>
        current.branchId || !branchData.length
          ? current
          : { ...current, branchId: branchData[0].id }
      );
      setAdvancePaymentForm((current) =>
        current.employeeId || !employeeData.length
          ? current
          : { ...current, employeeId: employeeData[0].id }
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

  function updateAdvancePaymentForm(
    key: "employeeId" | "paymentDate" | "amount" | "note",
    value: string
  ) {
    setAdvancePaymentForm((current) => ({ ...current, [key]: value }));
  }

  function updateHolidayForm(key: "name" | "holidayDate", value: string) {
    setHolidayForm((current) => ({ ...current, [key]: value }));
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
    setActiveTab("add-employee");
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

  async function decideLeave(leaveId: string, status: "APPROVED" | "REJECTED") {
    setLeaveStatusMessage("");
    try {
      await apiFetch<LeaveRequest>(session, `/admin/leaves/${leaveId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewNote: status === "APPROVED" ? "Approved by owner." : "Rejected by owner."
        })
      });
      setLeaveStatusMessage(`Leave request ${status.toLowerCase()} successfully.`);
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to update leave request.");
    }
  }

  async function decideCorrection(correction: AttendanceCorrection, status: "APPROVED" | "REJECTED") {
    const ownerReason = window.prompt(
      status === "APPROVED"
        ? "Enter approval reason"
        : "Enter rejection reason"
    );
    if (!ownerReason?.trim()) {
      return;
    }

    const approvedTime =
      status === "APPROVED"
        ? window.prompt("Optional: change approved time (HH:MM). Leave blank to use requested time.", "")
        : "";

    setLeaveStatusMessage("");
    try {
      await apiFetch<AttendanceCorrection>(session, `/admin/corrections/${correction.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          approvedTime: approvedTime?.trim() || undefined,
          reviewNote: ownerReason.trim()
        })
      });
      setLeaveStatusMessage(`Correction ${status.toLowerCase()} successfully.`);
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to update correction request.");
    }
  }

  async function createHoliday(event: React.FormEvent) {
    event.preventDefault();
    setHolidaySaving(true);
    setLeaveStatusMessage("");
    try {
      await apiFetch<Holiday>(session, "/admin/holidays", {
        method: "POST",
        body: JSON.stringify(holidayForm)
      });
      setHolidayForm({ name: "", holidayDate: "" });
      setLeaveStatusMessage("Holiday added successfully.");
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to add holiday.");
    } finally {
      setHolidaySaving(false);
    }
  }

  async function removeHoliday(holiday: Holiday) {
    if (!window.confirm(`Remove ${holiday.name} from the holiday calendar?`)) {
      return;
    }
    setLeaveStatusMessage("");
    try {
      await apiFetchVoid(session, `/admin/holidays/${holiday.id}`, {
        method: "DELETE"
      });
      setLeaveStatusMessage("Holiday removed successfully.");
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to remove holiday.");
    }
  }

  async function submitAdvancePayment(event: React.FormEvent) {
    event.preventDefault();
    setAdvancePaymentSaving(true);
    setAdvancePaymentStatus("");
    try {
      await apiFetch(session, "/admin/advance-payments", {
        method: "POST",
        body: JSON.stringify({
          ...advancePaymentForm,
          amount: Number(advancePaymentForm.amount || "0")
        })
      });
      setAdvancePaymentStatus("Advance payment recorded successfully.");
      setAdvancePaymentForm((current) => ({
        ...current,
        amount: "",
        note: ""
      }));
      await loadAdminData();
    } catch (error) {
      setAdvancePaymentStatus(error instanceof Error ? error.message : "Unable to record advance payment.");
    } finally {
      setAdvancePaymentSaving(false);
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
        <div className="admin-header-actions">
          <button
            className="ghost-button admin-drawer-button"
            onClick={() => setDrawerOpen((current) => !current)}
            type="button"
          >
            Menu
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      <div className="admin-shell">
        <aside className={`admin-sidebar${drawerOpen ? " open" : ""}`}>
          <div className="admin-sidebar-header">
            <span className="eyebrow">Owner workspace</span>
            <strong>Navigate features</strong>
          </div>
          <nav className="admin-nav">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                className={`admin-nav-button${activeTab === tab.id ? " active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setDrawerOpen(false);
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="admin-content">
          {activeTab === "overview" ? (
            <>
              <section className="metric-grid">
                <MetricCard label="Total employees" value={dashboard.cards.totalEmployees} />
                <MetricCard label="Present today" value={dashboard.cards.presentToday} />
                <MetricCard label="Checked out" value={dashboard.cards.checkedOutToday} />
                <MetricCard label="Absent today" value={dashboard.cards.absentToday} />
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
            </>
          ) : null}

          {activeTab === "add-employee" ? (
            <>
              <section className="panel">
                <div className="topbar">
                  <div>
                    <h3>{editingEmployeeId ? "Edit employee" : "Add employee"}</h3>
                    <p className="muted section-intro">
                      Add new staff, keep salary settings ready, and use the Excel-friendly import below for larger teams.
                    </p>
                  </div>
                  {editingEmployeeId ? (
                    <button className="ghost-button" onClick={() => resetEmployeeForm()} type="button">
                      Cancel edit
                    </button>
                  ) : null}
                </div>
                <form className="admin-form-grid" onSubmit={handleEmployeeSubmit}>
                  <div className="grid two-column compact-grid">
                    <label>
                      Employee code
                      <input required value={employeeForm.employeeCode} onChange={(event) => updateEmployeeForm("employeeCode", event.target.value)} placeholder="EMP-001" />
                    </label>
                    <label>
                      Full name
                      <input required value={employeeForm.name} onChange={(event) => updateEmployeeForm("name", event.target.value)} placeholder="Rahul Sharma" />
                    </label>
                  </div>
                  <div className="grid two-column compact-grid">
                    <label>
                      Designation
                      <input required value={employeeForm.designation} onChange={(event) => updateEmployeeForm("designation", event.target.value)} placeholder="Front desk / Cashier / Manager" />
                    </label>
                    <label>
                      Branch
                      <select required value={employeeForm.branchId} onChange={(event) => updateEmployeeForm("branchId", event.target.value)}>
                        <option value="" disabled>Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid two-column compact-grid">
                    <label>
                      Email
                      <input required type="email" value={employeeForm.email} onChange={(event) => updateEmployeeForm("email", event.target.value)} placeholder="employee@property.com" />
                    </label>
                    <label>
                      Phone
                      <input required value={employeeForm.phone} onChange={(event) => updateEmployeeForm("phone", event.target.value)} placeholder="+91-98xxxxxxx" />
                    </label>
                  </div>
                  <div className="grid three-column compact-grid">
                    <label>
                      Monthly salary
                      <input required min="0" step="0.01" type="number" value={employeeForm.monthlySalary} onChange={(event) => updateEmployeeForm("monthlySalary", event.target.value)} placeholder="20000" />
                    </label>
                    <label>
                      Allowed leaves / month
                      <input required min="0" max="31" type="number" value={employeeForm.monthlyLeaveAllowance} onChange={(event) => updateEmployeeForm("monthlyLeaveAllowance", event.target.value)} placeholder="2" />
                    </label>
                    <label>
                      Advance already paid
                      <input required min="0" step="0.01" type="number" value={employeeForm.advancePaid} onChange={(event) => updateEmployeeForm("advancePaid", event.target.value)} placeholder="0" />
                    </label>
                  </div>
                  <div className="action-row">
                    <button className="primary-button" disabled={employeeSaving} type="submit">
                      {employeeSaving ? "Saving..." : editingEmployeeId ? "Update employee" : "Add employee"}
                    </button>
                    <span className="muted">New employees can sign in with their email and starter password `password`.</span>
                  </div>
                  {employeeFormStatus ? (
                    <p className={employeeFormStatus.includes("successfully") ? "status-text" : "error-text"}>
                      {employeeFormStatus}
                    </p>
                  ) : null}
                </form>
              </section>
              <BulkEmployeeImport session={session} branches={branches} onReload={loadAdminData} />
            </>
          ) : null}

          {activeTab === "employees" ? (
            <EmployeeDirectory
              session={session}
              employees={employees}
              branches={branches}
              onReload={loadAdminData}
              onEditEmployee={startEditingEmployee}
            />
          ) : null}

          {activeTab === "payroll" ? (
            <>
              <section className="panel">
                <div className="topbar">
                  <div>
                    <h3>Payroll snapshot</h3>
                    <p className="muted section-intro">
                      Check how much is payable this month after worked days, allowed leave, and advances.
                    </p>
                  </div>
                  <label className="date-filter">
                    Payroll month
                    <input type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
                  </label>
                </div>
                {payroll?.employees.length ? (
                  <div className="payroll-summary-grid">
                    <MetricCard label="People in payroll" value={payroll.employees.length} />
                    <MetricCard
                      label="Total payable"
                      value={formatMoney(payroll.employees.reduce((sum, employee) => sum + Number(employee.netPayable.value), 0))}
                    />
                    <MetricCard
                      label="Month advances"
                      value={formatMoney(payroll.advancePayments.reduce((sum, payment) => sum + Number(payment.amount.value), 0))}
                    />
                  </div>
                ) : (
                  <EmptyState title="No payroll data yet" message="Payroll will appear here after employees are added with salary details." />
                )}
              </section>
              <section className="grid two-column">
                <article className="panel">
                  <div className="topbar">
                    <div>
                      <h3>Monthly export</h3>
                      <p className="muted section-intro">
                        Download a month-wise payroll report or a salary slip for each employee.
                      </p>
                    </div>
                    {payroll?.employees.length ? (
                      <button className="primary-button" onClick={() => downloadPayrollCsv(payroll)} type="button">
                        Export CSV
                      </button>
                    ) : null}
                  </div>
                  <div className="info-card">
                    <strong>Included in export</strong>
                    <span className="muted">Worked days, half days, paid and unpaid leave breakup, advance deductions, and net payable.</span>
                  </div>
                </article>
                <article className="panel">
                  <h3>Add advance payment</h3>
                  <p className="muted section-intro">
                    Record any salary amount paid early during the month so it is settled from the final payout.
                  </p>
                  <form className="leave-form-grid" onSubmit={submitAdvancePayment}>
                    <div className="grid two-column compact-grid">
                      <label>
                        Employee
                        <select value={advancePaymentForm.employeeId} onChange={(event) => updateAdvancePaymentForm("employeeId", event.target.value)} required>
                          <option value="" disabled>Select employee</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>{employee.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Payment date
                        <input type="date" value={advancePaymentForm.paymentDate} onChange={(event) => updateAdvancePaymentForm("paymentDate", event.target.value)} required />
                      </label>
                    </div>
                    <div className="grid two-column compact-grid">
                      <label>
                        Amount
                        <input type="number" min="0" step="0.01" value={advancePaymentForm.amount} onChange={(event) => updateAdvancePaymentForm("amount", event.target.value)} placeholder="5000" required />
                      </label>
                      <label>
                        Note
                        <input value={advancePaymentForm.note} onChange={(event) => updateAdvancePaymentForm("note", event.target.value)} placeholder="Emergency support / travel / festival advance" />
                      </label>
                    </div>
                    <div className="action-row">
                      <button className="primary-button" disabled={advancePaymentSaving} type="submit">
                        {advancePaymentSaving ? "Saving..." : "Record payment"}
                      </button>
                    </div>
                    {advancePaymentStatus ? (
                      <p className={advancePaymentStatus.includes("successfully") ? "status-text" : "error-text"}>
                        {advancePaymentStatus}
                      </p>
                    ) : null}
                  </form>
                </article>
              </section>
              <section className="panel">
                <h3>Payroll details</h3>
                <p className="muted section-intro">
                  Owners can see monthly salary, half-day deduction impact, paid and unpaid leave breakup, and advance settlement in one report.
                </p>
                {payroll?.employees.length ? (
                  <AttendancePayrollTable payroll={payroll} onDownloadSlip={(employeeId) => downloadSalarySlip(payroll, employeeId)} />
                ) : (
                  <EmptyState title="No salary records yet" message="Add salary details to employees and this section will show daily rate, gross, advance, and net payable." />
                )}
              </section>
              <section className="panel">
                <h3>Advance payment history</h3>
                <p className="muted section-intro">
                  Every early payment made during the month is listed here for payroll settlement.
                </p>
                {payroll?.advancePayments.length ? (
                  <>
                    <table className="data-table desktop-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payroll.advancePayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{payment.employeeName}</td>
                            <td>{payment.paymentDate}</td>
                            <td>{formatMoney(payment.amount.value)}</td>
                            <td>{payment.note ?? "No note"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="attendance-card-list payroll-card-list">
                      {payroll.advancePayments.map((payment) => (
                        <article className="attendance-card" key={payment.id}>
                          <div className="attendance-card-header">
                            <strong>{payment.employeeName}</strong>
                            <span className="pill">{payment.paymentDate}</span>
                          </div>
                          <div className="attendance-card-grid">
                            <span>Amount</span>
                            <strong>{formatMoney(payment.amount.value)}</strong>
                            <span>Note</span>
                            <strong>{payment.note ?? "No note"}</strong>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState title="No advance payments this month" message="Recorded salary advances will appear here and be settled in the payroll." />
                )}
              </section>
            </>
          ) : null}

          {activeTab === "leave" ? (
            <>
              <section className="grid two-column">
                <article className="panel">
                  <h3>Leave requests</h3>
                  <p className="muted section-intro">Approve or reject employee leave requests from one place.</p>
                  <LeaveRequestTable
                    requests={leaveRequests}
                    showEmployee
                    emptyTitle="No leave requests yet"
                    emptyMessage="Leave requests from employees will appear here."
                    renderActions={(request) =>
                      request.status === "PENDING" ? (
                        <>
                          <button className="ghost-button compact-button" onClick={() => void decideLeave(request.id, "APPROVED")} type="button">
                            Approve
                          </button>
                          <button className="ghost-button compact-button danger-button" onClick={() => void decideLeave(request.id, "REJECTED")} type="button">
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="muted">Decision saved</span>
                      )
                    }
                  />
                </article>

                <article className="panel">
                  <h3>Holiday calendar</h3>
                  <p className="muted section-intro">Add company holidays so payroll and leave screens stay aligned.</p>
                  <form className="leave-form-grid" onSubmit={createHoliday}>
                    <label>
                      Holiday name
                      <input required value={holidayForm.name} onChange={(event) => updateHolidayForm("name", event.target.value)} placeholder="Diwali / Founder's Day / Annual closure" />
                    </label>
                    <label>
                      Holiday date
                      <input required type="date" value={holidayForm.holidayDate} onChange={(event) => updateHolidayForm("holidayDate", event.target.value)} />
                    </label>
                    <div className="action-row">
                      <button className="primary-button" disabled={holidaySaving} type="submit">
                        {holidaySaving ? "Saving..." : "Add holiday"}
                      </button>
                    </div>
                  </form>
                  <div className="spacer-sm" />
                  <HolidayList holidays={holidays} onRemove={removeHoliday} />
                </article>
              </section>
              {leaveStatusMessage ? (
                <p className={leaveStatusMessage.includes("successfully") ? "status-text" : "error-text"}>
                  {leaveStatusMessage}
                </p>
              ) : null}
            </>
          ) : null}

          {activeTab === "corrections" ? (
            <>
              <section className="panel">
                <h3>Attendance corrections</h3>
                <p className="muted section-intro">
                  Review missed check-in and check-out requests, approve with a reason, and keep an audit trail for every change.
                </p>
                <AttendanceCorrectionTable
                  corrections={corrections}
                  showEmployee
                  emptyTitle="No correction requests yet"
                  emptyMessage="Employee correction requests will appear here once someone asks for a fix."
                  renderActions={(correction) =>
                    correction.status === "PENDING" ? (
                      <>
                        <button className="ghost-button compact-button" onClick={() => void decideCorrection(correction, "APPROVED")} type="button">
                          Approve
                        </button>
                        <button className="ghost-button compact-button danger-button" onClick={() => void decideCorrection(correction, "REJECTED")} type="button">
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="muted">Decision saved</span>
                    )
                  }
                />
              </section>
              {leaveStatusMessage ? (
                <p className={leaveStatusMessage.includes("successfully") ? "status-text" : "error-text"}>
                  {leaveStatusMessage}
                </p>
              ) : null}
            </>
          ) : null}

          {activeTab === "attendance" ? (
            <section className="panel">
              <h3>Attendance evidence report</h3>
              <p className="muted section-intro">Review check-in and check-out proof with timestamps.</p>
              <AttendanceTable
                records={attendance}
                onPreviewImage={setPreviewImage}
                emptyMessage="Attendance evidence will appear here once your staff start checking in and out."
              />
            </section>
          ) : null}

          {activeTab === "tracking" ? (
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
                    <input type="date" value={trackingDate} onChange={(event) => setTrackingDate(event.target.value)} />
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
                            {employeeRoute.checkOutTime ? `Check-out: ${formatDateTime(employeeRoute.checkOutTime)}` : "Still on duty"}
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
                                <span>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</span>
                                <span>
                                  {point.accuracyMeters !== null ? `Accuracy ${point.accuracyMeters.toFixed(0)}m` : "Accuracy unavailable"}
                                </span>
                              </div>
                            </TrackingLink>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No tracked routes for this date" message="Location updates will appear here after employees check in and keep the portal open during their shift." />
                )
              ) : (
                <EmptyState title="Tracking add-on is off" message="This is a separate optional feature. Turn on TRACKING_FEATURE_ENABLED in the backend when you want to offer on-duty live movement tracking." />
              )}
            </section>
          ) : null}

          {activeTab === "branches" ? (
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
                          <span>{branch.present} present / {branch.headcount} assigned</span>
                        </div>
                        <span className="pill">
                          {Math.round((branch.present / Math.max(branch.headcount, 1)) * 100)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No branch activity yet" message="Branch coverage will appear here after your first staff records and attendance entries are added." />
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
                    <EmptyState title="No branches yet" message="Add your first branch to start assigning employees and accepting attendance nearby." />
                  )}
                </div>
              </article>
            </section>
          ) : null}
        </section>
      </div>

      {previewImage ? (
        <div className="image-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="ghost-button image-modal-close" onClick={() => setPreviewImage(null)} type="button">
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
