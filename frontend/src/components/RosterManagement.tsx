import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiFetchVoid } from "../lib/api";
import type { Branch, RosterShift, RosterTemplate, Session } from "../types";
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

const weekdayOptions = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const industryOptions = ["HOSPITAL", "HOTEL", "FACTORY", "SCHOOL", "RETAIL", "SECURITY", "PETROL_PUMP", "OFFICE", "PHARMACY", "GYM"];
const rotationOptions = ["FIXED", "WEEKLY_ROTATING", "MONTHLY_ROTATING", "SPLIT_SHIFT", "ON_CALL", "FLEXI", "SEASONAL", "PART_TIME", "FULL_24X7"];
const holidayPolicyOptions = ["COMP_OFF_OR_PREMIUM", "OFF_IF_POSSIBLE", "WORKING_PREMIUM_PAY", "SITE_POLICY"];

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

export function RosterManagement({
  session,
  branches
}: {
  session: Session;
  branches: Branch[];
}) {
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [templates, setTemplates] = useState<RosterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(() => buildEmptyShiftForm(branches));
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(() => buildEmptyTemplateForm(branches));
  const [savingShift, setSavingShift] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    setShiftForm((current) => current.branchId ? current : buildEmptyShiftForm(branches));
    setTemplateForm((current) => current.branchId ? current : buildEmptyTemplateForm(branches));
  }, [branches]);

  async function loadRosterData() {
    setLoading(true);
    try {
      const [shiftData, templateData] = await Promise.all([
        apiFetch<RosterShift[]>(session, "/admin/roster/shifts"),
        apiFetch<RosterTemplate[]>(session, "/admin/roster/templates")
      ]);
      setShifts(shiftData);
      setTemplates(templateData);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load roster settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRosterData();
  }, [session]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === shiftForm.branchId) ?? branches[0] ?? null,
    [branches, shiftForm.branchId]
  );

  function resetShiftForm() {
    setEditingShiftId(null);
    setShiftForm(buildEmptyShiftForm(branches));
  }

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateForm(buildEmptyTemplateForm(branches));
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
      await loadRosterData();
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
      await loadRosterData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save template.");
    } finally {
      setSavingTemplate(false);
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
      await loadRosterData();
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
      await loadRosterData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete template.");
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
    <div className="admin-page-sections">
      <section className="grid two-column branch-management-grid">
        <article className="panel">
          <div className="topbar">
            <div>
              <h3>{editingShiftId ? "Edit roster shift" : "Create roster shift"}</h3>
              <p className="muted section-intro">Define reusable shift blocks for your branches before building templates and monthly rosters.</p>
            </div>
            {editingShiftId ? (
              <button className="ghost-button" onClick={resetShiftForm} type="button">Cancel edit</button>
            ) : null}
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
        ) : (
          <EmptyState title="No roster shifts yet" message="Create your first shift to start setting up rosters." />
        )}
      </section>

      <section className="grid two-column branch-management-grid">
        <article className="panel">
          <div className="topbar">
            <div>
              <h3>{editingTemplateId ? "Edit roster template" : "Create roster template"}</h3>
              <p className="muted section-intro">Templates combine branch policy, weekly off logic, selected shifts, and staffing safety rules.</p>
            </div>
            {editingTemplateId ? (
              <button className="ghost-button" onClick={resetTemplateForm} type="button">Cancel edit</button>
            ) : null}
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

      {statusMessage ? (
        <section className="panel">
          <p className={statusMessage.includes("successfully") ? "status-text" : "error-text"}>{statusMessage}</p>
        </section>
      ) : null}
    </div>
  );
}
