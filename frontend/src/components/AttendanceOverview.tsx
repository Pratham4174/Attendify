import { useMemo, useState } from "react";
import { formatLocalDateKey, formatTimeOnly, formatWorkedHours } from "../lib/format";
import type { AttendancePreview, AttendanceRow, Employee } from "../types";
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

function getAttendanceState(record: AttendanceRow, todayKey: string) {
  if (!record.checkOutTime && record.date < todayKey) {
    return "Absent";
  }

  if (record.checkOutTime) {
    return "Completed";
  }

  return "In progress";
}

export function AttendanceOverview({
  attendance,
  employees,
  onPreviewImage
}: {
  attendance: AttendanceRow[];
  employees: Employee[];
  onPreviewImage?: (preview: AttendancePreview) => void;
}) {
  const todayKey = formatLocalDateKey(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [fromDate, setFromDate] = useState(todayKey);
  const [toDate, setToDate] = useState(todayKey);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "ACTIVE"),
    [employees]
  );

  const safeFromDate = fromDate <= toDate ? fromDate : toDate;
  const safeToDate = toDate >= fromDate ? toDate : fromDate;
  const singleDayView = safeFromDate === safeToDate;

  const filteredRecords = useMemo(() => {
    return attendance
      .filter((record) => {
        const matchesEmployee =
          selectedEmployeeId === "all" || record.employeeId === selectedEmployeeId;
        const matchesDate = record.date >= safeFromDate && record.date <= safeToDate;
        return matchesEmployee && matchesDate;
      })
      .sort((first, second) => {
        const secondTime = new Date(
          second.checkInTime ?? second.checkOutTime ?? `${second.date}T00:00:00`
        ).getTime();
        const firstTime = new Date(
          first.checkInTime ?? first.checkOutTime ?? `${first.date}T00:00:00`
        ).getTime();
        return secondTime - firstTime;
      });
  }, [attendance, safeFromDate, safeToDate, selectedEmployeeId]);

  const selectedEmployee = useMemo(
    () =>
      selectedEmployeeId === "all"
        ? null
        : employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const completedRecords = useMemo(
    () => filteredRecords.filter((record) => Boolean(getWorkedMinutes(record))),
    [filteredRecords]
  );

  const totalWorkedMinutes = completedRecords.reduce(
    (sum, record) => sum + (getWorkedMinutes(record) ?? 0),
    0
  );
  const averageWorkedMinutes = completedRecords.length
    ? Math.round(totalWorkedMinutes / completedRecords.length)
    : null;
  const distinctDaysCount = new Set(filteredRecords.map((record) => record.date)).size;

  const dayRecords = useMemo(() => {
    if (!singleDayView) {
      return [];
    }

    return filteredRecords.filter((record) => record.date === safeFromDate);
  }, [filteredRecords, safeFromDate, singleDayView]);

  const markedEmployeeIds = new Set(dayRecords.map((record) => record.employeeId));
  const missingEmployees =
    singleDayView && selectedEmployee
      ? dayRecords.length
        ? []
        : [selectedEmployee]
      : singleDayView
        ? activeEmployees.filter((employee) => !markedEmployeeIds.has(employee.id))
        : [];

  const inProgressCount = dayRecords.filter(
    (record) => getAttendanceState(record, todayKey) === "In progress"
  ).length;
  const completedCount = dayRecords.filter(
    (record) => getAttendanceState(record, todayKey) === "Completed"
  ).length;

  return (
    <section className="panel">
      <div className="attendance-overview-header">
        <div>
          <h3>Attendance</h3>
          <p className="muted section-intro">
            Start with today, then narrow by employee or day range for a simpler view.
          </p>
        </div>
        <button
          className="ghost-button"
          onClick={() => {
            setSelectedEmployeeId("all");
            setFromDate(todayKey);
            setToDate(todayKey);
          }}
          type="button"
        >
          Today
        </button>
      </div>

      <div className="attendance-filter-bar">
        <label>
          Employee
          <select
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
          >
            <option value="all">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={safeFromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={safeToDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
      </div>

      {singleDayView ? (
        <section className="attendance-metric-grid">
          <MetricCard label="Marked today" value={dayRecords.length} />
          <MetricCard label="Completed" value={completedCount} />
          <MetricCard label="Still on shift" value={inProgressCount} />
          <MetricCard label="Absent today" value={missingEmployees.length} />
        </section>
      ) : (
        <section className="attendance-metric-grid">
          <MetricCard label="Records shown" value={filteredRecords.length} />
          <MetricCard label="Attendance days" value={distinctDaysCount} />
          <MetricCard label="Average work time" value={formatMinutes(averageWorkedMinutes)} />
          <MetricCard label="Total worked time" value={formatMinutes(totalWorkedMinutes)} />
        </section>
      )}

      {singleDayView ? (
        <section className="attendance-day-panel">
          <div className="attendance-day-panel-head">
            <div>
              <strong>{safeFromDate === todayKey ? "Today at a glance" : `Attendance for ${safeFromDate}`}</strong>
              <span className="muted">
                {selectedEmployee ? `Focused on ${selectedEmployee.name}` : "Quick view of everyone marked for this day."}
              </span>
            </div>
          </div>

          {dayRecords.length ? (
            <div className="attendance-day-grid">
              {dayRecords.map((record) => (
                <article className="attendance-day-card" key={record.recordId}>
                  <div className="attendance-day-card-head">
                    <div>
                      <strong>{record.employeeName}</strong>
                      <span>{record.branchName}</span>
                    </div>
                    <span className="pill">{getAttendanceState(record, todayKey)}</span>
                  </div>
                  <div className="attendance-day-card-meta">
                    <span>Check-in: {formatTimeOnly(record.checkInTime)}</span>
                    <span>
                      {record.checkOutTime
                        ? `Check-out: ${formatTimeOnly(record.checkOutTime)}`
                        : record.date < todayKey
                          ? "Checkout missing"
                          : "Still on shift"}
                    </span>
                  </div>
                  <strong className="attendance-day-card-hours">
                    {record.date < todayKey && !record.checkOutTime
                      ? "Absent"
                      : formatWorkedHours(record.checkInTime, record.checkOutTime)}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No attendance recorded"
              message={
                selectedEmployee
                  ? `${selectedEmployee.name} has no attendance for this day.`
                  : "No employee has marked attendance for this day yet."
              }
            />
          )}

          {missingEmployees.length ? (
            <div className="attendance-absence-card">
              <strong>Still missing</strong>
              <span className="muted">
                {missingEmployees.map((employee) => employee.name).join(", ")}
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="attendance-detail-panel">
        <div className="attendance-detail-panel-head">
          <div>
            <h4>Detailed records</h4>
            <p className="muted">
              {selectedEmployee
                ? `${selectedEmployee.name}'s attendance across the selected dates.`
                : "Filtered attendance records with proof and worked hours."}
            </p>
          </div>
          {filteredRecords.length ? (
            <div className="attendance-detail-summary">
              <span>Average</span>
              <strong>{formatMinutes(averageWorkedMinutes)}</strong>
            </div>
          ) : null}
        </div>

        {filteredRecords.length ? (
          <AttendanceTable
            records={filteredRecords}
            onPreviewImage={onPreviewImage}
            emptyMessage="No attendance records match these filters."
          />
        ) : (
          <EmptyState
            title="No matching attendance"
            message="Try another employee or widen the selected date range."
          />
        )}
      </section>
    </section>
  );
}
