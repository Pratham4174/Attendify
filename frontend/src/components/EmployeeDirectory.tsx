import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiFetchVoid } from "../lib/api";
import { formatDateTime, formatLocalDateKey, formatMoney, formatWorkedHours } from "../lib/format";
import { EmptyState } from "./shared";
import type { AttendanceRow, Branch, Employee, PayrollSummary, Session } from "../types";

export function EmployeeDirectory({
  session,
  employees,
  branches,
  attendance,
  payroll,
  onReload,
  onEditEmployee
}: {
  session: Session;
  employees: Employee[];
  branches: Branch[];
  attendance: AttendanceRow[];
  payroll: PayrollSummary | null;
  onReload: () => Promise<void>;
  onEditEmployee: (employee: Employee) => void;
}) {
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(employees[0]?.id ?? null);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [transferBranchId, setTransferBranchId] = useState("");
  const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!employees.length) {
      setSelectedEmployeeId(null);
      return;
    }
    if (!selectedEmployeeId || !employees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  const payrollByEmployeeId = useMemo(() => {
    return new Map(
      (payroll?.employees ?? []).map((employeePayroll) => [
        employeePayroll.employeeId,
        employeePayroll
      ])
    );
  }, [payroll]);

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const selectedPayroll = selectedEmployee ? payrollByEmployeeId.get(selectedEmployee.id) ?? null : null;
  const transferTarget = employees.find((employee) => employee.id === transferTargetId) ?? null;
  const passwordTarget = employees.find((employee) => employee.id === passwordTargetId) ?? null;
  const selectedAttendance = selectedEmployee
    ? attendance.filter((record) => record.employeeId === selectedEmployee.id)
    : [];
  const latestAttendance = selectedAttendance[0] ?? null;
  const recentAttendance = selectedAttendance.slice(0, 5);
  const todayKey = formatLocalDateKey(new Date());
  const todayAttendance = selectedAttendance.find((record) => record.date === todayKey) ?? null;
  const monthAdvancePayments = selectedEmployee
    ? (payroll?.advancePayments ?? []).filter((payment) => payment.employeeId === selectedEmployee.id)
    : [];

  function formatAttendanceProgress(record: AttendanceRow) {
    if (!record.checkOutTime && record.date < todayKey) {
      return "Absent";
    }

    return formatWorkedHours(record.checkInTime, record.checkOutTime);
  }

  async function updateEmployeeStatus(employeeId: string, status: "ACTIVE" | "INACTIVE") {
    setWorking(true);
    setStatusMessage("");
    try {
      await apiFetch<Employee>(session, `/admin/employees/${employeeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setStatusMessage(`Employee marked ${status.toLowerCase()} successfully.`);
      await onReload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update employee status.");
    } finally {
      setWorking(false);
    }
  }

  async function updateLoginStatus(employeeId: string, enabled: boolean) {
    setWorking(true);
    setStatusMessage("");
    try {
      await apiFetch<Employee>(session, `/admin/employees/${employeeId}/login`, {
        method: "PATCH",
        body: JSON.stringify({ enabled })
      });
      setStatusMessage(enabled ? "Employee login enabled." : "Employee login disabled.");
      await onReload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update employee login.");
    } finally {
      setWorking(false);
    }
  }

  async function removeEmployee(employeeId: string, employeeName: string) {
    if (!window.confirm(`Remove ${employeeName} from this property? Existing attendance history will stay in reports.`)) {
      return;
    }

    setWorking(true);
    setStatusMessage("");
    try {
      await apiFetchVoid(session, `/admin/employees/${employeeId}`, { method: "DELETE" });
      setStatusMessage("Employee removed successfully.");
      if (transferTargetId === employeeId) {
        setTransferTargetId(null);
      }
      if (passwordTargetId === employeeId) {
        setPasswordTargetId(null);
      }
      await onReload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to remove employee.");
    } finally {
      setWorking(false);
    }
  }

  async function submitTransfer(event: React.FormEvent) {
    event.preventDefault();
    if (!transferTargetId) {
      return;
    }

    setWorking(true);
    setStatusMessage("");
    try {
      await apiFetch<Employee>(session, `/admin/employees/${transferTargetId}/branch`, {
        method: "PATCH",
        body: JSON.stringify({ branchId: transferBranchId })
      });
      setStatusMessage("Employee transferred successfully.");
      setTransferTargetId(null);
      setTransferBranchId("");
      await onReload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to transfer employee.");
    } finally {
      setWorking(false);
    }
  }

  async function submitPasswordReset(event: React.FormEvent) {
    event.preventDefault();
    if (!passwordTargetId) {
      return;
    }

    setWorking(true);
    setStatusMessage("");
    try {
      await apiFetchVoid(session, `/admin/employees/${passwordTargetId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword })
      });
      setStatusMessage("Employee password reset successfully.");
      setPasswordTargetId(null);
      setNewPassword("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setWorking(false);
    }
  }

  if (!employees.length) {
    return (
      <section className="panel">
        <h3>Employees</h3>
        <EmptyState
          title="No employees added yet"
          message="Employee records will show up here after you add your first team members."
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="topbar">
        <div>
          <h3>Employees</h3>
          <p className="muted section-intro">
            Review each team member quickly, then open their details for actions like transfer, password reset, or login control.
          </p>
        </div>
      </div>

      {statusMessage ? (
        <p className={statusMessage.includes("successfully") || statusMessage.includes("enabled") || statusMessage.includes("disabled") ? "status-text" : "error-text"}>
          {statusMessage}
        </p>
      ) : null}

      <div className="employee-directory-layout">
        <div className="employee-summary-grid">
          {employees.map((employee) => {
            const employeePayroll = payrollByEmployeeId.get(employee.id);
            const isSelected = selectedEmployeeId === employee.id;
            return (
              <button
                key={employee.id}
                className={`employee-summary-card${isSelected ? " active" : ""}`}
                onClick={() => {
                  setSelectedEmployeeId(employee.id);
                  setTransferTargetId(null);
                  setPasswordTargetId(null);
                }}
                type="button"
              >
                <div className="employee-summary-card-head">
                  <div>
                    <strong>{employee.name}</strong>
                    <span>{employee.designation}</span>
                  </div>
                  <span className="pill">{employee.status}</span>
                </div>
                <div className="employee-summary-pay">
                  <span>Net payable</span>
                  <strong>{formatMoney(employeePayroll?.netPayable.value ?? "0")}</strong>
                </div>
              </button>
            );
          })}
        </div>

        {selectedEmployee ? (
          <div className="employee-detail-card">
            <div className="employee-detail-header">
              <div>
                <span className="eyebrow">Employee details</span>
                <h4>{selectedEmployee.name}</h4>
                <p className="muted">{selectedEmployee.designation}</p>
              </div>
              <span className="pill">{selectedEmployee.status}</span>
            </div>

            <div className="employee-detail-summary">
              <div className="employee-detail-stat">
                <span>Net payable</span>
                <strong>{formatMoney(selectedPayroll?.netPayable.value ?? "0")}</strong>
              </div>
              <div className="employee-detail-stat">
                <span>Today</span>
                <strong>{todayAttendance ? todayAttendance.status : "No mark yet"}</strong>
              </div>
              <div className="employee-detail-stat">
                <span>Last activity</span>
                <strong>{latestAttendance ? formatDateTime(latestAttendance.checkOutTime ?? latestAttendance.checkInTime) : "No attendance yet"}</strong>
              </div>
              <div className="employee-detail-stat">
                <span>Advance this month</span>
                <strong>{formatMoney(selectedPayroll?.monthAdvancePaid.value ?? "0")}</strong>
              </div>
            </div>

            <div className="employee-detail-grid employee-detail-grid-compact">
              <span>Employee code</span>
              <strong>{selectedEmployee.employeeCode}</strong>
              <span>Branch</span>
              <strong>{selectedEmployee.branchName}</strong>
              <span>Monthly salary</span>
              <strong>{formatMoney(selectedEmployee.monthlySalary)}</strong>
              <span>Allowed leaves</span>
              <strong>{selectedEmployee.monthlyLeaveAllowance}</strong>
              <span>Login</span>
              <strong>{selectedEmployee.loginEnabled ? "Enabled" : "Disabled"}</strong>
              <span>Email</span>
              <strong>{selectedEmployee.email}</strong>
              <span>Phone</span>
              <strong>{selectedEmployee.phone}</strong>
            </div>

            <div className="employee-detail-sections">
              <section className="employee-mini-panel">
                <div className="employee-mini-panel-head">
                  <strong>Attendance</strong>
                  <span className="muted">Latest 5 records</span>
                </div>
                {recentAttendance.length ? (
                  <div className="employee-mini-list">
                    {recentAttendance.map((record) => (
                      <div className="employee-mini-item" key={record.recordId}>
                        <div>
                          <strong>{record.date}</strong>
                          <span>{record.branchName}</span>
                        </div>
                        <div>
                          <strong>{record.status}</strong>
                          <span>{formatAttendanceProgress(record)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="muted">No attendance records yet.</span>
                )}
              </section>

              <section className="employee-mini-panel">
                <div className="employee-mini-panel-head">
                  <strong>Payments</strong>
                  <span className="muted">This payroll month</span>
                </div>
                {monthAdvancePayments.length ? (
                  <div className="employee-mini-list">
                    {monthAdvancePayments.slice(0, 5).map((payment) => (
                      <div className="employee-mini-item" key={payment.id}>
                        <div>
                          <strong>{payment.paymentDate}</strong>
                          <span>{payment.note ?? "Advance payment"}</span>
                        </div>
                        <div>
                          <strong>{formatMoney(payment.amount.value)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="muted">No payments recorded this month.</span>
                )}
              </section>

              <section className="employee-mini-panel">
                <div className="employee-mini-panel-head">
                  <strong>Payroll snapshot</strong>
                  <span className="muted">Current month</span>
                </div>
                {selectedPayroll ? (
                  <div className="employee-mini-list employee-payroll-list">
                    <div className="employee-mini-item">
                      <div>
                        <strong>Worked days</strong>
                        <span>{selectedPayroll.workedDays} full + {selectedPayroll.halfDays} half</span>
                      </div>
                      <div>
                        <strong>{selectedPayroll.payableDays.value}</strong>
                        <span>payable days</span>
                      </div>
                    </div>
                    <div className="employee-mini-item">
                      <div>
                        <strong>Leave breakup</strong>
                        <span>{selectedPayroll.paidLeaveDays} paid · {selectedPayroll.unpaidLeaveDays} unpaid</span>
                      </div>
                      <div>
                        <strong>{selectedPayroll.allowedLeaves}</strong>
                        <span>allowed</span>
                      </div>
                    </div>
                    <div className="employee-mini-item">
                      <div>
                        <strong>Advance deduction</strong>
                        <span>Opening + month advances</span>
                      </div>
                      <div>
                        <strong>{formatMoney(selectedPayroll.totalAdvanceDeducted.value)}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="muted">Payroll details will appear after the month is calculated.</span>
                )}
              </section>
            </div>

            <div className="employee-detail-actions">
              <button className="ghost-button compact-button" onClick={() => onEditEmployee(selectedEmployee)} type="button">
                Edit
              </button>
              <button
                className="ghost-button compact-button"
                onClick={() => void updateEmployeeStatus(selectedEmployee.id, selectedEmployee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                type="button"
                disabled={working}
              >
                {selectedEmployee.status === "ACTIVE" ? "Make inactive" : "Make active"}
              </button>
              <button
                className="ghost-button compact-button"
                onClick={() => void updateLoginStatus(selectedEmployee.id, !selectedEmployee.loginEnabled)}
                type="button"
                disabled={working}
              >
                {selectedEmployee.loginEnabled ? "Disable login" : "Enable login"}
              </button>
              <button
                className="ghost-button compact-button"
                onClick={() => {
                  setTransferTargetId(selectedEmployee.id);
                  setTransferBranchId(selectedEmployee.branchId);
                  setPasswordTargetId(null);
                }}
                type="button"
              >
                Transfer
              </button>
              <button
                className="ghost-button compact-button"
                onClick={() => {
                  setPasswordTargetId(selectedEmployee.id);
                  setNewPassword("");
                  setTransferTargetId(null);
                }}
                type="button"
              >
                Reset password
              </button>
              <button
                className="ghost-button compact-button danger-button"
                onClick={() => void removeEmployee(selectedEmployee.id, selectedEmployee.name)}
                type="button"
                disabled={working}
              >
                Remove
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {transferTarget ? (
        <form className="employee-inline-panel" onSubmit={submitTransfer}>
          <div>
            <strong>Transfer {transferTarget.name}</strong>
            <p className="muted">Move this employee to another branch without recreating their account.</p>
          </div>
          <div className="grid two-column compact-grid">
            <label>
              New branch
              <select value={transferBranchId} onChange={(event) => setTransferBranchId(event.target.value)} required>
                <option value="" disabled>Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="table-action-row">
            <button className="primary-button" disabled={working} type="submit">
              Save transfer
            </button>
            <button className="ghost-button" onClick={() => setTransferTargetId(null)} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {passwordTarget ? (
        <form className="employee-inline-panel" onSubmit={submitPasswordReset}>
          <div>
            <strong>Reset password for {passwordTarget.name}</strong>
            <p className="muted">Set a new temporary password. The employee can use it on the next sign in.</p>
          </div>
          <div className="grid two-column compact-grid">
            <label>
              New password
              <input
                minLength={6}
                required
                type="text"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
          </div>
          <div className="table-action-row">
            <button className="primary-button" disabled={working} type="submit">
              Update password
            </button>
            <button className="ghost-button" onClick={() => setPasswordTargetId(null)} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
