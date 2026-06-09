import { useState } from "react";
import { apiFetch } from "../lib/api";
import type { Branch, Dashboard, Session } from "../types";
import { EmptyState } from "./shared";

type BranchFormState = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: string;
  halfDayHours: string;
  fullDayHours: string;
};

function buildEmptyBranchForm(): BranchFormState {
  return {
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radiusMeters: "50",
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    graceMinutes: "15",
    halfDayHours: "4",
    fullDayHours: "8"
  };
}

export function BranchManagement({
  session,
  branches,
  dashboard,
  onReload
}: {
  session: Session;
  branches: Branch[];
  dashboard: Dashboard;
  onReload: () => Promise<void>;
}) {
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState<BranchFormState>(buildEmptyBranchForm);
  const [branchSaving, setBranchSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  function updateBranchForm(key: keyof BranchFormState, value: string) {
    setBranchForm((current) => ({ ...current, [key]: value }));
  }

  function startEditingBranch(branch: Branch) {
    setEditingBranchId(branch.id);
    setStatusMessage("");
    setBranchForm({
      name: branch.name,
      address: branch.address,
      latitude: String(branch.latitude),
      longitude: String(branch.longitude),
      radiusMeters: String(branch.radiusMeters),
      shiftStartTime: branch.shiftStartTime,
      shiftEndTime: branch.shiftEndTime,
      graceMinutes: String(branch.graceMinutes),
      halfDayHours: String(branch.halfDayHours),
      fullDayHours: String(branch.fullDayHours)
    });
  }

  function resetBranchForm() {
    setEditingBranchId(null);
    setStatusMessage("");
    setBranchForm(buildEmptyBranchForm());
  }

  async function handleBranchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBranchSaving(true);
    setStatusMessage("");

    try {
      await apiFetch<Branch>(
        session,
        editingBranchId ? `/admin/branches/${editingBranchId}` : "/admin/branches",
        {
          method: editingBranchId ? "PUT" : "POST",
          body: JSON.stringify({
            name: branchForm.name,
            address: branchForm.address,
            latitude: Number(branchForm.latitude),
            longitude: Number(branchForm.longitude),
            radiusMeters: Number(branchForm.radiusMeters),
            shiftStartTime: branchForm.shiftStartTime,
            shiftEndTime: branchForm.shiftEndTime,
            graceMinutes: Number(branchForm.graceMinutes),
            halfDayHours: Number(branchForm.halfDayHours),
            fullDayHours: Number(branchForm.fullDayHours)
          })
        }
      );

      setStatusMessage(editingBranchId ? "Branch updated successfully." : "Branch added successfully.");
      resetBranchForm();
      await onReload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save branch.");
    } finally {
      setBranchSaving(false);
    }
  }

  return (
    <>
      <section className="grid two-column branch-management-grid">
        <article className="panel">
          <h3>Branch coverage</h3>
          <p className="muted section-intro">A quick branch-by-branch view of today&apos;s presence.</p>
          <div className="branch-list">
            {dashboard.branchSnapshots.length ? (
              dashboard.branchSnapshots.map((branch) => (
                <div className="branch-item" key={branch.branchId}>
                  <div>
                    <strong>{branch.branchName}</strong>
                    <span>{branch.present} present / {branch.headcount} assigned</span>
                  </div>
                  <span className="pill">
                    {Math.round((branch.present / Math.max(branch.headcount, 1)) * 100)}%
                  </span>
                </div>
              ))
            ) : (
              <EmptyState title="No branch activity yet" message="Branch coverage will appear here after your first staff records and attendance entries are added." />
            )}
          </div>
        </article>

        <article className="panel">
          <div className="topbar">
            <div>
              <h3>{editingBranchId ? "Edit branch" : "Add branch"}</h3>
              <p className="muted section-intro">
                Manage geofence radius, exact coordinates, and timing policy for each branch from one place.
              </p>
            </div>
            {editingBranchId ? (
              <button className="ghost-button" onClick={resetBranchForm} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>

          <form className="admin-form-grid" onSubmit={handleBranchSubmit}>
            <div className="grid two-column compact-grid">
              <label>
                Branch name
                <input required value={branchForm.name} onChange={(event) => updateBranchForm("name", event.target.value)} placeholder="Main Branch" />
              </label>
              <label>
                Address
                <input required value={branchForm.address} onChange={(event) => updateBranchForm("address", event.target.value)} placeholder="MG Road, Bengaluru" />
              </label>
            </div>

            <div className="grid three-column compact-grid">
              <label>
                Latitude
                <input required step="0.0000001" type="number" value={branchForm.latitude} onChange={(event) => updateBranchForm("latitude", event.target.value)} placeholder="12.9715987" />
              </label>
              <label>
                Longitude
                <input required step="0.0000001" type="number" value={branchForm.longitude} onChange={(event) => updateBranchForm("longitude", event.target.value)} placeholder="77.5945627" />
              </label>
              <label>
                Geofence radius (m)
                <input required min="1" step="0.01" type="number" value={branchForm.radiusMeters} onChange={(event) => updateBranchForm("radiusMeters", event.target.value)} placeholder="50" />
              </label>
            </div>

            <div className="grid compact-grid branch-policy-grid">
              <label>
                Shift start
                <input required type="time" value={branchForm.shiftStartTime} onChange={(event) => updateBranchForm("shiftStartTime", event.target.value)} />
              </label>
              <label>
                Shift end
                <input required type="time" value={branchForm.shiftEndTime} onChange={(event) => updateBranchForm("shiftEndTime", event.target.value)} />
              </label>
              <label>
                Grace minutes
                <input required min="0" max="240" type="number" value={branchForm.graceMinutes} onChange={(event) => updateBranchForm("graceMinutes", event.target.value)} />
              </label>
              <label>
                Half day after (hours)
                <input required min="1" max="24" type="number" value={branchForm.halfDayHours} onChange={(event) => updateBranchForm("halfDayHours", event.target.value)} />
              </label>
              <label>
                Full day after (hours)
                <input required min="1" max="24" type="number" value={branchForm.fullDayHours} onChange={(event) => updateBranchForm("fullDayHours", event.target.value)} />
              </label>
            </div>
            <p className="muted form-helper-text">
              Example: 4 hours for half day and 8 hours for full day. Anything below the half-day rule is treated as absent in payroll.
            </p>

            <div className="action-row">
              <button className="primary-button" disabled={branchSaving} type="submit">
                {branchSaving ? "Saving..." : editingBranchId ? "Update branch" : "Add branch"}
              </button>
            </div>

            {statusMessage ? (
              <p className={statusMessage.includes("successfully") ? "status-text" : "error-text"}>
                {statusMessage}
              </p>
            ) : null}
          </form>
        </article>
      </section>

      <section className="panel">
        <h3>Configured branches</h3>
        <p className="muted section-intro">Review geofence settings and timing policy for every branch.</p>
        {branches.length ? (
          <>
            <table className="data-table desktop-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Address</th>
                  <th>Radius</th>
                  <th>Shift timing</th>
                  <th>Grace</th>
                  <th>Workday rule</th>
                  <th>Coordinates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td><strong>{branch.name}</strong></td>
                    <td>{branch.address}</td>
                    <td>{branch.radiusMeters}m</td>
                    <td>{branch.shiftStartTime} - {branch.shiftEndTime}</td>
                    <td>{branch.graceMinutes} min</td>
                    <td>{branch.halfDayHours}h half day / {branch.fullDayHours}h full day</td>
                    <td>{branch.latitude.toFixed(5)}, {branch.longitude.toFixed(5)}</td>
                    <td>
                      <button className="ghost-button compact-button" onClick={() => startEditingBranch(branch)} type="button">
                        Edit branch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="attendance-card-list branch-card-list">
              {branches.map((branch) => (
                <article className="attendance-card" key={branch.id}>
                  <div className="attendance-card-header">
                    <strong>{branch.name}</strong>
                    <span className="pill">{branch.radiusMeters}m</span>
                  </div>
                  <div className="attendance-card-grid">
                    <span>Address</span>
                    <strong>{branch.address}</strong>
                    <span>Shift timing</span>
                    <strong>{branch.shiftStartTime} - {branch.shiftEndTime}</strong>
                    <span>Grace</span>
                    <strong>{branch.graceMinutes} min</strong>
                    <span>Workday rule</span>
                    <strong>{branch.halfDayHours}h half day / {branch.fullDayHours}h full day</strong>
                    <span>Coordinates</span>
                    <strong>{branch.latitude.toFixed(5)}, {branch.longitude.toFixed(5)}</strong>
                  </div>
                  <div className="table-action-row card-action-row">
                    <button className="ghost-button compact-button" onClick={() => startEditingBranch(branch)} type="button">
                      Edit branch
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="No branches yet" message="Add your first branch to start assigning employees and accepting attendance nearby." />
        )}
      </section>
    </>
  );
}
