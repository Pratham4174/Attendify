import type { ReactNode } from "react";
import type { AttendancePreview, AttendanceRow, PayrollSummary } from "../types";
import { buildMapsUrl, formatDateTime, formatMoney, formatTimeOnly, formatWorkedHours } from "../lib/format";
import { EmptyState } from "./shared";

export function AttendancePayrollTable({ payroll }: { payroll: PayrollSummary }) {
  return (
    <>
      <table className="data-table desktop-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Monthly salary</th>
            <th>Worked days</th>
            <th>Allowed leaves</th>
            <th>Unpaid leaves</th>
            <th>Payable days</th>
            <th>Advance</th>
            <th>Net payable</th>
          </tr>
        </thead>
        <tbody>
          {payroll.employees.map((employee) => (
            <tr key={employee.employeeId}>
              <td>
                <strong>{employee.employeeName}</strong>
                <div className="table-subtext">{employee.designation}</div>
              </td>
              <td>{formatMoney(employee.monthlySalary.value)}</td>
              <td>{employee.workedDays}</td>
              <td>{employee.allowedLeaves}</td>
              <td>{employee.unpaidLeaveDays}</td>
              <td>{employee.payableDays}</td>
              <td>{formatMoney(employee.advancePaid.value)}</td>
              <td>{formatMoney(employee.netPayable.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="attendance-card-list payroll-card-list">
        {payroll.employees.map((employee) => (
          <article className="attendance-card" key={employee.employeeId}>
            <div className="attendance-card-header">
              <strong>{employee.employeeName}</strong>
              <span className="pill">{employee.status}</span>
            </div>
            <div className="attendance-card-grid">
              <span>Monthly salary</span>
              <strong>{formatMoney(employee.monthlySalary.value)}</strong>
              <span>Worked days</span>
              <strong>{employee.workedDays}</strong>
              <span>Allowed leaves</span>
              <strong>{employee.allowedLeaves}</strong>
              <span>Unpaid leaves</span>
              <strong>{employee.unpaidLeaveDays}</strong>
              <span>Payable days</span>
              <strong>{employee.payableDays}</strong>
              <span>Advance</span>
              <strong>{formatMoney(employee.advancePaid.value)}</strong>
              <span>Net payable</span>
              <strong>{formatMoney(employee.netPayable.value)}</strong>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function AttendanceTable({
  records,
  onPreviewImage,
  emptyMessage
}: {
  records: AttendanceRow[];
  onPreviewImage?: (preview: AttendancePreview) => void;
  emptyMessage?: string;
}) {
  if (!records.length) {
    return (
      <EmptyState
        title="Nothing to show yet"
        message={emptyMessage ?? "Attendance records will appear here once your team starts using ATTENDIFY."}
      />
    );
  }

  return (
    <>
      <table className="data-table desktop-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Hours worked</th>
            <th>Status</th>
            <th>Branch</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.recordId}>
              <td>{record.employeeName}</td>
              <td>{record.date}</td>
              <td>{formatDateTime(record.checkInTime)}</td>
              <td>{formatDateTime(record.checkOutTime)}</td>
              <td>{formatWorkedHours(record.checkInTime, record.checkOutTime)}</td>
              <td>{record.status}</td>
              <td>{record.branchName}</td>
              <td>{renderEvidence(record, onPreviewImage)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="attendance-card-list">
        {records.map((record) => (
          <article className="attendance-card" key={record.recordId}>
            <div className="attendance-card-header">
              <strong>{record.employeeName}</strong>
              <span className="pill">{record.status}</span>
            </div>
            <div className="attendance-card-grid">
              <span>Date</span>
              <strong>{record.date}</strong>
              <span>Branch</span>
              <strong>{record.branchName}</strong>
              <span>Check-in</span>
              <strong>{formatDateTime(record.checkInTime)}</strong>
              <span>Check-out</span>
              <strong>{formatDateTime(record.checkOutTime)}</strong>
              <span>Hours worked</span>
              <strong>{formatWorkedHours(record.checkInTime, record.checkOutTime)}</strong>
            </div>
            <div className="attendance-card-evidence">{renderEvidence(record, onPreviewImage)}</div>
          </article>
        ))}
      </div>
    </>
  );
}

function renderEvidence(
  record: AttendanceRow,
  onPreviewImage?: (preview: AttendancePreview) => void
) {
  return (
    <div className="evidence-stack evidence-thumbnail-stack">
      {record.checkInPhotoRef ? (
        <div className="evidence-item">
          <button
            className="evidence-thumb-button"
            type="button"
            onClick={() =>
              onPreviewImage?.({
                image: record.checkInPhotoRef!,
                label: "Check-in proof",
                time: record.checkInTime,
                employeeName: record.employeeName
              })
            }
          >
            <img alt="Check-in evidence" src={record.checkInPhotoRef} />
          </button>
          <span>Check-in · {formatTimeOnly(record.checkInTime)}</span>
        </div>
      ) : (
        <span className="muted">No check-in image</span>
      )}
      {record.checkOutPhotoRef ? (
        <div className="evidence-item">
          <button
            className="evidence-thumb-button"
            type="button"
            onClick={() =>
              onPreviewImage?.({
                image: record.checkOutPhotoRef!,
                label: "Check-out proof",
                time: record.checkOutTime,
                employeeName: record.employeeName
              })
            }
          >
            <img alt="Check-out evidence" src={record.checkOutPhotoRef} />
          </button>
          <span>Check-out · {formatTimeOnly(record.checkOutTime)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function TrackingLink({
  latitude,
  longitude,
  children
}: {
  latitude: number;
  longitude: number;
  children: ReactNode;
}) {
  return (
    <a className="tracking-point" href={buildMapsUrl(latitude, longitude)} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}
