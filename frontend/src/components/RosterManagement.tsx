import { useEffect, useMemo, useState } from "react";
import { API_BASE, apiFetch, apiFetchVoid } from "../lib/api";
import type {
  Branch,
  Employee,
  RosterAssignment,
  RosterConflict,
  RosterExceptionReport,
  RosterMonthlyView,
  RosterPublishResponse,
  RosterShift,
  RosterSwapRequest,
  RosterTemplate,
  Session
} from "../types";
import { EmptyState } from "./shared";

type ShiftFormState = {
  branchId: string;
  code: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  workMinutes: string;
  breakMinutes: string;
  requiredHeadcount: string;
  colorHex: string;
  active: boolean;
};

type TemplateFormState = {
  branchId: string;
  name: string;
  industryType: string;
  rotationType: string;
  weeklyOffMode: string;
  weeklyOffDays: string[];
  shiftIds: string[];
  maxConsecutiveNightShifts: string;
  minRestHours: string;
  holidayPolicy: string;
  description: string;
  active: boolean;
};

type AssignmentFormState = {
  employeeId: string;
  shiftId: string;
  assignmentDate: string;
  assignmentType: string;
  notes: string;
};

type RosterWorkspaceTab = "setup" | "templates" | "planning" | "calendar" | "exceptions";
type PlanningTab = "operations" | "assignment" | "conflicts";
type ExceptionTab = "swaps" | "attendance";

const weekdayOptions = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const industryOptions = ["HOSPITAL", "HOTEL", "FACTORY", "SCHOOL", "RETAIL", "SECURITY", "PETROL_PUMP", "OFFICE", "PHARMACY", "GYM"];
const rotationOptions = ["FIXED", "WEEKLY_ROTATING", "MONTHLY_ROTATING", "SPLIT_SHIFT", "ON_CALL", "FLEXI", "SEASONAL", "PART_TIME", "FULL_24X7"];
const holidayPolicyOptions = ["COMP_OFF_OR_PREMIUM", "OFF_IF_POSSIBLE", "WORKING_PREMIUM_PAY", "SITE_POLICY"];
const assignmentTypeOptions = ["WORKING", "HOLIDAY_WORK", "OVERRIDE"];
const rosterTabs: Array<{ id: RosterWorkspaceTab; label: string; description: string }> = [
  { id: "setup", label: "Shift setup", description: "Branch policy and shifts" },
  { id: "templates", label: "Templates", description: "Reusable roster patterns" },
  { id: "planning", label: "Planning", description: "Generate, assign, conflicts" },
  { id: "calendar", label: "Calendar", description: "Month grid view" },
  { id: "exceptions", label: "Exceptions", description: "Swaps and attendance gaps" }
];

function buildEmptyShiftForm(branches: Branch[]): ShiftFormState {
  return {
    branchId: branches[0]?.id ?? "",
    code: "",
    name: "",
    description: "",
    startTime: "09:00",
    endTime: "18:00",
    workMinutes: "480",
    breakMinutes: "60",
    requiredHeadcount: "1",
    colorHex: "#2563EB",
    active: true
  };
}

function buildEmptyTemplateForm(branches: Branch[]): TemplateFormState {
  return {
    branchId: branches[0]?.id ?? "",
    name: "",
    industryType: "OFFICE",
    rotationType: "FIXED",
    weeklyOffMode: "FIXED",
    weeklyOffDays: ["SUNDAY"],
    shiftIds: [],
    maxConsecutiveNightShifts: "2",
    minRestHours: "10",
    holidayPolicy: "COMP_OFF_OR_PREMIUM",
    description: "",
    active: true
  };
}

function monthToday() {
  return new Date().toISOString().slice(0, 7);
}

function dateToday() {
  return new Date().toISOString().slice(0, 10);
}

function buildEmptyAssignmentForm(month: string): AssignmentFormState {
  return {
    employeeId: "",
    shiftId: "",
    assignmentDate: `${month}-01`,
    assignmentType: "WORKING",
    notes: ""
  };
}

export function RosterManagement({
  session,
  branches
}: {
  session: Session;
  branches: Branch[];
}) {
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [templates, setTemplates] = useState<RosterTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(() => buildEmptyShiftForm(branches));
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(() => buildEmptyTemplateForm(branches));
  const [savingShift, setSavingShift] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [operationBranchId, setOperationBranchId] = useState(branches[0]?.id ?? "");
  const [operationMonth, setOperationMonth] = useState(monthToday());
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [monthlyView, setMonthlyView] = useState<RosterMonthlyView | null>(null);
  const [conflicts, setConflicts] = useState<RosterConflict[]>([]);
  const [swapRequests, setSwapRequests] = useState<RosterSwapRequest[]>([]);
  const [exceptionDate, setExceptionDate] = useState(dateToday());
  const [exceptionReport, setExceptionReport] = useState<RosterExceptionReport | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(() => buildEmptyAssignmentForm(monthToday()));
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<RosterWorkspaceTab>("planning");
  const [activePlanningTab, setActivePlanningTab] = useState<PlanningTab>("operations");
  const [activeExceptionTab, setActiveExceptionTab] = useState<ExceptionTab>("swaps");

  useEffect(() => {
    setShiftForm((current) => current.branchId ? current : buildEmptyShiftForm(branches));
    setTemplateForm((current) => current.branchId ? current : buildEmptyTemplateForm(branches));
    setOperationBranchId((current) => current || branches[0]?.id || "");
  }, [branches]);

  async function loadBaseData() {
    setLoading(true);
    try {
      const [shiftData, templateData, employeeData] = await Promise.all([
        apiFetch<RosterShift[]>(session, "/admin/roster/shifts"),
        apiFetch<RosterTemplate[]>(session, "/admin/roster/templates"),
        apiFetch<Employee[]>(session, "/admin/employees")
      ]);
      setShifts(shiftData);
      setTemplates(templateData);
      setEmployees(employeeData.filter((employee) => employee.status !== "REMOVED"));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load roster settings.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyView(branchId = operationBranchId, month = operationMonth) {
    if (!branchId || !month) {
      setMonthlyView(null);
      setConflicts([]);
      return;
    }
    try {
      const [monthData, conflictData, swapData] = await Promise.all([
        apiFetch<RosterMonthlyView>(session, `/admin/roster/monthly-view?branchId=${encodeURIComponent(branchId)}&month=${encodeURIComponent(month)}`),
        apiFetch<RosterConflict[]>(session, `/admin/roster/conflicts?branchId=${encodeURIComponent(branchId)}&month=${encodeURIComponent(month)}`),
        apiFetch<RosterSwapRequest[]>(session, "/admin/roster/swap-requests")
      ]);
      setMonthlyView(monthData);
      setConflicts(conflictData);
      setSwapRequests(swapData);
      setAssignmentForm((current) => ({
        ...current,
        assignmentDate: current.assignmentDate.startsWith(month) ? current.assignmentDate : `${month}-01`
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load monthly roster.");
      setMonthlyView(null);
      setConflicts([]);
    }
  }

  async function loadExceptionReport(branchId = operationBranchId, date = exceptionDate) {
    if (!branchId || !date) {
      setExceptionReport(null);
      return;
    }
    try {
      const report = await apiFetch<RosterExceptionReport>(
        session,
        `/admin/roster/exceptions?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`
      );
      setExceptionReport(report);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load roster exception report.");
      setExceptionReport(null);
    }
  }

  useEffect(() => {
    void loadBaseData();
  }, [session]);

  useEffect(() => {
    if (!loading && operationBranchId) {
      void loadMonthlyView();
      void loadExceptionReport();
    }
  }, [loading, operationBranchId, operationMonth]);

  useEffect(() => {
    if (!loading && operationBranchId && exceptionDate) {
      void loadExceptionReport();
    }
  }, [exceptionDate]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === shiftForm.branchId) ?? branches[0] ?? null,
    [branches, shiftForm.branchId]
  );
  const operationBranch = useMemo(
    () => branches.find((branch) => branch.id === operationBranchId) ?? branches[0] ?? null,
    [branches, operationBranchId]
  );
  const operationBranchTemplates = useMemo(
    () => templates.filter((template) => !template.branchId || template.branchId === operationBranchId),
    [templates, operationBranchId]
  );
  const operationBranchShifts = useMemo(
    () => shifts.filter((shift) => shift.branchId === operationBranchId),
    [shifts, operationBranchId]
  );
  const operationBranchEmployees = useMemo(
    () => employees.filter((employee) => employee.branchId === operationBranchId),
    [employees, operationBranchId]
  );
  const assignmentByEmployeeDate = useMemo(() => {
    const map = new Map<string, RosterAssignment>();
    monthlyView?.employees.forEach((employee) => {
      employee.assignments.forEach((assignment) => {
        map.set(`${employee.employeeId}:${assignment.assignmentDate}`, assignment);
      });
    });
    return map;
  }, [monthlyView]);

  function resetShiftForm() {
    setEditingShiftId(null);
    setShiftForm(buildEmptyShiftForm(branches));
  }

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateForm(buildEmptyTemplateForm(branches));
  }

  function resetAssignmentForm() {
    setEditingAssignmentId(null);
    setAssignmentForm(buildEmptyAssignmentForm(operationMonth));
  }

  async function submitShift(event: React.FormEvent) {
    event.preventDefault();
    setSavingShift(true);
    setStatusMessage("");
    try {
      await apiFetch<RosterShift>(
        session,
        editingShiftId ? `/admin/roster/shifts/${editingShiftId}` : "/admin/roster/shifts",
        {
          method: editingShiftId ? "PUT" : "POST",
          body: JSON.stringify({
            ...shiftForm,
            workMinutes: Number(shiftForm.workMinutes),
            breakMinutes: Number(shiftForm.breakMinutes),
            requiredHeadcount: Number(shiftForm.requiredHeadcount)
          })
        }
      );
      setStatusMessage(editingShiftId ? "Shift updated successfully." : "Shift created successfully.");
      resetShiftForm();
      await loadBaseData();
      await loadMonthlyView();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save shift.");
    } finally {
      setSavingShift(false);
    }
  }

  async function submitTemplate(event: React.FormEvent) {
    event.preventDefault();
    setSavingTemplate(true);
    setStatusMessage("");
    try {
      await apiFetch<RosterTemplate>(
        session,
        editingTemplateId ? `/admin/roster/templates/${editingTemplateId}` : "/admin/roster/templates",
        {
          method: editingTemplateId ? "PUT" : "POST",
          body: JSON.stringify({
            ...templateForm,
            branchId: templateForm.branchId || null,
            maxConsecutiveNightShifts: Number(templateForm.maxConsecutiveNightShifts),
            minRestHours: Number(templateForm.minRestHours)
          })
        }
      );
      setStatusMessage(editingTemplateId ? "Template updated successfully." : "Template created successfully.");
      resetTemplateForm();
      await loadBaseData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function submitAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!assignmentForm.employeeId || !assignmentForm.shiftId || !assignmentForm.assignmentDate) {
      setStatusMessage("Select employee, shift, and date to save the assignment.");
      return;
    }
    setBusyAction("assignment");
    setStatusMessage("");
    try {
      await apiFetch<RosterAssignment>(
        session,
        editingAssignmentId ? `/admin/roster/assignments/${editingAssignmentId}` : "/admin/roster/assignments",
        {
          method: editingAssignmentId ? "PUT" : "POST",
          body: JSON.stringify(assignmentForm)
        }
      );
      setStatusMessage(editingAssignmentId ? "Assignment updated successfully." : "Assignment saved successfully.");
      resetAssignmentForm();
      await loadMonthlyView();
      await loadExceptionReport();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save roster assignment.");
    } finally {
      setBusyAction(null);
    }
  }

  function startShiftEdit(shift: RosterShift) {
    setEditingShiftId(shift.id);
    setShiftForm({
      branchId: shift.branchId,
      code: shift.code,
      name: shift.name,
      description: shift.description ?? "",
      startTime: shift.startTime,
      endTime: shift.endTime,
      workMinutes: String(shift.workMinutes),
      breakMinutes: String(shift.breakMinutes),
      requiredHeadcount: String(shift.requiredHeadcount),
      colorHex: shift.colorHex,
      active: shift.active
    });
  }

  function startTemplateEdit(template: RosterTemplate) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      branchId: template.branchId ?? "",
      name: template.name,
      industryType: template.industryType,
      rotationType: template.rotationType,
      weeklyOffMode: template.weeklyOffMode,
      weeklyOffDays: template.weeklyOffDays,
      shiftIds: template.shiftIds,
      maxConsecutiveNightShifts: String(template.maxConsecutiveNightShifts),
      minRestHours: String(template.minRestHours),
      holidayPolicy: template.holidayPolicy,
      description: template.description ?? "",
      active: template.active
    });
  }

  function startAssignmentEdit(assignment: RosterAssignment) {
    setEditingAssignmentId(assignment.id);
    setAssignmentForm({
      employeeId: assignment.employeeId,
      shiftId: assignment.shiftId,
      assignmentDate: assignment.assignmentDate,
      assignmentType: assignment.assignmentType,
      notes: assignment.notes ?? ""
    });
  }

  async function removeShift(shiftId: string) {
    if (!window.confirm("Delete this roster shift?")) {
      return;
    }
    try {
      await apiFetchVoid(session, `/admin/roster/shifts/${shiftId}`, { method: "DELETE" });
      setStatusMessage("Shift deleted successfully.");
      if (editingShiftId === shiftId) {
        resetShiftForm();
      }
      await loadBaseData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete shift.");
    }
  }

  async function removeTemplate(templateId: string) {
    if (!window.confirm("Delete this roster template?")) {
      return;
    }
    try {
      await apiFetchVoid(session, `/admin/roster/templates/${templateId}`, { method: "DELETE" });
      setStatusMessage("Template deleted successfully.");
      if (editingTemplateId === templateId) {
        resetTemplateForm();
      }
      await loadBaseData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete template.");
    }
  }

  async function removeAssignment(assignmentId: string) {
    if (!window.confirm("Delete this roster assignment?")) {
      return;
    }
    try {
      await apiFetchVoid(session, `/admin/roster/assignments/${assignmentId}`, { method: "DELETE" });
      setStatusMessage("Assignment deleted successfully.");
      if (editingAssignmentId === assignmentId) {
        resetAssignmentForm();
      }
      await loadMonthlyView();
      await loadExceptionReport();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete assignment.");
    }
  }

  async function generateRoster() {
    if (!operationBranchId || !selectedTemplateId) {
      setStatusMessage("Select both branch and template before generating the monthly roster.");
      return;
    }
    setBusyAction("generate");
    setStatusMessage("");
    try {
      const response = await apiFetch<RosterMonthlyView>(session, "/admin/roster/generate-monthly", {
        method: "POST",
        body: JSON.stringify({
          branchId: operationBranchId,
          templateId: selectedTemplateId,
          month: operationMonth
        })
      });
      setMonthlyView(response);
      setConflicts(response.conflicts);
      setStatusMessage("Monthly roster generated successfully.");
      await loadExceptionReport();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to generate monthly roster.");
    } finally {
      setBusyAction(null);
    }
  }

  async function publishRoster() {
    if (!operationBranchId || !operationMonth) {
      return;
    }
    setBusyAction("publish");
    setStatusMessage("");
    try {
      const response = await apiFetch<RosterPublishResponse>(session, "/admin/roster/publish", {
        method: "POST",
        body: JSON.stringify({
          branchId: operationBranchId,
          month: operationMonth,
          notifyChannels: ["WHATSAPP", "IN_APP"]
        })
      });
      setStatusMessage(response.message);
      await loadMonthlyView();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to publish monthly roster.");
    } finally {
      setBusyAction(null);
    }
  }

  async function decideSwap(swapRequestId: string, decision: "APPROVED" | "REJECTED") {
    setBusyAction(`swap-${swapRequestId}`);
    setStatusMessage("");
    try {
      await apiFetch<RosterSwapRequest>(session, `/admin/roster/swap-requests/${swapRequestId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reviewNote: decision === "REJECTED" ? "Manager rejected this shift swap request." : "Approved by manager."
        })
      });
      setStatusMessage(`Shift swap ${decision.toLowerCase()} successfully.`);
      await loadMonthlyView();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to review shift swap request.");
    } finally {
      setBusyAction(null);
    }
  }

  async function exportRoster() {
    if (!operationBranchId || !operationMonth) {
      return;
    }
    setBusyAction("export");
    try {
      const response = await fetch(
        `${API_BASE}/admin/roster/export?branchId=${encodeURIComponent(operationBranchId)}&month=${encodeURIComponent(operationMonth)}`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        }
      );
      if (!response.ok) {
        throw new Error("Unable to export roster right now.");
      }
      const csvText = await response.text();
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `peeplify-roster-${operationMonth}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      setStatusMessage("Roster export downloaded successfully.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to export roster.");
    } finally {
      setBusyAction(null);
    }
  }

  function toggleTemplateDay(day: string) {
    setTemplateForm((current) => ({
      ...current,
      weeklyOffDays: current.weeklyOffDays.includes(day)
        ? current.weeklyOffDays.filter((entry) => entry !== day)
        : [...current.weeklyOffDays, day]
    }));
  }

  function toggleTemplateShift(shiftId: string) {
    setTemplateForm((current) => ({
      ...current,
      shiftIds: current.shiftIds.includes(shiftId)
        ? current.shiftIds.filter((entry) => entry !== shiftId)
        : [...current.shiftIds, shiftId]
    }));
  }

  if (loading) {
    return <section className="panel"><p className="muted">Loading roster settings...</p></section>;
  }

  return (
    <div className="admin-page-sections roster-workspace">
      <section className="panel roster-workspace-header">
        <div className="topbar roster-workspace-topbar">
          <div>
            <h3>Roster workspace</h3>
            <p className="muted section-intro">Use smaller sections below to manage shifts, templates, planning, the monthly calendar, and live exceptions.</p>
          </div>
          <span className="pill">{rosterTabs.find((tab) => tab.id === activeWorkspaceTab)?.label}</span>
        </div>
        <div className="info-card roster-desktop-note">
          <strong>Best viewed on desktop</strong>
          <span>Roster works on mobile too, but the full calendar and planning experience is easier to manage on a laptop or desktop screen.</span>
        </div>
        <div className="roster-tab-strip" role="tablist" aria-label="Roster sections">
          {rosterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeWorkspaceTab === tab.id}
              className={`roster-tab-button ${activeWorkspaceTab === tab.id ? "roster-tab-button-active" : ""}`}
              onClick={() => setActiveWorkspaceTab(tab.id)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </button>
          ))}
        </div>
      </section>

      {activeWorkspaceTab === "setup" ? (
        <>
          <section className="grid two-column branch-management-grid">
            <article className="panel">
              <div className="topbar">
                <div>
                  <h3>{editingShiftId ? "Edit roster shift" : "Create roster shift"}</h3>
                  <p className="muted section-intro">Define reusable shift blocks for your branches before building templates and monthly rosters.</p>
                </div>
                {editingShiftId ? <button className="ghost-button" onClick={resetShiftForm} type="button">Cancel edit</button> : null}
              </div>
              <form className="admin-form-grid" onSubmit={submitShift}>
                <div className="grid three-column compact-grid">
                  <label>
                    Branch
                    <select value={shiftForm.branchId} onChange={(event) => setShiftForm((current) => ({ ...current, branchId: event.target.value }))}>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Shift code
                    <input required value={shiftForm.code} onChange={(event) => setShiftForm((current) => ({ ...current, code: event.target.value }))} placeholder="MORN" />
                  </label>
                  <label>
                    Shift name
                    <input required value={shiftForm.name} onChange={(event) => setShiftForm((current) => ({ ...current, name: event.target.value }))} placeholder="Morning Care" />
                  </label>
                </div>
                <label>
                  Description
                  <input value={shiftForm.description} onChange={(event) => setShiftForm((current) => ({ ...current, description: event.target.value }))} placeholder="General first shift for morning operations" />
                </label>
                <div className="grid compact-grid branch-policy-grid">
                  <label>
                    Start
                    <input type="time" required value={shiftForm.startTime} onChange={(event) => setShiftForm((current) => ({ ...current, startTime: event.target.value }))} />
                  </label>
                  <label>
                    End
                    <input type="time" required value={shiftForm.endTime} onChange={(event) => setShiftForm((current) => ({ ...current, endTime: event.target.value }))} />
                  </label>
                  <label>
                    Work minutes
                    <input type="number" min="1" max="1440" required value={shiftForm.workMinutes} onChange={(event) => setShiftForm((current) => ({ ...current, workMinutes: event.target.value }))} />
                  </label>
                  <label>
                    Break minutes
                    <input type="number" min="0" max="360" required value={shiftForm.breakMinutes} onChange={(event) => setShiftForm((current) => ({ ...current, breakMinutes: event.target.value }))} />
                  </label>
                  <label>
                    Minimum staff
                    <input type="number" min="1" max="1000" required value={shiftForm.requiredHeadcount} onChange={(event) => setShiftForm((current) => ({ ...current, requiredHeadcount: event.target.value }))} />
                  </label>
                  <label>
                    Color
                    <input type="color" value={shiftForm.colorHex} onChange={(event) => setShiftForm((current) => ({ ...current, colorHex: event.target.value }))} />
                  </label>
                </div>
                <label className="checkbox-field">
                  <input type="checkbox" checked={shiftForm.active} onChange={(event) => setShiftForm((current) => ({ ...current, active: event.target.checked }))} />
                  Active shift
                </label>
                <div className="action-row">
                  <button className="primary-button" disabled={savingShift} type="submit">
                    {savingShift ? "Saving..." : editingShiftId ? "Update shift" : "Create shift"}
                  </button>
                </div>
              </form>
            </article>

            <article className="panel">
              <h3>Branch roster policy</h3>
              <p className="muted section-intro">Weekly off is controlled by the owner in branch settings and is reused while building templates.</p>
              {selectedBranch ? (
                <article className="attendance-card">
                  <div className="attendance-card-header">
                    <strong>{selectedBranch.name}</strong>
                    <span className="pill">{selectedBranch.weeklyOffMode}</span>
                  </div>
                  <div className="attendance-card-grid">
                    <span>Weekly off</span>
                    <strong>{selectedBranch.weeklyOffDays.join(", ")}</strong>
                    <span>Shift policy</span>
                    <strong>{selectedBranch.shiftStartTime} - {selectedBranch.shiftEndTime}</strong>
                    <span>Workday rule</span>
                    <strong>{selectedBranch.halfDayHours}h half day / {selectedBranch.fullDayHours}h full day</strong>
                  </div>
                </article>
              ) : (
                <EmptyState title="No branches yet" message="Create a branch first to define weekly off and shift policy." />
              )}
            </article>
          </section>

          <section className="panel">
            <h3>Configured shifts</h3>
            <p className="muted section-intro">Every shift created here becomes reusable across templates and future monthly roster generation.</p>
            {shifts.length ? (
              <div className="table-scroll">
                <table className="data-table desktop-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Shift</th>
                      <th>Timing</th>
                      <th>Work / Break</th>
                      <th>Min staff</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr key={shift.id}>
                        <td>{shift.branchName}</td>
                        <td><strong>{shift.name}</strong><br /><span className="muted">{shift.code}</span></td>
                        <td>{shift.startTime} - {shift.endTime}{shift.crossesMidnight ? " (overnight)" : ""}</td>
                        <td>{shift.workMinutes}m / {shift.breakMinutes}m</td>
                        <td>{shift.requiredHeadcount}</td>
                        <td>{shift.active ? "Active" : "Inactive"}</td>
                        <td className="table-action-row">
                          <button className="ghost-button compact-button" onClick={() => startShiftEdit(shift)} type="button">Edit</button>
                          <button className="ghost-button compact-button danger-button" onClick={() => void removeShift(shift.id)} type="button">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No roster shifts yet" message="Create your first shift to start setting up rosters." />
            )}
          </section>
        </>
      ) : null}

      {activeWorkspaceTab === "templates" ? (
        <section className="grid two-column branch-management-grid">
          <article className="panel">
            <div className="topbar">
              <div>
                <h3>{editingTemplateId ? "Edit roster template" : "Create roster template"}</h3>
                <p className="muted section-intro">Templates combine branch policy, weekly off logic, selected shifts, and staffing safety rules.</p>
              </div>
              {editingTemplateId ? <button className="ghost-button" onClick={resetTemplateForm} type="button">Cancel edit</button> : null}
            </div>
            <form className="admin-form-grid" onSubmit={submitTemplate}>
              <div className="grid two-column compact-grid">
                <label>
                  Template name
                  <input required value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Small Hospital Weekly Rotation" />
                </label>
                <label>
                  Branch
                  <select value={templateForm.branchId} onChange={(event) => setTemplateForm((current) => ({ ...current, branchId: event.target.value }))}>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid three-column compact-grid">
                <label>
                  Industry
                  <select value={templateForm.industryType} onChange={(event) => setTemplateForm((current) => ({ ...current, industryType: event.target.value }))}>
                    {industryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label>
                  Rotation type
                  <select value={templateForm.rotationType} onChange={(event) => setTemplateForm((current) => ({ ...current, rotationType: event.target.value }))}>
                    {rotationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label>
                  Holiday policy
                  <select value={templateForm.holidayPolicy} onChange={(event) => setTemplateForm((current) => ({ ...current, holidayPolicy: event.target.value }))}>
                    {holidayPolicyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid compact-grid branch-policy-grid">
                <label>
                  Weekly off mode
                  <select value={templateForm.weeklyOffMode} onChange={(event) => setTemplateForm((current) => ({ ...current, weeklyOffMode: event.target.value }))}>
                    <option value="FIXED">Fixed</option>
                    <option value="ROTATIONAL">Rotational</option>
                  </select>
                </label>
                <label>
                  Max consecutive nights
                  <input type="number" min="1" max="14" required value={templateForm.maxConsecutiveNightShifts} onChange={(event) => setTemplateForm((current) => ({ ...current, maxConsecutiveNightShifts: event.target.value }))} />
                </label>
                <label>
                  Minimum rest hours
                  <input type="number" min="1" max="24" required value={templateForm.minRestHours} onChange={(event) => setTemplateForm((current) => ({ ...current, minRestHours: event.target.value }))} />
                </label>
              </div>
              <div className="selection-chip-group">
                <strong>Weekly off days</strong>
                <div className="selection-chip-list">
                  {weekdayOptions.map((day) => (
                    <button
                      key={day}
                      className={`selection-chip ${templateForm.weeklyOffDays.includes(day) ? "selection-chip-active" : ""}`}
                      onClick={() => toggleTemplateDay(day)}
                      type="button"
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="selection-chip-group">
                <strong>Attach shifts</strong>
                <div className="selection-chip-list">
                  {shifts.filter((shift) => !templateForm.branchId || shift.branchId === templateForm.branchId).map((shift) => (
                    <button
                      key={shift.id}
                      className={`selection-chip ${templateForm.shiftIds.includes(shift.id) ? "selection-chip-active" : ""}`}
                      onClick={() => toggleTemplateShift(shift.id)}
                      type="button"
                    >
                      {shift.code} · {shift.name}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                Description
                <textarea rows={3} value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Use this for hospitals, retail, office, or any branch-specific weekly pattern." />
              </label>
              <label className="checkbox-field">
                <input type="checkbox" checked={templateForm.active} onChange={(event) => setTemplateForm((current) => ({ ...current, active: event.target.checked }))} />
                Active template
              </label>
              <div className="action-row">
                <button className="primary-button" disabled={savingTemplate || templateForm.shiftIds.length === 0 || templateForm.weeklyOffDays.length === 0} type="submit">
                  {savingTemplate ? "Saving..." : editingTemplateId ? "Update template" : "Create template"}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <h3>Saved templates</h3>
            <p className="muted section-intro">These templates are ready for future monthly generation and manual assignment flows.</p>
            {templates.length ? (
              <div className="attendance-card-list branch-card-list roster-template-list">
                {templates.map((template) => (
                  <article className="attendance-card" key={template.id}>
                    <div className="attendance-card-header">
                      <strong>{template.name}</strong>
                      <span className="pill">{template.industryType}</span>
                    </div>
                    <div className="attendance-card-grid">
                      <span>Branch</span>
                      <strong>{template.branchName}</strong>
                      <span>Rotation</span>
                      <strong>{template.rotationType}</strong>
                      <span>Weekly off</span>
                      <strong>{template.weeklyOffDays.join(", ")}</strong>
                      <span>Safety rule</span>
                      <strong>{template.maxConsecutiveNightShifts} nights max / {template.minRestHours}h rest</strong>
                      <span>Shifts</span>
                      <strong>{template.shiftLabels.length ? template.shiftLabels.join(" | ") : "No shifts selected"}</strong>
                    </div>
                    <div className="table-action-row card-action-row">
                      <button className="ghost-button compact-button" onClick={() => startTemplateEdit(template)} type="button">Edit</button>
                      <button className="ghost-button compact-button danger-button" onClick={() => void removeTemplate(template.id)} type="button">Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No roster templates yet" message="Create your first template so branch schedules are reusable across months." />
            )}
          </article>
        </section>
      ) : null}

      {activeWorkspaceTab === "planning" ? (
        <>
          <section className="panel">
            <div className="topbar">
              <div>
                <h3>Planning workspace</h3>
                <p className="muted section-intro">Switch between operations, manual assignment, and conflicts so each task stays lightweight on smaller screens.</p>
              </div>
            </div>
            <div className="roster-subtab-strip" role="tablist" aria-label="Planning sections">
              <button
                type="button"
                role="tab"
                aria-selected={activePlanningTab === "operations"}
                className={`roster-subtab-button ${activePlanningTab === "operations" ? "roster-subtab-button-active" : ""}`}
                onClick={() => setActivePlanningTab("operations")}
              >
                Monthly ops
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePlanningTab === "assignment"}
                className={`roster-subtab-button ${activePlanningTab === "assignment" ? "roster-subtab-button-active" : ""}`}
                onClick={() => setActivePlanningTab("assignment")}
              >
                Assignment
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePlanningTab === "conflicts"}
                className={`roster-subtab-button ${activePlanningTab === "conflicts" ? "roster-subtab-button-active" : ""}`}
                onClick={() => setActivePlanningTab("conflicts")}
              >
                Conflicts
              </button>
            </div>
          </section>

          {activePlanningTab === "operations" ? (
            <section className="panel">
              <div className="topbar">
                <div>
                  <h3>Monthly roster operations</h3>
                  <p className="muted section-intro">Generate, review, publish, and export roster month by month for the selected branch.</p>
                </div>
              </div>
              <div className="grid three-column compact-grid">
                <label>
                  Branch
                  <select value={operationBranchId} onChange={(event) => setOperationBranchId(event.target.value)}>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <label>
                  Month
                  <input type="month" value={operationMonth} onChange={(event) => setOperationMonth(event.target.value)} />
                </label>
                <label>
                  Template
                  <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                    <option value="">Select template</option>
                    {operationBranchTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="table-action-row roster-action-stack">
                <button className="primary-button" onClick={() => void generateRoster()} type="button" disabled={busyAction === "generate" || !selectedTemplateId}>
                  {busyAction === "generate" ? "Generating..." : "Generate monthly roster"}
                </button>
                <button className="ghost-button" onClick={() => void loadMonthlyView()} type="button">Refresh month view</button>
                <button className="ghost-button" onClick={() => void publishRoster()} type="button" disabled={busyAction === "publish" || !monthlyView}>
                  {busyAction === "publish" ? "Publishing..." : "Publish roster"}
                </button>
                <button className="ghost-button" onClick={() => void exportRoster()} type="button" disabled={busyAction === "export" || !monthlyView}>
                  {busyAction === "export" ? "Exporting..." : "Export CSV"}
                </button>
              </div>
              {operationBranch ? (
                <div className="attendance-card-grid roster-summary-grid">
                  <span>Branch weekly off</span>
                  <strong>{operationBranch.weeklyOffMode} · {operationBranch.weeklyOffDays.join(", ")}</strong>
                  <span>Shifts configured</span>
                  <strong>{operationBranchShifts.length}</strong>
                  <span>Templates ready</span>
                  <strong>{operationBranchTemplates.length}</strong>
                </div>
              ) : null}
            </section>
          ) : null}

          {activePlanningTab === "assignment" ? (
            <section className="panel">
              <div className="topbar">
                <div>
                  <h3>{editingAssignmentId ? "Edit roster assignment" : "Manual roster assignment"}</h3>
                  <p className="muted section-intro">Override individual dates, add extra working days, or fix generated assignments before publishing.</p>
                </div>
                {editingAssignmentId ? <button className="ghost-button" onClick={resetAssignmentForm} type="button">Cancel edit</button> : null}
              </div>
              <form className="admin-form-grid" onSubmit={submitAssignment}>
                <div className="grid compact-grid branch-policy-grid">
                  <label>
                    Employee
                    <select value={assignmentForm.employeeId} onChange={(event) => setAssignmentForm((current) => ({ ...current, employeeId: event.target.value }))}>
                      <option value="">Select employee</option>
                      {operationBranchEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Shift
                    <select value={assignmentForm.shiftId} onChange={(event) => setAssignmentForm((current) => ({ ...current, shiftId: event.target.value }))}>
                      <option value="">Select shift</option>
                      {operationBranchShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.code} · {shift.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Date
                    <input type="date" value={assignmentForm.assignmentDate} onChange={(event) => setAssignmentForm((current) => ({ ...current, assignmentDate: event.target.value }))} />
                  </label>
                  <label>
                    Type
                    <select value={assignmentForm.assignmentType} onChange={(event) => setAssignmentForm((current) => ({ ...current, assignmentType: event.target.value }))}>
                      {assignmentTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  Notes
                  <input value={assignmentForm.notes} onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional manager note for this assignment" />
                </label>
                <div className="action-row roster-action-stack">
                  <button className="primary-button" type="submit" disabled={busyAction === "assignment"}>
                    {busyAction === "assignment" ? "Saving..." : editingAssignmentId ? "Update assignment" : "Save assignment"}
                  </button>
                  {editingAssignmentId ? (
                    <button className="ghost-button danger-button" type="button" onClick={() => void removeAssignment(editingAssignmentId)}>
                      Delete assignment
                    </button>
                  ) : null}
                </div>
              </form>
            </section>
          ) : null}

          {activePlanningTab === "conflicts" ? (
            <section className="panel">
              <h3>Conflict alerts</h3>
              <p className="muted section-intro">Live coverage and schedule warnings appear here before you publish the month.</p>
              {conflicts.length ? (
                <div className="attendance-card-list roster-mobile-card-list">
                  {conflicts.map((conflict, index) => (
                    <article key={`${conflict.type}-${conflict.assignmentDate}-${index}`} className="attendance-card">
                      <div className="attendance-card-header">
                        <strong>{conflict.type.replaceAll("_", " ")}</strong>
                        <span className={`pill ${conflict.severity === "HIGH" ? "pill-danger" : "pill-warning"}`}>{conflict.severity}</span>
                      </div>
                      <p className="muted">{conflict.assignmentDate}</p>
                      <p>{conflict.message}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No active conflicts" message="This month is currently free from double-booking and coverage warnings." />
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {activeWorkspaceTab === "calendar" ? (
        <section className="panel">
        <div className="topbar">
          <div>
            <h3>Monthly roster grid</h3>
            <p className="muted section-intro">Rows are employees, columns are dates, and each cell keeps the shift code saved for that day.</p>
          </div>
          <span className="pill">{monthlyView?.published ? "Published" : "Draft"}</span>
        </div>
        {monthlyView ? (
          <div className="table-scroll roster-grid-scroll">
            <table className="data-table roster-grid-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  {monthlyView.dates.map((date) => <th key={date}>{date.slice(8)}</th>)}
                </tr>
              </thead>
              <tbody>
                {monthlyView.employees.map((employee) => (
                  <tr key={employee.employeeId}>
                    <td>
                      <strong>{employee.employeeName}</strong>
                      <br />
                      <span className="muted">{employee.designation}</span>
                    </td>
                    {monthlyView.dates.map((date) => {
                      const assignment = assignmentByEmployeeDate.get(`${employee.employeeId}:${date}`);
                      return (
                        <td key={`${employee.employeeId}-${date}`}>
                          {assignment ? (
                            <button
                              type="button"
                              className="roster-cell-button"
                              style={{ borderColor: assignment.colorHex, background: `${assignment.colorHex}14`, color: assignment.colorHex }}
                              onClick={() => startAssignmentEdit(assignment)}
                              title={`${assignment.shiftName} · ${assignment.startTime}-${assignment.endTime}`}
                            >
                              {assignment.shiftCode}
                            </button>
                          ) : (
                            <span className="muted">OFF</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No roster loaded" message="Generate or refresh a monthly roster to see assignments here." />
        )}
        </section>
      ) : null}

      {activeWorkspaceTab === "exceptions" ? (
        <>
          <section className="panel">
            <div className="topbar">
              <div>
                <h3>Exceptions workspace</h3>
                <p className="muted section-intro">Switch between shift swap approvals and attendance exception review without loading both long sections together.</p>
              </div>
            </div>
            <div className="roster-subtab-strip" role="tablist" aria-label="Exception sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeExceptionTab === "swaps"}
                className={`roster-subtab-button ${activeExceptionTab === "swaps" ? "roster-subtab-button-active" : ""}`}
                onClick={() => setActiveExceptionTab("swaps")}
              >
                Swap requests
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeExceptionTab === "attendance"}
                className={`roster-subtab-button ${activeExceptionTab === "attendance" ? "roster-subtab-button-active" : ""}`}
                onClick={() => setActiveExceptionTab("attendance")}
              >
                Attendance gaps
              </button>
            </div>
          </section>

          {activeExceptionTab === "swaps" ? (
            <section className="panel">
              <div className="topbar">
                <div>
                  <h3>Shift swap requests</h3>
                  <p className="muted section-intro">Employees can request swaps, and managers can approve or reject them here before they affect published rosters.</p>
                </div>
              </div>
              {swapRequests.length ? (
                <div className="attendance-card-list roster-mobile-card-list">
                  {swapRequests.map((swap) => (
                    <article className="attendance-card" key={swap.id}>
                      <div className="attendance-card-header">
                        <strong>{swap.requesterEmployeeName} → {swap.targetEmployeeName}</strong>
                        <span className="pill">{swap.status}</span>
                      </div>
                      <div className="attendance-card-grid">
                        <span>Swap request</span>
                        <strong>{swap.requesterShiftName} ({swap.requesterAssignmentDate}) ↔ {swap.targetShiftName} ({swap.targetAssignmentDate})</strong>
                        <span>Reason</span>
                        <strong>{swap.reason}</strong>
                      </div>
                      {swap.status === "PENDING" ? (
                        <div className="table-action-row card-action-row roster-action-stack">
                          <button className="primary-button compact-button" onClick={() => void decideSwap(swap.id, "APPROVED")} type="button" disabled={busyAction === `swap-${swap.id}`}>Approve</button>
                          <button className="ghost-button compact-button danger-button" onClick={() => void decideSwap(swap.id, "REJECTED")} type="button" disabled={busyAction === `swap-${swap.id}`}>Reject</button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No swap requests" message="Pending employee shift swap requests will appear here." />
              )}
            </section>
          ) : null}

          {activeExceptionTab === "attendance" ? (
            <section className="panel">
              <div className="topbar">
                <div>
                  <h3>Attendance exceptions</h3>
                  <p className="muted section-intro">Compare scheduled roster timing with actual attendance for one date to spot lateness, overtime, early departure, and absence.</p>
                </div>
              </div>
              <label>
                Exception date
                <input type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} />
              </label>
              {exceptionReport?.rows.length ? (
                <div className="table-scroll">
                  <table className="data-table desktop-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Shift</th>
                        <th>Scheduled</th>
                        <th>Actual</th>
                        <th>Late</th>
                        <th>Early</th>
                        <th>OT</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exceptionReport.rows.map((row) => (
                        <tr key={row.employeeId}>
                          <td>{row.employeeName}</td>
                          <td>{row.scheduledShiftName ?? "OFF"}</td>
                          <td>{row.scheduledStartTime && row.scheduledEndTime ? `${row.scheduledStartTime} - ${row.scheduledEndTime}` : "-"}</td>
                          <td>{row.actualCheckInTime ? `${row.actualCheckInTime}${row.actualCheckOutTime ? ` - ${row.actualCheckOutTime}` : ""}` : "-"}</td>
                          <td>{row.lateMinutes}m</td>
                          <td>{row.earlyDepartureMinutes}m</td>
                          <td>{row.overtimeMinutes}m</td>
                          <td>{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No exception data yet" message="Pick a date after roster and attendance activity to review exceptions." />
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {statusMessage ? (
        <section className="panel">
          <p className={statusMessage.toLowerCase().includes("success") || statusMessage.toLowerCase().includes("published") ? "status-text" : "error-text"}>
            {statusMessage}
          </p>
        </section>
      ) : null}
    </div>
  );
}
