import { useMemo, useState } from "react";
import { formatLocalDateKey, formatTimeOnly, formatWorkedHours } from "../lib/format";
import { buildAttendanceStatusRecords } from "../lib/attendanceStatus";
import type { AttendancePreview, AttendanceRow, Employee, Holiday, LeaveRequest } from "../types";
import { EmptyState, MetricCard, ProfileAvatar } from "./shared";

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
  if (record.status === "Present" || record.status === "Half day" || record.status === "Paid leave" || record.status === "Auto paid leave" || record.status === "Unpaid leave" || record.status === "Holiday" || record.status === "Upcoming" || record.status === "Absent" || record.status === "Not marked") {
    return record.status;
  }

  if (!record.checkOutTime && record.date < todayKey) {
    return "Absent";
  }

  if (record.checkOutTime) {
    return "Completed";
  }

  return "In progress";
}

function getAttendanceTone(record: AttendanceRow, todayKey: string) {
  const state = getAttendanceState(record, todayKey).toLowerCase();
  if (state.includes("absent") || state.includes("not marked")) {
    return "absent";
  }
  if (state.includes("leave") || state.includes("holiday")) {
    return "leave";
  }
  if (state.includes("progress")) {
    return "progress";
  }
  return "present";
}

export function AttendanceOverview({
  attendance,
  employees,
  leaveRequests,
  holidays,
  onPreviewImage
}: {
  attendance: AttendanceRow[];
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
  onPreviewImage?: (preview: AttendancePreview) => void;
}) {
  const todayKey = formatLocalDateKey(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [fromDate, setFromDate] = useState(todayKey);
  const [toDate, setToDate] = useState(todayKey);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRow | null>(null);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "ACTIVE"),
    [employees]
  );

  const safeFromDate = fromDate <= toDate ? fromDate : toDate;
  const safeToDate = toDate >= fromDate ? toDate : fromDate;
  const singleDayView = safeFromDate === safeToDate;

  const statusRecords = useMemo(() => {
    const scopedEmployees =
      selectedEmployeeId === "all"
        ? activeEmployees
        : activeEmployees.filter((employee) => employee.id === selectedEmployeeId);

    return buildAttendanceStatusRecords({
      employees: scopedEmployees,
      attendance,
      leaveRequests,
      holidays,
      fromDate: safeFromDate,
      toDate: safeToDate,
      todayKey
    }).sort((first, second) => {
      const secondTime = new Date(
        second.checkInTime ?? second.checkOutTime ?? `${second.date}T00:00:00`
      ).getTime();
      const firstTime = new Date(
        first.checkInTime ?? first.checkOutTime ?? `${first.date}T00:00:00`
      ).getTime();
      if (secondTime !== firstTime) {
        return secondTime - firstTime;
      }
      return second.date < first.date ? 1 : -1;
    });
  }, [activeEmployees, attendance, holidays, leaveRequests, safeFromDate, safeToDate, selectedEmployeeId, todayKey]);

  const selectedEmployee = useMemo(
    () =>
      selectedEmployeeId === "all"
        ? null
        : employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const completedRecords = useMemo(
    () => statusRecords.filter((record) => Boolean(getWorkedMinutes(record))),
    [statusRecords]
  );

  const totalWorkedMinutes = completedRecords.reduce(
    (sum, record) => sum + (getWorkedMinutes(record) ?? 0),
    0
  );
  const averageWorkedMinutes = completedRecords.length
    ? Math.round(totalWorkedMinutes / completedRecords.length)
    : null;
  const distinctDaysCount = new Set(statusRecords.map((record) => record.date)).size;

  const dayRecords = useMemo(() => {
    if (!singleDayView) {
      return [];
    }

    return statusRecords.filter((record) => record.date === safeFromDate);
  }, [safeFromDate, singleDayView, statusRecords]);

  const inProgressCount = dayRecords.filter(
    (record) => getAttendanceState(record, todayKey) === "In progress"
  ).length;
  const completedCount = dayRecords.filter((record) => record.status === "Present" || record.status === "Half day").length;
  const absentCount = dayRecords.filter((record) => record.status === "Absent").length;
  const notMarkedCount = dayRecords.filter((record) => record.status === "Not marked").length;

  return (
    <section className="attendance-app-dashboard">
      <div className="attendance-app-header">
        <div>
          <span className="eyebrow">Attendance command center</span>
          <h3>{safeFromDate === todayKey && safeToDate === todayKey ? "Today attendance" : "Attendance records"}</h3>
          <p className="muted section-intro">
            Review present, absent, leave, and working-hour proof quickly.
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

      <div className="attendance-filter-card">
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
        <section className="attendance-metric-grid attendance-app-metrics">
          <MetricCard label="Present today" value={completedCount} />
          <MetricCard label="On leave" value={dayRecords.filter((record) => record.status.includes("leave") || record.status === "Holiday").length} />
          <MetricCard label="Still on shift" value={inProgressCount} />
          <MetricCard label="Not marked / absent" value={notMarkedCount + absentCount} />
        </section>
      ) : (
        <section className="attendance-metric-grid attendance-app-metrics">
          <MetricCard label="Records shown" value={statusRecords.length} />
          <MetricCard label="Attendance days" value={distinctDaysCount} />
          <MetricCard label="Average work time" value={formatMinutes(averageWorkedMinutes)} />
          <MetricCard label="Total worked time" value={formatMinutes(totalWorkedMinutes)} />
        </section>
      )}

      {singleDayView ? (
        <section className="attendance-day-panel attendance-app-card">
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
                <button className="attendance-day-card attendance-tap-card" key={record.recordId} onClick={() => setSelectedRecord(record)} type="button">
                  <div className="attendance-day-card-head">
                    <ProfileAvatar
                      className="attendance-record-avatar"
                      image={employeeById.get(record.employeeId)?.profileImageRef}
                      name={record.employeeName}
                    />
                    <div>
                      <strong>{record.employeeName}</strong>
                      <span>{record.branchName}</span>
                    </div>
                    <span className={`attendance-status-pill ${getAttendanceTone(record, todayKey)}`}>{record.status}</span>
                  </div>
                  <div className="attendance-day-card-meta">
                    <span>Check-in: {formatTimeOnly(record.checkInTime)}</span>
                    <span>
                      {record.status === "Holiday" || record.status === "Paid leave" || record.status === "Auto paid leave" || record.status === "Unpaid leave" || record.status === "Upcoming" || record.status === "Absent" || record.status === "Not marked"
                        ? record.status
                        : record.checkOutTime
                        ? `Check-out: ${formatTimeOnly(record.checkOutTime)}`
                        : record.date < todayKey
                          ? "Checkout missing"
                          : "Still on shift"}
                    </span>
                  </div>
                  <strong className="attendance-day-card-hours">
                    {record.status === "Holiday" || record.status === "Paid leave" || record.status === "Auto paid leave" || record.status === "Unpaid leave" || record.status === "Upcoming" || record.status === "Not marked"
                      ? record.status
                      : record.date < todayKey && !record.checkOutTime
                      ? "Absent"
                      : formatWorkedHours(record.checkInTime, record.checkOutTime)}
                  </strong>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No attendance recorded"
              message={
                selectedEmployee
                ? `${selectedEmployee.name} has no attendance status for this day.`
                  : "Daily attendance statuses will appear here for every active employee."
              }
            />
          )}
        </section>
      ) : null}

      {selectedRecord ? (
        <div className="attendance-record-modal-backdrop" role="presentation">
          <section aria-modal="true" className="attendance-record-modal" role="dialog">
            <div className="attendance-record-modal-head">
              <div className="attendance-record-person">
                <ProfileAvatar
                  className="attendance-record-avatar large"
                  image={employeeById.get(selectedRecord.employeeId)?.profileImageRef}
                  name={selectedRecord.employeeName}
                />
                <div>
                  <span className="eyebrow">{selectedRecord.date}</span>
                  <h3>{selectedRecord.employeeName}</h3>
                  <p className="muted">{selectedRecord.branchName}</p>
                </div>
              </div>
              <button className="ghost-button compact-button" onClick={() => setSelectedRecord(null)} type="button">
                Close
              </button>
            </div>

            <div className="attendance-record-summary-grid">
              <div>
                <span>Status</span>
                <strong>{selectedRecord.status}</strong>
              </div>
              <div>
                <span>Hours worked</span>
                <strong>{formatWorkedHours(selectedRecord.checkInTime, selectedRecord.checkOutTime)}</strong>
              </div>
              <div>
                <span>Check-in</span>
                <strong>{formatTimeOnly(selectedRecord.checkInTime)}</strong>
              </div>
              <div>
                <span>Check-out</span>
                <strong>{formatTimeOnly(selectedRecord.checkOutTime)}</strong>
              </div>
            </div>

            <div className="attendance-record-proof-grid">
              <RecordProofCard
                distance={selectedRecord.checkInDistanceMeters}
                image={selectedRecord.checkInPhotoRef}
                label="Check-in proof"
                onPreviewImage={onPreviewImage}
                record={selectedRecord}
                time={selectedRecord.checkInTime}
              />
              <RecordProofCard
                distance={selectedRecord.checkOutDistanceMeters}
                image={selectedRecord.checkOutPhotoRef}
                label="Check-out proof"
                onPreviewImage={onPreviewImage}
                record={selectedRecord}
                time={selectedRecord.checkOutTime}
              />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function RecordProofCard({
  distance,
  image,
  label,
  onPreviewImage,
  record,
  time
}: {
  distance: number | null;
  image: string | null;
  label: string;
  onPreviewImage?: (preview: AttendancePreview) => void;
  record: AttendanceRow;
  time: string | null;
}) {
  return (
    <article className="attendance-proof-card">
      <div>
        <strong>{label}</strong>
        <span className="muted">{formatTimeOnly(time)}</span>
      </div>
      {image ? (
        <button
          className="attendance-proof-image-button"
          onClick={() =>
            onPreviewImage?.({
              image,
              label,
              time,
              employeeName: record.employeeName
            })
          }
          type="button"
        >
          <img alt={label} src={image} />
        </button>
      ) : (
        <div className="attendance-proof-empty">No image captured</div>
      )}
      <span className="attendance-proof-distance">
        Distance from branch: {typeof distance === "number" ? `${distance.toFixed(1)}m` : "Not available"}
      </span>
    </article>
  );
}
