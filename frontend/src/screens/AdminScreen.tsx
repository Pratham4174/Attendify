import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AttendanceOverview } from "../components/AttendanceOverview";
import { AdminEmployeeAttendance } from "../components/AdminEmployeeAttendance";
import { AdminSubscriptionDashboard } from "../components/AdminSubscriptionDashboard";
import { AttendancePayrollTable, TrackingLink } from "../components/AttendanceTable";
import { AttendanceCorrectionTable } from "../components/AttendanceCorrections";
import { BranchManagement } from "../components/BranchManagement";
import { BulkEmployeeImport } from "../components/BulkEmployeeImport";
import { EmployeeDirectory } from "../components/EmployeeDirectory";
import { DockIcon, FloatingTabDock } from "../components/FloatingTabDock";
import { HolidayList, LeaveRequestTable } from "../components/LeaveManagement";
import { ActionList, BrandLogo, EmptyState, LoadingWorkspace, MetricCard } from "../components/shared";
import { apiFetch, apiFetchVoid, ApiRequestError } from "../lib/api";
import {
  formatDateTime,
  formatLocalDateKey,
  formatMoney,
  formatMonthKey,
  formatTimeOnly,
  formatWorkedHours,
  isLateCheckIn
} from "../lib/format";
import { downloadPayrollCsv, downloadSalarySlip } from "../lib/payroll";
import type {
  AdminTracking,
  AttendancePreview,
  AttendanceRow,
  Branch,
  Dashboard,
  Employee,
  AttendanceCorrection,
  Holiday,
  LeaveRequest,
  PayrollSummary,
  SubscriptionDashboard,
  Session
} from "../types";

type EmployeeFormState = {
  employeeCode: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  branchId: string;
  monthlySalary: string;
  monthlyLeaveAllowance: string;
  advancePaid: string;
};

type RenewalBanner = {
  tone: "warning" | "danger";
  title: string;
  message: string;
};

function buildRenewalBanner(subscription: SubscriptionDashboard | null): RenewalBanner | null {
  if (!subscription) {
    return null;
  }

  const currentPlan = subscription.currentPlan;
  const expirySource = currentPlan.trialEndsAt ?? currentPlan.renewalDate;
  if (!expirySource) {
    return null;
  }

  const expiryDate = new Date(expirySource);
  if (Number.isNaN(expiryDate.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isTrial = currentPlan.subscriptionStatus.toLowerCase().includes("trial");

  if (daysRemaining <= 0) {
    return {
      tone: "danger",
      title: isTrial ? "Free access expired" : "Subscription expired",
      message: isTrial
        ? "Your 3-day free access has ended. Renew a plan now to keep using Peeplify."
        : "Your workspace plan has expired. Renew now to keep attendance, payroll, and employee access active."
    };
  }

  if (daysRemaining <= 3) {
    return {
      tone: "danger",
      title: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`,
      message: `Your ${isTrial ? "free access" : "current plan"} will expire on ${formatDateTime(expirySource)}. Renew now to avoid interruption.`
    };
  }

  if (daysRemaining <= 7) {
    return {
      tone: "warning",
      title: `${daysRemaining} days left`,
      message: `Your ${isTrial ? "free access" : "current plan"} expires on ${formatDateTime(expirySource)}. Plan the renewal before the last day.`
    };
  }

  return null;
}

type AdminTab =
  | "overview"
  | "add-employee"
  | "employees"
  | "inactive-employees"
  | "corrections"
  | "leave"
  | "payroll"
  | "subscription"
  | "attendance"
  | "employee-attendance"
  | "tracking"
  | "branches";

export function AdminScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [tracking, setTracking] = useState<AdminTracking | null>(null);
  const [trackingDate, setTrackingDate] = useState(() => formatLocalDateKey(new Date()));
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [previewImage, setPreviewImage] = useState<AttendancePreview | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeFormStatus, setEmployeeFormStatus] = useState("");
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(() => formatMonthKey(new Date()));
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDashboard | null>(null);
  const [advancePaymentStatus, setAdvancePaymentStatus] = useState("");
  const [advancePaymentSaving, setAdvancePaymentSaving] = useState(false);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    employeeId: "",
    paymentDate: formatLocalDateKey(new Date()),
    amount: "",
    note: ""
  });
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [swipeTransitionDirection, setSwipeTransitionDirection] = useState<"left" | "right" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [leaveStatusMessage, setLeaveStatusMessage] = useState("");
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    holidayDate: ""
  });
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({
    employeeCode: "",
    name: "",
    designation: "",
    email: "",
    phone: "",
    branchId: "",
    monthlySalary: "",
    monthlyLeaveAllowance: "0",
    advancePaid: "0"
  });

  const adminTabs: Array<{ id: AdminTab; label: string; compactLabel: string; icon: ReactNode }> = [
    {
      id: "overview",
      label: "Overview",
      compactLabel: "Home",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "attendance",
      label: "Attendance",
      compactLabel: "Log",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M8 11.5 11 14.5 16 9.5M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "employee-attendance",
      label: "Employee attendance",
      compactLabel: "Month",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M7 4v4M17 4v4M4 10h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM9 14h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "payroll",
      label: "Payroll",
      compactLabel: "Pay",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M12 3v18M17 7.5c0-1.66-2.24-3-5-3s-5 1.34-5 3 2.24 3 5 3 5 1.34 5 3-2.24 3-5 3-5-1.34-5-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "add-employee",
      label: "Add employee",
      compactLabel: "Add",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "employees",
      label: "View employees",
      compactLabel: "Team",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M16 19a4 4 0 0 0-8 0M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 19a3.5 3.5 0 0 0-3-3.46M17 5.5a3.5 3.5 0 0 1 0 7M4 19a3.5 3.5 0 0 1 3-3.46M7 12.5a3.5 3.5 0 0 1 0-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "inactive-employees",
      label: "Inactive employees",
      compactLabel: "Off",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M4 4l16 16M9 9a3 3 0 1 0 4.24 4.24M6.5 17.5a6.5 6.5 0 0 1 9.19 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "corrections",
      label: "Corrections",
      compactLabel: "Fix",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="m4 20 4.5-1 9-9a2.12 2.12 0 1 0-3-3l-9 9L4 20Zm10-12 3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "leave",
      label: "Leave management",
      compactLabel: "Leave",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M7 4v4M17 4v4M4 10h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "subscription",
      label: "Subscription",
      compactLabel: "Plan",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M12 2 4 6v6c0 5 3.4 9.74 8 11 4.6-1.26 8-6 8-11V6l-8-4Zm-3 10 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "tracking",
      label: "Tracking",
      compactLabel: "Track",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "branches",
      label: "Branches",
      compactLabel: "Branch",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M4 20h16M6 20V8l6-4 6 4v12M10 12h4M10 16h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    }
  ];

  function resetEmployeeForm(nextBranches: Branch[] = branches) {
    setEditingEmployeeId(null);
    setEmployeeFormStatus("");
    setEmployeeForm({
      employeeCode: "",
      name: "",
      designation: "",
      email: "",
      phone: "",
      branchId: nextBranches[0]?.id ?? "",
      monthlySalary: "",
      monthlyLeaveAllowance: "0",
      advancePaid: "0"
    });
  }

  async function loadAdminData() {
    try {
      setLoadError("");
      const [dashboardData, employeeData, branchData, attendanceData, trackingData, payrollData, correctionData, leaveData, holidayData, subscriptionData] = await Promise.all([
        apiFetch<Dashboard>(session, "/admin/dashboard"),
        apiFetch<Employee[]>(session, "/admin/employees"),
        apiFetch<Branch[]>(session, "/admin/branches"),
        apiFetch<AttendanceRow[]>(session, "/admin/attendance"),
        apiFetch<AdminTracking>(session, `/admin/tracking?date=${trackingDate}`),
        apiFetch<PayrollSummary>(session, `/admin/payroll?month=${payrollMonth}`),
        apiFetch<AttendanceCorrection[]>(session, "/admin/corrections"),
        apiFetch<LeaveRequest[]>(session, "/admin/leaves"),
        apiFetch<Holiday[]>(session, "/admin/holidays"),
        apiFetch<SubscriptionDashboard>(session, "/admin/subscription")
      ]);

      setDashboard(dashboardData);
      setEmployees(employeeData);
      setBranches(branchData);
      setAttendance(attendanceData);
      setTracking(trackingData);
      setPayroll(payrollData);
      setCorrections(correctionData);
      setLeaveRequests(leaveData);
      setHolidays(holidayData);
      setSubscription(subscriptionData);
      setEmployeeForm((current) =>
        current.branchId || !branchData.length
          ? current
          : { ...current, branchId: branchData[0].id }
      );
      setAdvancePaymentForm((current) =>
        current.employeeId || !employeeData.length
          ? current
          : { ...current, employeeId: employeeData[0].id }
      );
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        onLogout();
        return;
      }

      setLoadError(error instanceof Error ? error.message : "Unable to load your dashboard.");
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [session, trackingDate, payrollMonth, onLogout]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("checkout_session_id") && query.get("renew") === "1") {
      setActiveTab("subscription");
    }
  }, []);

  useEffect(() => {
    if (!swipeTransitionDirection) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSwipeTransitionDirection(null);
    }, 240);

    return () => window.clearTimeout(timeout);
  }, [activeTab, swipeTransitionDirection]);

  function shouldIgnoreSwipeTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        "input, select, textarea, button, a, .responsive-table-shell, .floating-tab-dock, .image-modal-backdrop, .image-modal-card"
      )
    );
  }

  function handleContentTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (shouldIgnoreSwipeTarget(event.target)) {
      swipeStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleContentTouchEnd(event: React.TouchEvent<HTMLElement>) {
    if (!swipeStartRef.current || shouldIgnoreSwipeTarget(event.target)) {
      swipeStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    const currentIndex = adminTabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex === -1) {
      return;
    }

    if (deltaX < 0 && currentIndex < adminTabs.length - 1) {
      setSwipeTransitionDirection("left");
      setActiveTab(adminTabs[currentIndex + 1].id);
    } else if (deltaX > 0 && currentIndex > 0) {
      setSwipeTransitionDirection("right");
      setActiveTab(adminTabs[currentIndex - 1].id);
    }
  }

  function updateEmployeeForm(key: keyof EmployeeFormState, value: string) {
    setEmployeeForm((current) => ({ ...current, [key]: value }));
  }

  function updateAdvancePaymentForm(
    key: "employeeId" | "paymentDate" | "amount" | "note",
    value: string
  ) {
    setAdvancePaymentForm((current) => ({ ...current, [key]: value }));
  }

  function updateHolidayForm(key: "name" | "holidayDate", value: string) {
    setHolidayForm((current) => ({ ...current, [key]: value }));
  }

  function startEditingEmployee(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setEmployeeFormStatus("");
    setEmployeeForm({
      employeeCode: employee.employeeCode,
      name: employee.name,
      designation: employee.designation,
      email: employee.email,
      phone: employee.phone,
      branchId: employee.branchId,
      monthlySalary: employee.monthlySalary,
      monthlyLeaveAllowance: String(employee.monthlyLeaveAllowance),
      advancePaid: employee.advancePaid
    });
    setActiveTab("add-employee");
  }

  async function handleEmployeeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmployeeSaving(true);
    setEmployeeFormStatus("");

    try {
      const payload = {
        ...employeeForm,
        monthlySalary: Number(employeeForm.monthlySalary || "0"),
        monthlyLeaveAllowance: Number(employeeForm.monthlyLeaveAllowance || "0"),
        advancePaid: Number(employeeForm.advancePaid || "0")
      };

      await apiFetch<Employee>(
        session,
        editingEmployeeId ? `/admin/employees/${editingEmployeeId}` : "/admin/employees",
        {
          method: editingEmployeeId ? "PUT" : "POST",
          body: JSON.stringify(payload)
        }
      );

      setEmployeeFormStatus(
        editingEmployeeId ? "Employee updated successfully." : "Employee added successfully."
      );
      resetEmployeeForm();
      await loadAdminData();
    } catch (error) {
      setEmployeeFormStatus(
        error instanceof Error ? error.message : "Unable to save employee."
      );
    } finally {
      setEmployeeSaving(false);
    }
  }

  async function decideLeave(leaveId: string, status: "APPROVED" | "REJECTED") {
    setLeaveStatusMessage("");
    try {
      await apiFetch<LeaveRequest>(session, `/admin/leaves/${leaveId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewNote: status === "APPROVED" ? "Approved by owner." : "Rejected by owner."
        })
      });
      setLeaveStatusMessage(`Leave request ${status.toLowerCase()} successfully.`);
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to update leave request.");
    }
  }

  async function decideCorrection(correction: AttendanceCorrection, status: "APPROVED" | "REJECTED") {
    const ownerReason = window.prompt(
      status === "APPROVED"
        ? "Enter approval reason"
        : "Enter rejection reason"
    );
    if (!ownerReason?.trim()) {
      return;
    }

    const approvedTime =
      status === "APPROVED"
        ? window.prompt("Optional: change approved time (HH:MM). Leave blank to use requested time.", "")
        : "";

    setLeaveStatusMessage("");
    try {
      await apiFetch<AttendanceCorrection>(session, `/admin/corrections/${correction.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          approvedTime: approvedTime?.trim() || undefined,
          reviewNote: ownerReason.trim()
        })
      });
      setLeaveStatusMessage(`Correction ${status.toLowerCase()} successfully.`);
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to update correction request.");
    }
  }

  async function createHoliday(event: React.FormEvent) {
    event.preventDefault();
    setHolidaySaving(true);
    setLeaveStatusMessage("");
    try {
      await apiFetch<Holiday>(session, "/admin/holidays", {
        method: "POST",
        body: JSON.stringify(holidayForm)
      });
      setHolidayForm({ name: "", holidayDate: "" });
      setLeaveStatusMessage("Holiday added successfully.");
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to add holiday.");
    } finally {
      setHolidaySaving(false);
    }
  }

  async function removeHoliday(holiday: Holiday) {
    if (!window.confirm(`Remove ${holiday.name} from the holiday calendar?`)) {
      return;
    }
    setLeaveStatusMessage("");
    try {
      await apiFetchVoid(session, `/admin/holidays/${holiday.id}`, {
        method: "DELETE"
      });
      setLeaveStatusMessage("Holiday removed successfully.");
      await loadAdminData();
    } catch (error) {
      setLeaveStatusMessage(error instanceof Error ? error.message : "Unable to remove holiday.");
    }
  }

  async function submitAdvancePayment(event: React.FormEvent) {
    event.preventDefault();
    setAdvancePaymentSaving(true);
    setAdvancePaymentStatus("");
    try {
      await apiFetch(session, "/admin/advance-payments", {
        method: "POST",
        body: JSON.stringify({
          ...advancePaymentForm,
          amount: Number(advancePaymentForm.amount || "0")
        })
      });
      setAdvancePaymentStatus("Advance payment recorded successfully.");
      setAdvancePaymentForm((current) => ({
        ...current,
        amount: "",
        note: ""
      }));
      await loadAdminData();
    } catch (error) {
      setAdvancePaymentStatus(error instanceof Error ? error.message : "Unable to record advance payment.");
    } finally {
      setAdvancePaymentSaving(false);
    }
  }

  if (!dashboard) {
    if (loadError) {
      return (
        <main className="workspace">
          <section className="panel">
            <span className="eyebrow">PEEPLIFY</span>
            <h2>Unable to open your dashboard</h2>
            <p className="error-text">{loadError}</p>
            <div className="action-row">
              <button className="primary-button" onClick={() => window.location.reload()}>
                Try again
              </button>
              <button className="ghost-button" onClick={onLogout}>
                Back to sign in
              </button>
            </div>
          </section>
        </main>
      );
    }

    return <LoadingWorkspace title="Loading your dashboard" lines={5} />;
  }

  const todayKey = formatLocalDateKey(new Date());
  const activeEmployees = employees.filter((employee) => employee.status === "ACTIVE");
  const inactiveEmployees = employees.filter((employee) => employee.status === "INACTIVE");
  const employeeLimit = subscription?.currentPlan.employeeLimit ?? null;
  const employeeUsed = subscription?.currentPlan.employeeUsed ?? activeEmployees.length;
  const employeeLimitReached = employeeLimit !== null && !editingEmployeeId && employeeUsed >= employeeLimit;
  const remainingEmployeeSlots = employeeLimit === null ? null : Math.max(employeeLimit - employeeUsed, 0);
  const renewalBanner = buildRenewalBanner(subscription);
  const todayAttendance = attendance.filter((record) => record.date === todayKey);
  const todayAttendanceIds = new Set(todayAttendance.map((record) => record.employeeId));
  const absentEmployees = activeEmployees.filter(
    (employee) => employee.status === "ACTIVE" && !todayAttendanceIds.has(employee.id)
  );
  const checkedInEmployees = todayAttendance.filter((record) => record.status === "CHECKED_IN");
  const checkedOutEmployees = todayAttendance.filter((record) => record.status === "COMPLETED");
  const lateArrivals = todayAttendance.filter((record) => isLateCheckIn(record.checkInTime));

  return (
    <main className="workspace workspace-with-dock">
      <header className="topbar">
        <div className="workspace-brand-lockup">
          <BrandLogo className="brand-logo-compact" />
          <div>
            <span className="eyebrow">PEEPLIFY admin view</span>
            <h2>{session.user.name}</h2>
            <p className="muted">
              Track today&apos;s attendance, review proof, and focus on what needs attention first.
            </p>
          </div>
        </div>
        <div className="admin-header-actions">
          <button
            className="ghost-button admin-drawer-button"
            onClick={() => setDrawerOpen((current) => !current)}
            type="button"
          >
            Menu
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      {drawerOpen ? (
        <button
          aria-label="Close menu"
          className="workspace-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      ) : null}

      <div className="admin-shell">
        <aside className={`admin-sidebar${drawerOpen ? " open" : ""}`}>
          <div className="admin-sidebar-header">
            <span className="eyebrow">Owner workspace</span>
            <strong>Navigate features</strong>
          </div>
          <nav className="admin-nav">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                className={`admin-nav-button${activeTab === tab.id ? " active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setDrawerOpen(false);
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <section
          className={`admin-content${swipeTransitionDirection ? ` tab-transition tab-transition-${swipeTransitionDirection}` : ""}`}
          onTouchEnd={handleContentTouchEnd}
          onTouchStart={handleContentTouchStart}
        >
          {renewalBanner ? (
            <section className={`billing-reminder-banner billing-reminder-${renewalBanner.tone}`}>
              <div>
                <strong>{renewalBanner.title}</strong>
                <p>{renewalBanner.message}</p>
              </div>
              <button className="ghost-button compact-button" onClick={() => setActiveTab("subscription")} type="button">
                Renew now
              </button>
            </section>
          ) : null}

          {activeTab === "overview" ? (
            <>
              <section className="metric-grid">
                <MetricCard label="Present today" value={todayAttendance.length} />
                <MetricCard label="Absent today" value={absentEmployees.length} />
                <MetricCard label="Late today" value={lateArrivals.length} />
                <MetricCard label="Forgot checkout" value={checkedInEmployees.length} />
              </section>

              <section className="panel">
                <div className="topbar">
                  <div>
                    <h3>Today&apos;s action center</h3>
                    <p className="muted section-intro">
                      See who is present, absent, late, or still missing checkout without opening any other tab.
                    </p>
                  </div>
                  <span className="pill">{todayKey}</span>
                </div>
              </section>

              <section className="grid two-column payroll-action-grid">
                <article className="panel">
                  <h3>Present today</h3>
                  <p className="muted section-intro">Everyone who has already marked attendance today.</p>
                  <ActionList
                    items={todayAttendance.map(
                      (record) => `${record.employeeName} · ${record.branchName} · ${formatTimeOnly(record.checkInTime)}`
                    )}
                    emptyMessage="No one has marked attendance yet today."
                  />
                </article>
                <article className="panel">
                  <h3>Absent today</h3>
                  <p className="muted section-intro">People who have still not marked attendance today.</p>
                  <ActionList
                    items={absentEmployees.map((employee) => `${employee.name} · ${employee.designation}`)}
                    emptyMessage="Everyone assigned today has already marked attendance."
                  />
                </article>
              </section>

              <section className="grid two-column payroll-action-grid">
                <article className="panel">
                  <h3>Late arrivals</h3>
                  <p className="muted section-intro">Quick reminders for check-ins that happened later than usual.</p>
                  <ActionList
                    items={lateArrivals.map(
                      (record) => `${record.employeeName} · checked in at ${formatTimeOnly(record.checkInTime)}`
                    )}
                    emptyMessage="No late arrivals so far today."
                  />
                </article>
              </section>

              {subscription ? (
                <section className="panel billing-usage-banner">
                  <div>
                    <h3>Plan usage</h3>
                    <p className="muted section-intro">
                      Employees: {subscription.currentPlan.employeeUsed}/{subscription.currentPlan.employeeLimit ?? "Custom"} · Branches: {subscription.currentPlan.branchUsed}/{subscription.currentPlan.branchLimit || 1}
                    </p>
                  </div>
                  <button className="ghost-button" onClick={() => setActiveTab("subscription")} type="button">
                    Upgrade plan
                  </button>
                </section>
              ) : null}

              <section className="grid two-column">
                <article className="panel">
                  <h3>Forgot checkout</h3>
                  <p className="muted section-intro">People who checked in but have still not checked out.</p>
                  <ActionList
                    items={checkedInEmployees.map(
                      (record) => `${record.employeeName} · ${record.branchName} · ${formatTimeOnly(record.checkInTime)}`
                    )}
                    emptyMessage="No one is pending checkout right now."
                  />
                </article>
                <article className="panel">
                  <h3>Completed today</h3>
                  <p className="muted section-intro">Finished shifts with their worked hours.</p>
                  <ActionList
                    items={checkedOutEmployees.map(
                      (record) => `${record.employeeName} · ${formatWorkedHours(record.checkInTime, record.checkOutTime)}`
                    )}
                    emptyMessage="Completed shifts will appear here after check-out."
                  />
                </article>
              </section>
            </>
          ) : null}

          {activeTab === "add-employee" ? (
            <>
              <section className="panel">
                <div className="topbar">
                  <div>
                    <h3>{editingEmployeeId ? "Edit employee" : "Add employee"}</h3>
                    <p className="muted section-intro">
                      Add new staff, keep salary settings ready, and use the Excel-friendly import below for larger teams.
                    </p>
                  </div>
                  {editingEmployeeId ? (
                    <button className="ghost-button" onClick={() => resetEmployeeForm()} type="button">
                      Cancel edit
                    </button>
                  ) : null}
                </div>

                {subscription ? (
                  <div className="info-card">
                    <strong>Employee usage</strong>
                    <span className="muted">
                      {subscription.currentPlan.employeeUsed}/{subscription.currentPlan.employeeLimit ?? "Custom"} employees used on your current plan.
                    </span>
                  </div>
                ) : null}

                {employeeLimitReached ? (
                  <div className="billing-upgrade-prompt">
                    <strong>Employee limit reached</strong>
                    <span className="muted">Upgrade your plan to add another employee.</span>
                    <button className="ghost-button compact-button" onClick={() => setActiveTab("subscription")} type="button">
                      Upgrade plan
                    </button>
                  </div>
                ) : null}
                <form className="admin-form-grid" onSubmit={handleEmployeeSubmit}>
                  <div className="grid two-column compact-grid">
                    <label>
                      Employee code
                      <input required value={employeeForm.employeeCode} onChange={(event) => updateEmployeeForm("employeeCode", event.target.value)} placeholder="EMP-001" />
                    </label>
                    <label>
                      Full name
                      <input required value={employeeForm.name} onChange={(event) => updateEmployeeForm("name", event.target.value)} placeholder="Rahul Sharma" />
                    </label>
                  </div>
                  <div className="grid two-column compact-grid">
                    <label>
                      Designation
                      <input required value={employeeForm.designation} onChange={(event) => updateEmployeeForm("designation", event.target.value)} placeholder="Front desk / Cashier / Manager" />
                    </label>
                    <label>
                      Branch
                      <select required value={employeeForm.branchId} onChange={(event) => updateEmployeeForm("branchId", event.target.value)}>
                        <option value="" disabled>Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid two-column compact-grid">
                    <label>
                      Email
                      <input required type="email" value={employeeForm.email} onChange={(event) => updateEmployeeForm("email", event.target.value)} placeholder="employee@property.com" />
                    </label>
                    <label>
                      Phone
                      <input required value={employeeForm.phone} onChange={(event) => updateEmployeeForm("phone", event.target.value)} placeholder="+91-98xxxxxxx" />
                    </label>
                  </div>
                  <div className="grid three-column compact-grid">
                    <label>
                      Monthly salary
                      <input required min="0" step="0.01" type="number" value={employeeForm.monthlySalary} onChange={(event) => updateEmployeeForm("monthlySalary", event.target.value)} placeholder="20000" />
                    </label>
                    <label>
                      Allowed leaves / month
                      <input required min="0" max="31" type="number" value={employeeForm.monthlyLeaveAllowance} onChange={(event) => updateEmployeeForm("monthlyLeaveAllowance", event.target.value)} placeholder="2" />
                    </label>
                    <label>
                      Advance already paid
                      <input required min="0" step="0.01" type="number" value={employeeForm.advancePaid} onChange={(event) => updateEmployeeForm("advancePaid", event.target.value)} placeholder="0" />
                    </label>
                  </div>
                  <div className="action-row">
                    <button className="primary-button" disabled={employeeSaving || employeeLimitReached} type="submit">
                      {employeeSaving ? "Saving..." : editingEmployeeId ? "Update employee" : "Add employee"}
                    </button>
                    <span className="muted">New employees can sign in with their email and starter password `password`.</span>
                  </div>
                  {employeeFormStatus ? (
                    <p className={employeeFormStatus.includes("successfully") ? "status-text" : "error-text"}>
                      {employeeFormStatus}
                    </p>
                  ) : null}
                </form>
              </section>
              <BulkEmployeeImport
                session={session}
                branches={branches}
                onReload={loadAdminData}
                disabled={employeeLimitReached}
                disabledMessage="Your current plan allows no more employee slots. Upgrade the plan before importing more staff."
                remainingSlots={remainingEmployeeSlots}
              />
            </>
          ) : null}

          {activeTab === "employees" ? (
            <EmployeeDirectory
              session={session}
              employees={activeEmployees}
              branches={branches}
              attendance={attendance}
              payroll={payroll}
              onReload={loadAdminData}
              onEditEmployee={startEditingEmployee}
              title="Active employees"
              description="Review active team members quickly, then open their details for attendance, payroll, payments, and account actions."
            />
          ) : null}

          {activeTab === "inactive-employees" ? (
            <EmployeeDirectory
              session={session}
              employees={inactiveEmployees}
              branches={branches}
              attendance={attendance}
              payroll={payroll}
              onReload={loadAdminData}
              onEditEmployee={startEditingEmployee}
              title="Inactive employees"
              description="See staff who are currently inactive, review their past records, and reactivate them whenever needed."
            />
          ) : null}

          {activeTab === "payroll" ? (
            <>
              <section className="panel">
                <div className="topbar">
                  <div>
                    <h3>Payroll snapshot</h3>
                    <p className="muted section-intro">
                      Check how much is payable this month after worked days, allowed leave, and advances.
                    </p>
                  </div>
                  <label className="date-filter payroll-period-filter">
                    Payroll month
                    <input className="payroll-period-input" type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
                  </label>
                </div>
                {payroll?.employees.length ? (
                  <div className="payroll-summary-grid">
                    <MetricCard label="People in payroll" value={payroll.employees.length} />
                    <MetricCard
                      label="Total payable"
                      value={formatMoney(payroll.employees.reduce((sum, employee) => sum + Number(employee.netPayable.value), 0))}
                    />
                    <MetricCard
                      label="Month advances"
                      value={formatMoney(payroll.advancePayments.reduce((sum, payment) => sum + Number(payment.amount.value), 0))}
                    />
                  </div>
                ) : (
                  <EmptyState title="No payroll data yet" message="Payroll will appear here after employees are added with salary details." />
                )}
              </section>
              <section className="grid two-column">
                <article className="panel">
                  <div className="topbar">
                    <div>
                      <h3>Monthly export</h3>
                      <p className="muted section-intro">
                        Download a month-wise payroll report or a salary slip for each employee.
                      </p>
                    </div>
                    {payroll?.employees.length ? (
                      <button className="primary-button" onClick={() => downloadPayrollCsv(payroll)} type="button">
                        Export CSV
                      </button>
                    ) : null}
                  </div>
                  <div className="info-card">
                    <strong>Included in export</strong>
                    <span className="muted">Worked days, half days, paid and unpaid leave breakup, advance deductions, and net payable.</span>
                  </div>
                </article>
                <article className="panel">
                  <h3>Add advance payment</h3>
                  <p className="muted section-intro">
                    Record any salary amount paid early during the month so it is settled from the final payout.
                  </p>
                  <form className="leave-form-grid payroll-advance-form" onSubmit={submitAdvancePayment}>
                    <div className="grid two-column compact-grid">
                      <label>
                        Employee
                        <select value={advancePaymentForm.employeeId} onChange={(event) => updateAdvancePaymentForm("employeeId", event.target.value)} required>
                          <option value="" disabled>Select employee</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>{employee.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Payment date
                        <input className="payroll-date-input" type="date" value={advancePaymentForm.paymentDate} onChange={(event) => updateAdvancePaymentForm("paymentDate", event.target.value)} required />
                      </label>
                    </div>
                    <div className="grid two-column compact-grid">
                      <label>
                        Amount
                        <input type="number" min="0" step="0.01" value={advancePaymentForm.amount} onChange={(event) => updateAdvancePaymentForm("amount", event.target.value)} placeholder="5000" required />
                      </label>
                      <label>
                        Note
                        <input value={advancePaymentForm.note} onChange={(event) => updateAdvancePaymentForm("note", event.target.value)} placeholder="Emergency support / travel / festival advance" />
                      </label>
                    </div>
                    <div className="action-row">
                      <button className="primary-button" disabled={advancePaymentSaving} type="submit">
                        {advancePaymentSaving ? "Saving..." : "Record payment"}
                      </button>
                    </div>
                    {advancePaymentStatus ? (
                      <p className={advancePaymentStatus.includes("successfully") ? "status-text" : "error-text"}>
                        {advancePaymentStatus}
                      </p>
                    ) : null}
                  </form>
                </article>
              </section>
              <section className="panel">
                <h3>Payroll details</h3>
                <p className="muted section-intro">
                  Owners can see monthly salary, half-day deduction impact, paid and unpaid leave breakup, and advance settlement in one report.
                </p>
                {payroll?.employees.length ? (
                  <AttendancePayrollTable payroll={payroll} onDownloadSlip={(employeeId) => downloadSalarySlip(payroll, employeeId)} />
                ) : (
                  <EmptyState title="No salary records yet" message="Add salary details to employees and this section will show daily rate, gross, advance, and net payable." />
                )}
              </section>
              <section className="panel">
                <h3>Advance payment history</h3>
                <p className="muted section-intro">
                  Every early payment made during the month is listed here for payroll settlement.
                </p>
                {payroll?.advancePayments.length ? (
                  <>
                    <table className="data-table desktop-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payroll.advancePayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{payment.employeeName}</td>
                            <td>{payment.paymentDate}</td>
                            <td>{formatMoney(payment.amount.value)}</td>
                            <td>{payment.note ?? "No note"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="attendance-card-list payroll-card-list">
                      {payroll.advancePayments.map((payment) => (
                        <article className="attendance-card" key={payment.id}>
                          <div className="attendance-card-header">
                            <strong>{payment.employeeName}</strong>
                            <span className="pill">{payment.paymentDate}</span>
                          </div>
                          <div className="attendance-card-grid">
                            <span>Amount</span>
                            <strong>{formatMoney(payment.amount.value)}</strong>
                            <span>Note</span>
                            <strong>{payment.note ?? "No note"}</strong>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState title="No advance payments this month" message="Recorded salary advances will appear here and be settled in the payroll." />
                )}
              </section>
            </>
          ) : null}

          {activeTab === "subscription" ? (
            <AdminSubscriptionDashboard session={session} />
          ) : null}

          {activeTab === "leave" ? (
            <>
              <section className="grid two-column">
                <article className="panel">
                  <h3>Leave requests</h3>
                  <p className="muted section-intro">Approve or reject employee leave requests from one place.</p>
                  <LeaveRequestTable
                    requests={leaveRequests}
                    showEmployee
                    emptyTitle="No leave requests yet"
                    emptyMessage="Leave requests from employees will appear here."
                    renderActions={(request) =>
                      request.status === "PENDING" ? (
                        <>
                          <button className="ghost-button compact-button" onClick={() => void decideLeave(request.id, "APPROVED")} type="button">
                            Approve
                          </button>
                          <button className="ghost-button compact-button danger-button" onClick={() => void decideLeave(request.id, "REJECTED")} type="button">
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="muted">Decision saved</span>
                      )
                    }
                  />
                </article>

                <article className="panel">
                  <h3>Holiday calendar</h3>
                  <p className="muted section-intro">Add company holidays so payroll and leave screens stay aligned.</p>
                  <form className="leave-form-grid" onSubmit={createHoliday}>
                    <label>
                      Holiday name
                      <input required value={holidayForm.name} onChange={(event) => updateHolidayForm("name", event.target.value)} placeholder="Diwali / Founder's Day / Annual closure" />
                    </label>
                    <label>
                      Holiday date
                      <input required type="date" value={holidayForm.holidayDate} onChange={(event) => updateHolidayForm("holidayDate", event.target.value)} />
                    </label>
                    <div className="action-row">
                      <button className="primary-button" disabled={holidaySaving} type="submit">
                        {holidaySaving ? "Saving..." : "Add holiday"}
                      </button>
                    </div>
                  </form>
                  <div className="spacer-sm" />
                  <HolidayList holidays={holidays} onRemove={removeHoliday} />
                </article>
              </section>
              {leaveStatusMessage ? (
                <p className={leaveStatusMessage.includes("successfully") ? "status-text" : "error-text"}>
                  {leaveStatusMessage}
                </p>
              ) : null}
            </>
          ) : null}

          {activeTab === "corrections" ? (
            <>
              <section className="panel">
                <h3>Attendance corrections</h3>
                <p className="muted section-intro">
                  Review missed check-in and check-out requests, approve with a reason, and keep an audit trail for every change.
                </p>
                <AttendanceCorrectionTable
                  corrections={corrections}
                  showEmployee
                  emptyTitle="No correction requests yet"
                  emptyMessage="Employee correction requests will appear here once someone asks for a fix."
                  renderActions={(correction) =>
                    correction.status === "PENDING" ? (
                      <>
                        <button className="ghost-button compact-button" onClick={() => void decideCorrection(correction, "APPROVED")} type="button">
                          Approve
                        </button>
                        <button className="ghost-button compact-button danger-button" onClick={() => void decideCorrection(correction, "REJECTED")} type="button">
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="muted">Decision saved</span>
                    )
                  }
                />
              </section>
              {leaveStatusMessage ? (
                <p className={leaveStatusMessage.includes("successfully") ? "status-text" : "error-text"}>
                  {leaveStatusMessage}
                </p>
              ) : null}
            </>
          ) : null}

          {activeTab === "attendance" ? (
            <AttendanceOverview
              attendance={attendance}
              employees={activeEmployees}
              leaveRequests={leaveRequests}
              holidays={holidays}
              onPreviewImage={setPreviewImage}
            />
          ) : null}

          {activeTab === "employee-attendance" ? (
            <AdminEmployeeAttendance
              attendance={attendance}
              employees={activeEmployees}
              holidays={holidays}
              leaveRequests={leaveRequests}
              onPreviewImage={setPreviewImage}
            />
          ) : null}

          {activeTab === "tracking" ? (
            <section className="panel">
              <div className="topbar">
                <div>
                  <h3>On-duty location tracking</h3>
                  <p className="muted section-intro">
                    View the places employees visited after check-in and before checkout.
                  </p>
                </div>
                {tracking?.enabled ? (
                  <label className="date-filter">
                    Tracking date
                    <input type="date" value={trackingDate} onChange={(event) => setTrackingDate(event.target.value)} />
                  </label>
                ) : null}
              </div>
              {tracking?.enabled ? (
                tracking.employees.length ? (
                  <div className="tracking-card-list">
                    {tracking.employees.map((employeeRoute) => (
                      <article className="tracking-card" key={employeeRoute.employeeId}>
                        <div className="tracking-card-header">
                          <div>
                            <strong>{employeeRoute.employeeName}</strong>
                            <span className="muted">
                              {employeeRoute.branchName} · {employeeRoute.attendanceStatus}
                            </span>
                          </div>
                          <span className="pill">{employeeRoute.totalPings} updates</span>
                        </div>
                        <div className="tracking-card-summary">
                          <span>Check-in: {formatDateTime(employeeRoute.checkInTime)}</span>
                          <span>
                            {employeeRoute.checkOutTime ? `Check-out: ${formatDateTime(employeeRoute.checkOutTime)}` : "Still on duty"}
                          </span>
                        </div>
                        <div className="tracking-point-list">
                          {employeeRoute.points.map((point, index) => (
                            <TrackingLink
                              key={`${employeeRoute.employeeId}-${point.capturedAt}`}
                              latitude={point.latitude}
                              longitude={point.longitude}
                            >
                              <span className="tracking-point-order">{index + 1}</span>
                              <div>
                                <strong>{formatDateTime(point.capturedAt)}</strong>
                                <span>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</span>
                                <span>
                                  {point.accuracyMeters !== null ? `Accuracy ${point.accuracyMeters.toFixed(0)}m` : "Accuracy unavailable"}
                                </span>
                              </div>
                            </TrackingLink>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No tracked routes for this date" message="Location updates will appear here after employees check in and keep the portal open during their shift." />
                )
              ) : (
                <EmptyState title="Tracking add-on is off" message="This is a separate optional feature. Turn on TRACKING_FEATURE_ENABLED in the backend when you want to offer on-duty live movement tracking." />
              )}
            </section>
          ) : null}

          {activeTab === "branches" ? (
            <BranchManagement
              session={session}
              branches={branches}
              dashboard={dashboard}
              onReload={loadAdminData}
              subscription={subscription}
              onUpgradePlan={() => setActiveTab("subscription")}
            />
          ) : null}
        </section>
      </div>

      {previewImage ? (
        <div className="image-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="ghost-button image-modal-close" onClick={() => setPreviewImage(null)} type="button">
              Close
            </button>
            <strong>{previewImage.label}</strong>
            <span className="muted">{previewImage.employeeName}</span>
            <span className="muted">{formatDateTime(previewImage.time)}</span>
            <img alt="Attendance evidence preview" src={previewImage.image} />
          </div>
        </div>
      ) : null}

      <FloatingTabDock
        activeTab={activeTab}
        ariaLabel="Admin workspace tabs"
        items={adminTabs}
        onSelect={(tab) => {
          setActiveTab(tab);
          setDrawerOpen(false);
        }}
      />
    </main>
  );
}
