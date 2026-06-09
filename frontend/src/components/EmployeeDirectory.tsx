import { useState } from "react";
import { apiFetch, apiFetchVoid } from "../lib/api";
import { formatMoney } from "../lib/format";
import { EmptyState } from "./shared";
import type { Branch, Employee, Session } from "../types";

export function EmployeeDirectory({
  session,
  employees,
  branches,
  onReload,
  onEditEmployee
}: {
  session: Session;
  employees: Employee[];
  branches: Branch[];
  onReload: () => Promise<void>;
  onEditEmployee: (employee: Employee) => void;
}) {
  const [statusMessage, setStatusMessage] = useState("");
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [transferBranchId, setTransferBranchId] = useState("");
  const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [working, setWorking] = useState(false);

  const transferTarget = employees.find((employee) => employee.id === transferTargetId) ?? null;
  const passwordTarget = employees.find((employee) => employee.id === passwordTargetId) ?? null;

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
            Reset passwords, disable login, transfer branches, or update employment status from one place.
          </p>
        </div>
      </div>

      {statusMessage ? (
        <p className={statusMessage.includes("successfully") || statusMessage.includes("enabled") || statusMessage.includes("disabled") ? "status-text" : "error-text"}>
          {statusMessage}
        </p>
      ) : null}

      <table className="data-table desktop-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Branch</th>
            <th>Salary</th>
            <th>Leaves</th>
            <th>Employment</th>
            <th>Login</th>
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
              <td>{employee.status}</td>
              <td>{employee.loginEnabled ? "Enabled" : "Disabled"}</td>
              <td>
                <div className="table-action-row">
                  <button className="ghost-button compact-button" onClick={() => onEditEmployee(employee)} type="button">
                    Edit
                  </button>
                  <button
                    className="ghost-button compact-button"
                    onClick={() => void updateEmployeeStatus(employee.id, employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                    type="button"
                    disabled={working}
                  >
                    {employee.status === "ACTIVE" ? "Make inactive" : "Make active"}
                  </button>
                  <button
                    className="ghost-button compact-button"
                    onClick={() => void updateLoginStatus(employee.id, !employee.loginEnabled)}
                    type="button"
                    disabled={working}
                  >
                    {employee.loginEnabled ? "Disable login" : "Enable login"}
                  </button>
                  <button
                    className="ghost-button compact-button"
                    onClick={() => {
                      setTransferTargetId(employee.id);
                      setTransferBranchId(employee.branchId);
                      setPasswordTargetId(null);
                    }}
                    type="button"
                  >
                    Transfer
                  </button>
                  <button
                    className="ghost-button compact-button"
                    onClick={() => {
                      setPasswordTargetId(employee.id);
                      setNewPassword("");
                      setTransferTargetId(null);
                    }}
                    type="button"
                  >
                    Reset password
                  </button>
                  <button
                    className="ghost-button compact-button danger-button"
                    onClick={() => void removeEmployee(employee.id, employee.name)}
                    type="button"
                    disabled={working}
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
              <span>Login</span>
              <strong>{employee.loginEnabled ? "Enabled" : "Disabled"}</strong>
            </div>
            <div className="table-action-row card-action-row">
              <button className="ghost-button compact-button" onClick={() => onEditEmployee(employee)} type="button">
                Edit
              </button>
              <button
                className="ghost-button compact-button"
                onClick={() => void updateLoginStatus(employee.id, !employee.loginEnabled)}
                type="button"
                disabled={working}
              >
                {employee.loginEnabled ? "Disable login" : "Enable login"}
              </button>
              <button
                className="ghost-button compact-button"
                onClick={() => {
                  setTransferTargetId(employee.id);
                  setTransferBranchId(employee.branchId);
                  setPasswordTargetId(null);
                }}
                type="button"
              >
                Transfer
              </button>
              <button
                className="ghost-button compact-button"
                onClick={() => {
                  setPasswordTargetId(employee.id);
                  setNewPassword("");
                  setTransferTargetId(null);
                }}
                type="button"
              >
                Reset password
              </button>
              <button
                className="ghost-button compact-button danger-button"
                onClick={() => void removeEmployee(employee.id, employee.name)}
                type="button"
                disabled={working}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
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
