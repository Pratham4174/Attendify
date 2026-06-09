import type { AttendanceRow, Employee, Holiday, LeaveRequest } from "../types";

type AttendanceStatusSource = {
  employees: Array<Pick<Employee, "id" | "name" | "branchId" | "branchName" | "monthlyLeaveAllowance" | "createdAt">>;
  attendance: AttendanceRow[];
  leaveRequests: Array<Pick<LeaveRequest, "employeeId" | "leaveType" | "status" | "startDate" | "endDate">>;
  holidays: Array<Pick<Holiday, "holidayDate">>;
  fromDate: string;
  toDate: string;
  todayKey?: string;
};

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function expandDateRange(startDate: string, endDate: string, fromDate: string, toDate: string) {
  const start = startDate > fromDate ? startDate : fromDate;
  const end = endDate < toDate ? endDate : toDate;
  if (end < start) {
    return [];
  }

  const dates: string[] = [];
  let cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = `${cursor.getMonth() + 1}`.padStart(2, "0");
    const day = `${cursor.getDate()}`.padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function getWorkedUnits(record: AttendanceRow) {
  if (!record.checkInTime || !record.checkOutTime) {
    return 0;
  }

  const checkIn = new Date(record.checkInTime).getTime();
  const checkOut = new Date(record.checkOutTime).getTime();
  const diffMinutes = Math.round((checkOut - checkIn) / 60000);
  if (Number.isNaN(diffMinutes) || diffMinutes < 0) {
    return 0;
  }
  if (diffMinutes >= 480) {
    return 1;
  }
  if (diffMinutes >= 240) {
    return 0.5;
  }
  return 0;
}

export function buildAttendanceStatusRecords({
  employees,
  attendance,
  leaveRequests,
  holidays,
  fromDate,
  toDate,
  todayKey
}: AttendanceStatusSource) {
  const effectiveToday = todayKey ?? new Date().toISOString().slice(0, 10);
  const holidayDates = new Set(holidays.map((holiday) => holiday.holidayDate));
  const approvedLeaves = leaveRequests.filter((leaveRequest) => leaveRequest.status === "APPROVED");
  const attendanceByEmployee = new Map<string, Map<string, AttendanceRow>>();

  for (const record of attendance) {
    if (record.date < fromDate || record.date > toDate) {
      continue;
    }
    const employeeRecords = attendanceByEmployee.get(record.employeeId) ?? new Map<string, AttendanceRow>();
    if (!employeeRecords.has(record.date)) {
      employeeRecords.set(record.date, record);
    }
    attendanceByEmployee.set(record.employeeId, employeeRecords);
  }

  const rows: AttendanceRow[] = [];

  for (const employee of employees) {
    const employeeAttendance = attendanceByEmployee.get(employee.id) ?? new Map<string, AttendanceRow>();
    const approvedPaidLeaveDates = new Set<string>();
    const approvedUnpaidLeaveDates = new Set<string>();
    for (const leaveRequest of approvedLeaves) {
      if (leaveRequest.employeeId !== employee.id) {
        continue;
      }
      for (const date of expandDateRange(leaveRequest.startDate, leaveRequest.endDate, fromDate, toDate)) {
        if (leaveRequest.leaveType === "PAID") {
          approvedPaidLeaveDates.add(date);
        } else {
          approvedUnpaidLeaveDates.add(date);
        }
      }
    }

    const remainingAllowanceByMonth = new Map<string, number>();
    const employeeStartDate = employee.createdAt.slice(0, 10);
    const effectiveFromDate = employeeStartDate > fromDate ? employeeStartDate : fromDate;

    for (const date of expandDateRange(effectiveFromDate, toDate, effectiveFromDate, toDate)) {
      const monthKey = getMonthKey(date);
      if (!remainingAllowanceByMonth.has(monthKey)) {
        remainingAllowanceByMonth.set(monthKey, employee.monthlyLeaveAllowance);
      }

      const attendanceRecord = employeeAttendance.get(date);
      const branchName = attendanceRecord?.branchName ?? employee.branchName;
      const branchId = attendanceRecord?.branchId ?? employee.branchId;

      if (date > effectiveToday) {
        continue;
      }

      if (holidayDates.has(date)) {
        rows.push({
          recordId: `${employee.id}-${date}-holiday`,
          employeeId: employee.id,
          employeeName: employee.name,
          branchId,
          branchName,
          date,
          checkInTime: null,
          checkOutTime: null,
          status: "Holiday",
          checkInDistanceMeters: 0,
          checkOutDistanceMeters: null,
          checkInPhotoRef: null,
          checkOutPhotoRef: null
        });
        continue;
      }

      const remainingAllowance = remainingAllowanceByMonth.get(monthKey) ?? 0;

      if (attendanceRecord) {
        const workedUnits = getWorkedUnits(attendanceRecord);
        if (!attendanceRecord.checkOutTime && date < effectiveToday) {
          if (remainingAllowance > 0) {
            remainingAllowanceByMonth.set(monthKey, remainingAllowance - 1);
            rows.push({ ...attendanceRecord, status: "Auto paid leave" });
          } else {
            rows.push({ ...attendanceRecord, status: "Absent" });
          }
          continue;
        }

        if (!attendanceRecord.checkOutTime) {
          rows.push({ ...attendanceRecord, status: "In progress" });
          continue;
        }

        if (workedUnits >= 1) {
          rows.push({ ...attendanceRecord, status: "Present" });
        } else if (workedUnits >= 0.5) {
          rows.push({ ...attendanceRecord, status: "Half day" });
        } else if (remainingAllowance > 0) {
          remainingAllowanceByMonth.set(monthKey, remainingAllowance - 1);
          rows.push({ ...attendanceRecord, status: "Auto paid leave" });
        } else {
          rows.push({ ...attendanceRecord, status: "Absent" });
        }
        continue;
      }

      if (approvedPaidLeaveDates.has(date)) {
        if (remainingAllowance > 0) {
          remainingAllowanceByMonth.set(monthKey, remainingAllowance - 1);
          rows.push({
            recordId: `${employee.id}-${date}-paid-leave`,
            employeeId: employee.id,
            employeeName: employee.name,
            branchId,
            branchName,
            date,
            checkInTime: null,
            checkOutTime: null,
            status: "Paid leave",
            checkInDistanceMeters: 0,
            checkOutDistanceMeters: null,
            checkInPhotoRef: null,
            checkOutPhotoRef: null
          });
        } else {
          rows.push({
            recordId: `${employee.id}-${date}-paid-overflow`,
            employeeId: employee.id,
            employeeName: employee.name,
            branchId,
            branchName,
            date,
            checkInTime: null,
            checkOutTime: null,
            status: "Unpaid leave",
            checkInDistanceMeters: 0,
            checkOutDistanceMeters: null,
            checkInPhotoRef: null,
            checkOutPhotoRef: null
          });
        }
        continue;
      }

      if (approvedUnpaidLeaveDates.has(date)) {
        rows.push({
          recordId: `${employee.id}-${date}-unpaid-leave`,
          employeeId: employee.id,
          employeeName: employee.name,
          branchId,
          branchName,
          date,
          checkInTime: null,
          checkOutTime: null,
          status: "Unpaid leave",
          checkInDistanceMeters: 0,
          checkOutDistanceMeters: null,
          checkInPhotoRef: null,
          checkOutPhotoRef: null
        });
        continue;
      }

      if (date === effectiveToday) {
        rows.push({
          recordId: `${employee.id}-${date}-not-marked`,
          employeeId: employee.id,
          employeeName: employee.name,
          branchId,
          branchName,
          date,
          checkInTime: null,
          checkOutTime: null,
          status: "Not marked",
          checkInDistanceMeters: 0,
          checkOutDistanceMeters: null,
          checkInPhotoRef: null,
          checkOutPhotoRef: null
        });
        continue;
      }

      if (remainingAllowance > 0) {
        remainingAllowanceByMonth.set(monthKey, remainingAllowance - 1);
        rows.push({
          recordId: `${employee.id}-${date}-auto-paid-leave`,
          employeeId: employee.id,
          employeeName: employee.name,
          branchId,
          branchName,
          date,
          checkInTime: null,
          checkOutTime: null,
          status: "Auto paid leave",
          checkInDistanceMeters: 0,
          checkOutDistanceMeters: null,
          checkInPhotoRef: null,
          checkOutPhotoRef: null
        });
      } else {
        rows.push({
          recordId: `${employee.id}-${date}-absent`,
          employeeId: employee.id,
          employeeName: employee.name,
          branchId,
          branchName,
          date,
          checkInTime: null,
          checkOutTime: null,
          status: "Absent",
          checkInDistanceMeters: 0,
          checkOutDistanceMeters: null,
          checkInPhotoRef: null,
          checkOutPhotoRef: null
        });
      }
    }
  }

  return rows;
}
