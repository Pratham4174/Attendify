import { useEffect, useMemo, useState } from "react";
import { buildAttendanceStatusRecords } from "../lib/attendanceStatus";
import { formatMonthKey } from "../lib/format";
import type { AttendancePreview, AttendanceRow, Employee, Holiday, LeaveRequest } from "../types";
import { AttendanceTable } from "./AttendanceTable";
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

  return (
    <>
      <section className="panel">
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

          <section className="panel">
            <div className="topbar">
              <div>
                <h3>{selectedEmployee.name}</h3>
                <p className="muted section-intro">
                  {selectedEmployee.designation} · {selectedEmployee.employeeCode} · {selectedEmployee.branchName}
                </p>
              </div>
            </div>
            <AttendanceTable
              records={records}
              onPreviewImage={onPreviewImage}
              emptyMessage="No attendance activity appears for this employee in the selected month."
            />
          </section>
        </>
      )}
    </>
  );
}
