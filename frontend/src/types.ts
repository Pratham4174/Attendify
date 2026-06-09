export type Role = "SUPER_ADMIN" | "VENDOR_ADMIN" | "EMPLOYEE";

export type SessionUser = {
  userId: string;
  vendorId: string;
  vendorName: string;
  employeeId: string | null;
  name: string;
  email: string;
  role: Role;
};

export type Session = {
  token: string;
  user: SessionUser;
};

export type LoginResponse = Session;

export type AttendanceRow = {
  recordId: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInDistanceMeters: number;
  checkOutDistanceMeters: number | null;
  checkInPhotoRef: string | null;
  checkOutPhotoRef: string | null;
};

export type EmployeeOverview = {
  employee: {
    id: string;
    branchId: string;
    employeeCode: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    designation: string;
    profileImageRef: string | null;
  };
  branch: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  todayAttendance: AttendanceRow | null;
  recentAttendance: AttendanceRow[];
  tracking: {
    available: boolean;
    active: boolean;
    lastTrackedAt: string | null;
    pointsCapturedToday: number;
  };
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  branchName: string;
  leaveType: "PAID" | "UNPAID";
  status: "PENDING" | "APPROVED" | "REJECTED";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
};

export type Holiday = {
  id: string;
  name: string;
  holidayDate: string;
};

export type AttendanceCorrectionAudit = {
  actionType: string;
  actorName: string;
  note: string | null;
  beforeCheckInTime: string | null;
  beforeCheckOutTime: string | null;
  afterCheckInTime: string | null;
  afterCheckOutTime: string | null;
  createdAt: string;
};

export type AttendanceCorrection = {
  id: string;
  employeeId: string;
  employeeName: string;
  branchName: string;
  correctionType: "MISSED_CHECK_IN" | "MISSED_CHECK_OUT";
  status: "PENDING" | "APPROVED" | "REJECTED";
  attendanceDate: string;
  requestedTime: string;
  appliedTime: string | null;
  reason: string;
  reviewNote: string | null;
  reviewedByName: string | null;
  createdAt: string;
  reviewedAt: string | null;
  auditTrail: AttendanceCorrectionAudit[];
};

export type EmployeeLeaveWorkspace = {
  balance: {
    monthlyAllowance: number;
    approvedPaidLeaves: number;
    remainingPaidLeaves: number;
  };
  requests: LeaveRequest[];
  holidays: Holiday[];
};

export type Dashboard = {
  cards: {
    totalEmployees: number;
    presentToday: number;
    checkedOutToday: number;
    absentToday: number;
  };
  branchSnapshots: Array<{
    branchId: string;
    branchName: string;
    headcount: number;
    present: number;
  }>;
  recentAttendance: AttendanceRow[];
};

export type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  status: string;
  branchId: string;
  branchName: string;
  monthlySalary: string;
  monthlyLeaveAllowance: number;
  advancePaid: string;
  loginEnabled: boolean;
  profileImageRef: string | null;
};

export type EmployeeBulkImportResponse = {
  totalRows: number;
  createdCount: number;
  failedCount: number;
  results: Array<{
    rowNumber: number;
    employeeCode: string;
    employeeName: string;
    success: boolean;
    message: string;
  }>;
};

export type Branch = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  halfDayHours: number;
  fullDayHours: number;
};

export type AdminTracking = {
  enabled: boolean;
  date: string;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    branchName: string;
    attendanceStatus: string;
    checkInTime: string;
    checkOutTime: string | null;
    trackingActive: boolean;
    totalPings: number;
    points: Array<{
      capturedAt: string;
      latitude: number;
      longitude: number;
      accuracyMeters: number | null;
    }>;
  }>;
};

export type PayrollSummary = {
  month: string;
  advancePayments: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    paymentDate: string;
    amount: { value: string };
    note: string | null;
    createdAt: string;
  }>;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    designation: string;
    status: string;
    monthlySalary: { value: string };
    daysCounted: number;
    workedDays: number;
    halfDays: number;
    holidayDays: number;
    workedDayUnits: { value: string };
    allowedLeaves: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    payableDays: { value: string };
    dailyRate: { value: string };
    grossPayable: { value: string };
    openingAdvance: { value: string };
    monthAdvancePaid: { value: string };
    totalAdvanceDeducted: { value: string };
    netPayable: { value: string };
  }>;
};

export type ApiError = {
  error?: string;
};

export type EmployeeSeedForm = {
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
};

export type RegistrationSummary = {
  message: string;
  propertyName: string;
  adminEmail: string;
  employeesCreated: number;
};

export type AttendancePreview = {
  image: string;
  label: string;
  time: string | null;
  employeeName: string;
};
