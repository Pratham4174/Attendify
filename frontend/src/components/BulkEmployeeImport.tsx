import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  downloadEmployeeImportTemplate,
  parseEmployeeImportText,
  type ParsedEmployeeImportRow
} from "../lib/employeeImport";
import type { Branch, EmployeeBulkImportResponse, Session } from "../types";

export function BulkEmployeeImport({
  session,
  branches,
  onReload,
  disabled = false,
  disabledMessage = "",
  remainingSlots = null
}: {
  session: Session;
  branches: Branch[];
  onReload: () => Promise<void>;
  disabled?: boolean;
  disabledMessage?: string;
  remainingSlots?: number | null;
}) {
  const [rawInput, setRawInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<EmployeeBulkImportResponse | null>(null);

  const previewRows = useMemo(
    () => parseEmployeeImportText(rawInput, branches),
    [rawInput, branches]
  );

  const validRows = previewRows.filter((row) => !row.error);
  const invalidRows = previewRows.filter((row) => row.error);
  const exceedsRemainingSlots = remainingSlots !== null && validRows.length > remainingSlots;

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setRawInput(text);
    setResult(null);
    setStatusMessage(`Loaded ${file.name}. Review the preview before importing.`);
    event.target.value = "";
  }

  async function submitImport() {
    if (disabled) {
      setStatusMessage(disabledMessage || "Your plan limit has been reached. Upgrade to add more employees.");
      return;
    }

    if (!validRows.length) {
      setStatusMessage("Add at least one valid employee row before importing.");
      return;
    }

    if (invalidRows.length) {
      setStatusMessage("Fix the highlighted rows first, then import again.");
      return;
    }

    if (exceedsRemainingSlots) {
      setStatusMessage(`Your current plan has only ${remainingSlots} employee slot${remainingSlots === 1 ? "" : "s"} left. Reduce the import or upgrade the plan.`);
      return;
    }

    setImporting(true);
    setStatusMessage("");
    try {
      const response = await apiFetch<EmployeeBulkImportResponse>(session, "/admin/employees/bulk-import", {
        method: "POST",
        body: JSON.stringify({
          employees: validRows.map((row) => ({
            employeeCode: row.employeeCode,
            name: row.name,
            designation: row.designation,
            email: row.email,
            phone: row.phone,
            branchId: row.branchId,
            monthlySalary: Number(row.monthlySalary || "0"),
            monthlyLeaveAllowance: Number(row.monthlyLeaveAllowance || "0"),
            advancePaid: Number(row.advancePaid || "0")
          }))
        })
      });
      setResult(response);
      setStatusMessage(
        response.failedCount
          ? `${response.createdCount} employees imported. ${response.failedCount} rows need attention.`
          : `${response.createdCount} employees imported successfully.`
      );
      await onReload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to import employees.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="panel">
      <div className="topbar">
        <div>
          <h3>Bulk upload employees</h3>
          <p className="muted section-intro">
            Paste rows copied from Excel or upload a CSV exported from Excel to add many employees at once.
          </p>
        </div>
        <button className="ghost-button" onClick={downloadEmployeeImportTemplate} type="button">
          Download template
        </button>
      </div>

      {remainingSlots !== null ? (
        <div className="info-card">
          <strong>Employee slots left</strong>
          <span className="muted">
            {remainingSlots > 0
              ? `${remainingSlots} more employee${remainingSlots === 1 ? "" : "s"} can be added on your current plan.`
              : "No employee slots are left on your current plan. Upgrade before importing more staff."}
          </span>
        </div>
      ) : null}

      <div className="employee-import-actions">
        <label className="file-picker">
          <span>Upload CSV</span>
          <input accept=".csv,.txt" disabled={disabled} onChange={(event) => void loadFile(event)} type="file" />
        </label>
        <button className="primary-button" disabled={disabled || importing || !previewRows.length || exceedsRemainingSlots} onClick={() => void submitImport()} type="button">
          {importing ? "Importing..." : "Import valid rows"}
        </button>
      </div>

      <label className="employee-import-textarea">
        Paste Excel rows
        <textarea
          placeholder="employeeCode, name, designation, email, phone, branch, monthlySalary, monthlyLeaveAllowance, advancePaid"
          rows={8}
          disabled={disabled}
          value={rawInput}
          onChange={(event) => {
            setRawInput(event.target.value);
            setResult(null);
            setStatusMessage("");
          }}
        />
      </label>

      <div className="info-card">
        <strong>Supported columns</strong>
        <span className="muted">
          Employee code, name, designation, email, phone, branch, monthly salary, allowed leaves, and advance paid.
        </span>
      </div>

      {statusMessage ? (
        <p className={statusMessage.includes("successfully") || statusMessage.includes("imported") ? "status-text" : "error-text"}>
          {statusMessage}
        </p>
      ) : null}

      {exceedsRemainingSlots ? (
        <p className="error-text">
          This import has {validRows.length} valid rows but only {remainingSlots} employee slot{remainingSlots === 1 ? "" : "s"} remain on your current plan.
        </p>
      ) : null}

      {previewRows.length ? (
        <div className="employee-import-preview">
          <div className="employee-import-summary">
            <span>{validRows.length} valid rows</span>
            <span>{invalidRows.length} rows need fixes</span>
          </div>

          <div className="attendance-card-list import-preview-list">
            {previewRows.map((row) => (
              <PreviewCard key={`${row.rowNumber}-${row.employeeCode}-${row.email}`} row={row} />
            ))}
          </div>
        </div>
      ) : null}

      {result?.results.length ? (
        <div className="employee-import-results">
          <h4>Import result</h4>
          <div className="attendance-card-list import-preview-list">
            {result.results.map((item) => (
              <article className="attendance-card" key={`${item.rowNumber}-${item.employeeCode}`}>
                <div className="attendance-card-header">
                  <strong>
                    Row {item.rowNumber}: {item.employeeName || item.employeeCode}
                  </strong>
                  <span className={`pill ${item.success ? "pill-success" : "pill-warning"}`}>
                    {item.success ? "Created" : "Skipped"}
                  </span>
                </div>
                <span className="muted">{item.message}</span>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreviewCard({ row }: { row: ParsedEmployeeImportRow }) {
  return (
    <article className="attendance-card">
      <div className="attendance-card-header">
        <strong>
          Row {row.rowNumber}: {row.name || row.employeeCode || "Employee"}
        </strong>
        <span className={`pill ${row.error ? "pill-warning" : "pill-success"}`}>
          {row.error ? "Needs fix" : "Ready"}
        </span>
      </div>
      <div className="attendance-card-grid">
        <span>Code</span>
        <strong>{row.employeeCode || "—"}</strong>
        <span>Branch</span>
        <strong>{row.branchLabel || "—"}</strong>
        <span>Salary</span>
        <strong>{row.monthlySalary || "—"}</strong>
      </div>
      {row.error ? <span className="error-text">{row.error}</span> : null}
    </article>
  );
}
