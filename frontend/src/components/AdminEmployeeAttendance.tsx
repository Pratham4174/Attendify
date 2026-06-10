import { useEffect, useMemo, useState } from "react";
import { buildAttendanceStatusRecords } from "../lib/attendanceStatus";
import { formatDateTime, formatMonthKey, formatTimeOnly, formatWorkedHours } from "../lib/format";
import type { AttendancePreview, AttendanceRow, Employee, Holiday, LeaveRequest } from "../types";
import { EmptyState, MetricCard } from "./shared";

function getWorkedMinutes(record: AttendanceRow) {
  if (!record.checkInTime || !record.checkOutTime) {
    return null;
  }

  const checkIn = new Date(record.checkInTime).getTime();
  const checkOut = new Date(record.checkOutTime).getTime();
  const diffMs = checkOut - checkIn;

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return null;
  }

  return Math.round(diffMs / 60000);
}

function formatMinutes(totalMinutes: number | null) {
  if (totalMinutes == null || totalMinutes < 0) {
    return "0h 0m";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function AdminEmployeeAttendance({
  employees,
  attendance,
  leaveRequests,
  holidays,
  onPreviewImage
}: {
  employees: Employee[];
  attendance: AttendanceRow[];
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
  onPreviewImage?: (preview: AttendancePreview) => void;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [historyMonth, setHistoryMonth] = useState(() => formatMonthKey(new Date()));

  useEffect(() => {
    if (!employees.length) {
      setSelectedEmployeeId("");
      return;
    }

    setSelectedEmployeeId((current) =>
      current && employees.some((employee) => employee.id === current) ? current : employees[0].id
    );
  }, [employees]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const monthStart = `${historyMonth}-01`;
  const monthEnd = `${historyMonth}-${new Date(Number(historyMonth.slice(0, 4)), Number(historyMonth.slice(5, 7)), 0).getDate().toString().padStart(2, "0")}`;

  const records = useMemo(() => {
    if (!selectedEmployee) {
      return [];
    }

    return buildAttendanceStatusRecords({
      employees: [selectedEmployee],
      attendance,
      leaveRequests,
      holidays,
      fromDate: monthStart,
      toDate: monthEnd
    }).sort((first, second) => {
      if (second.date === first.date) {
        return 0;
      }
      return second.date < first.date ? -1 : 1;
    });
  }, [attendance, holidays, leaveRequests, monthEnd, monthStart, selectedEmployee]);

  const completedRecords = useMemo(
    () => records.filter((record) => Boolean(getWorkedMinutes(record))),
    [records]
  );

  const totalWorkedMinutes = completedRecords.reduce(
    (sum, record) => sum + (getWorkedMinutes(record) ?? 0),
    0
  );
  const averageWorkedMinutes = completedRecords.length
    ? Math.round(totalWorkedMinutes / completedRecords.length)
    : null;
  const presentCount = records.filter(
    (record) => record.status === "Present" || record.status === "Half day"
  ).length;
  const leaveCount = records.filter(
    (record) =>
      record.status === "Paid leave" ||
      record.status === "Auto paid leave" ||
      record.status === "Unpaid leave" ||
      record.status === "Holiday"
  ).length;
  const missedCount = records.filter(
    (record) => record.status === "Absent" || record.status === "Not marked"
  ).length;

  function renderEvidence(record: AttendanceRow) {
    if (!record.checkInPhotoRef && !record.checkOutPhotoRef) {
      return <span className="muted">No evidence</span>;
    }

    return (
      <div className="evidence-stack evidence-thumbnail-stack">
        {record.checkInPhotoRef ? (
          <div className="evidence-item">
            <button
              className="evidence-thumb-button"
              onClick={() =>
                onPreviewImage?.({
                  image: record.checkInPhotoRef!,
                  label: "Check-in proof",
                  time: record.checkInTime,
                  employeeName: record.employeeName
                })
              }
              type="button"
            >
              <img alt="Check-in evidence" src={record.checkInPhotoRef} />
            </button>
            <span>In · {formatTimeOnly(record.checkInTime)}</span>
          </div>
        ) : null}
        {record.checkOutPhotoRef ? (
          <div className="evidence-item">
            <button
              className="evidence-thumb-button"
              onClick={() =>
                onPreviewImage?.({
                  image: record.checkOutPhotoRef!,
                  label: "Check-out proof",
                  time: record.checkOutTime,
                  employeeName: record.employeeName
                })
              }
              type="button"
            >
              <img alt="Check-out evidence" src={record.checkOutPhotoRef} />
            </button>
            <span>Out · {formatTimeOnly(record.checkOutTime)}</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <section className="panel employee-attendance-panel">
        <div className="topbar">
          <div>
            <h3>Detailed employee attendance</h3>
            <p className="muted section-intro">
              Pick one employee and any month to review every day in that month, including marked days, leave, holidays, and missed attendance.
            </p>
          </div>
        </div>

        <div className="attendance-filter-bar detailed-attendance-filter-bar">
          <label>
            Employee
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} · {employee.designation}
                </option>
              ))}
            </select>
          </label>
          <label>
            Month
            <input
              type="month"
              value={historyMonth}
              onChange={(event) => setHistoryMonth(event.target.value)}
            />
          </label>
          <div className="attendance-inline-summary">
            <span className="label">Selected branch</span>
            <strong>{selectedEmployee?.branchName ?? "No employee selected"}</strong>
          </div>
        </div>
      </section>

      {!selectedEmployee ? (
        <EmptyState
          title="No active employee selected"
          message="Add or reactivate an employee to review full monthly attendance."
        />
      ) : (
        <>
          <section className="attendance-metric-grid detailed-attendance-metric-grid">
            <MetricCard label="Present days" value={presentCount} />
            <MetricCard label="Leave / holidays" value={leaveCount} />
            <MetricCard label="Missed days" value={missedCount} />
            <MetricCard label="Average work time" value={formatMinutes(averageWorkedMinutes)} />
          </section>

          <section className="panel employee-attendance-panel">
            <div className="topbar employee-attendance-header">
              <div>
                <h3>{selectedEmployee.name}</h3>
                <p className="muted section-intro">
                  {selectedEmployee.designation} · {selectedEmployee.employeeCode} · {selectedEmployee.branchName}
                </p>
              </div>
            </div>
            {records.length ? (
              <div className="employee-attendance-table-card">
                <div className="employee-attendance-table-note muted">
                  Swipe left or right inside the table to review the full day details.
                </div>
                <div className="responsive-table-shell employee-attendance-table-shell force-table-view">
                  <table className="data-table desktop-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Hours worked</th>
                        <th>Status</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.recordId}>
                          <td>{record.date}</td>
                          <td>{formatDateTime(record.checkInTime)}</td>
                          <td>{formatDateTime(record.checkOutTime)}</td>
                          <td>
                            {record.date < new Date().toISOString().slice(0, 10) && !record.checkOutTime && record.status !== "Holiday" && record.status !== "Paid leave" && record.status !== "Auto paid leave" && record.status !== "Unpaid leave" && record.status !== "Not marked"
                              ? "Absent"
                              : formatWorkedHours(record.checkInTime, record.checkOutTime)}
                          </td>
                          <td>{record.status}</td>
                          <td>{renderEvidence(record)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Nothing to show yet"
                message="No attendance activity appears for this employee in the selected month."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
