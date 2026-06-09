import type { ReactNode } from "react";
import type { AttendancePreview, AttendanceRow, PayrollSummary } from "../types";
import { buildMapsUrl, formatDateTime, formatMoney, formatTimeOnly, formatWorkedHours } from "../lib/format";
import { EmptyState } from "./shared";

export function AttendancePayrollTable({
  payroll,
  onDownloadSlip
}: {
  payroll: PayrollSummary;
  onDownloadSlip?: (employeeId: string) => void;
}) {
  return (
    <>
      <table className="data-table desktop-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Monthly salary</th>
            <th>Worked days</th>
            <th>Half days</th>
            <th>Holiday days</th>
            <th>Worked units</th>
            <th>Allowed leaves</th>
            <th>Paid leaves used</th>
            <th>Unpaid leaves</th>
            <th>Payable days</th>
            <th>Opening advance</th>
            <th>Month advance</th>
            <th>Total advance</th>
            <th>Net payable</th>
            {onDownloadSlip ? <th>Slip</th> : null}
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
              <td>{employee.halfDays}</td>
              <td>{employee.holidayDays}</td>
              <td>{employee.workedDayUnits.value}</td>
              <td>{employee.allowedLeaves}</td>
              <td>{employee.paidLeaveDays}</td>
              <td>{employee.unpaidLeaveDays}</td>
              <td>{employee.payableDays.value}</td>
              <td>{formatMoney(employee.openingAdvance.value)}</td>
              <td>{formatMoney(employee.monthAdvancePaid.value)}</td>
              <td>{formatMoney(employee.totalAdvanceDeducted.value)}</td>
              <td>{formatMoney(employee.netPayable.value)}</td>
              {onDownloadSlip ? (
                <td>
                  <button className="ghost-button compact-button" onClick={() => onDownloadSlip(employee.employeeId)} type="button">
                    Slip
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="attendance-card-list payroll-card-list">
        {payroll.employees.map((employee) => (
          <article className="attendance-card" key={employee.employeeId}>
            <div className="attendance-card-header">
              <div className="payroll-card-identity">
                <strong>{employee.employeeName}</strong>
                <span className="table-subtext">{employee.designation}</span>
              </div>
              <span className="pill">{employee.status}</span>
            </div>
            <div className="payroll-card-highlight">
              <span>Net payable</span>
              <strong>{formatMoney(employee.netPayable.value)}</strong>
            </div>
            <div className="attendance-card-grid payroll-card-grid">
              <span>Monthly salary</span>
              <strong>{formatMoney(employee.monthlySalary.value)}</strong>
              <span>Worked days</span>
              <strong>{employee.workedDays}</strong>
              <span>Half days</span>
              <strong>{employee.halfDays}</strong>
              <span>Holiday days</span>
              <strong>{employee.holidayDays}</strong>
              <span>Worked units</span>
              <strong>{employee.workedDayUnits.value}</strong>
              <span>Allowed leaves</span>
              <strong>{employee.allowedLeaves}</strong>
              <span>Paid leaves used</span>
              <strong>{employee.paidLeaveDays}</strong>
              <span>Unpaid leaves</span>
              <strong>{employee.unpaidLeaveDays}</strong>
              <span>Payable days</span>
              <strong>{employee.payableDays.value}</strong>
              <span>Opening advance</span>
              <strong>{formatMoney(employee.openingAdvance.value)}</strong>
              <span>Month advance</span>
              <strong>{formatMoney(employee.monthAdvancePaid.value)}</strong>
              <span>Total advance</span>
              <strong>{formatMoney(employee.totalAdvanceDeducted.value)}</strong>
            </div>
            {onDownloadSlip ? (
              <div className="table-action-row card-action-row">
                <button className="ghost-button compact-button" onClick={() => onDownloadSlip(employee.employeeId)} type="button">
                  Download slip
                </button>
              </div>
            ) : null}
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
              <td>{getWorkedHoursLabel(record)}</td>
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
              <strong>{getWorkedHoursLabel(record)}</strong>
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
  if (!record.checkInPhotoRef && !record.checkOutPhotoRef) {
    return <span className="muted">No evidence for this day</span>;
  }

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

function getWorkedHoursLabel(record: AttendanceRow) {
  if (!record.checkInTime && !record.checkOutTime) {
    if (record.status === "Upcoming") {
      return "Not due";
    }
    if (record.status === "Holiday") {
      return "Holiday";
    }
    if (record.status === "Not marked") {
      return "Not marked";
    }
    if (record.status === "Paid leave" || record.status === "Auto paid leave" || record.status === "Unpaid leave") {
      return record.status;
    }
    if (record.status === "Absent") {
      return "Absent";
    }
  }

  if (!record.checkOutTime && record.status === "Absent") {
    return "Absent";
  }

  return formatWorkedHours(record.checkInTime, record.checkOutTime);
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
