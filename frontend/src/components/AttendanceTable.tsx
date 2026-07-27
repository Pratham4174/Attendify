import type { ReactNode } from "react";
import type { AttendancePreview, AttendanceRow, PayrollSummary } from "../types";
import { buildMapsUrl, formatDateTime, formatMoney, formatTimeOnly, formatWorkedHours } from "../lib/format";
import { EmptyState } from "./shared";

function monthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const totalDays = new Date(year, monthNumber, 0).getDate();
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  return {
    leadingBlanks: Array.from({ length: firstDay }),
    days: Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      return `${month}-${String(day).padStart(2, "0")}`;
    })
  };
}

function shortDate(date: string) {
  return date.slice(8, 10);
}

export function PayrollCalendarView({ payroll }: { payroll: PayrollSummary }) {
  const { leadingBlanks, days } = monthDays(payroll.month);
  const employeesBySalaryDate = new Map<string, PayrollSummary["employees"]>();
  for (const employee of payroll.employees) {
    const items = employeesBySalaryDate.get(employee.salaryDate) ?? [];
    items.push(employee);
    employeesBySalaryDate.set(employee.salaryDate, items);
  }

  return (
    <div className="payroll-calendar">
      <div className="payroll-calendar-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="payroll-calendar-grid">
        {leadingBlanks.map((_, index) => (
          <div className="payroll-calendar-day payroll-calendar-empty" key={`blank-${index}`} />
        ))}
        {days.map((date) => {
          const dayEmployees = employeesBySalaryDate.get(date) ?? [];
          return (
            <div className={`payroll-calendar-day${dayEmployees.length ? " has-payroll" : ""}`} key={date}>
              <div className="payroll-calendar-date">{shortDate(date)}</div>
              {dayEmployees.map((employee) => (
                <article className="payroll-calendar-item" key={employee.employeeId}>
                  <div>
                    <strong>{employee.employeeName}</strong>
                    <span>{employee.designation}</span>
                  </div>
                  <strong>{formatMoney(employee.netPayable.value)}</strong>
                  <span className="muted">
                    {employee.workedDays} worked · {employee.halfDays} half · {employee.paidLeaveDays + employee.unpaidLeaveDays} leaves
                  </span>
                  <span className="muted">
                    Cycle {employee.cycleStartDate} to {employee.cycleEndDate}
                  </span>
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
              <th>Salary date</th>
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
              <td>
                <strong>{employee.salaryDate}</strong>
                <div className="table-subtext">{employee.cycleStartDate} to {employee.cycleEndDate}</div>
              </td>
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
              <span>Salary date</span>
              <strong>{employee.salaryDate}</strong>
              <span>Salary cycle</span>
              <strong>{employee.cycleStartDate} to {employee.cycleEndDate}</strong>
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
  onOpenRecord,
  emptyMessage,
  forceTableView = false
}: {
  records: AttendanceRow[];
  onPreviewImage?: (preview: AttendancePreview) => void;
  onOpenRecord?: (record: AttendanceRow) => void;
  emptyMessage?: string;
  forceTableView?: boolean;
}) {
  if (!records.length) {
    return (
      <EmptyState
        title="Nothing to show yet"
        message={emptyMessage ?? "Attendance records will appear here once your team starts using PEEPLIFY."}
      />
    );
  }

  return (
    <>
      <div className={forceTableView ? "responsive-table-shell force-table-view" : undefined}>
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
              {onOpenRecord ? <th>Details</th> : null}
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
                {onOpenRecord ? (
                  <td>
                    <button className="ghost-button compact-button" onClick={() => onOpenRecord(record)} type="button">
                      View
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!forceTableView ? (
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
              {onOpenRecord ? (
                <button className="ghost-button compact-button" onClick={() => onOpenRecord(record)} type="button">
                  View full details
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
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
