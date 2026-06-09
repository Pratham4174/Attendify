import type { ReactNode } from "react";
import { formatDateTime } from "../lib/format";
import type { AttendanceCorrection } from "../types";
import { EmptyState } from "./shared";

export function AttendanceCorrectionTable({
  corrections,
  showEmployee,
  renderActions,
  emptyTitle,
  emptyMessage
}: {
  corrections: AttendanceCorrection[];
  showEmployee?: boolean;
  renderActions?: (correction: AttendanceCorrection) => ReactNode;
  emptyTitle: string;
  emptyMessage: string;
}) {
  if (!corrections.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <>
      <table className="data-table desktop-table">
        <thead>
          <tr>
            {showEmployee ? <th>Employee</th> : null}
            <th>Date</th>
            <th>Type</th>
            <th>Requested time</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Owner note</th>
            {renderActions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {corrections.map((correction) => (
            <tr key={correction.id}>
              {showEmployee ? (
                <td>
                  <strong>{correction.employeeName}</strong>
                  <div className="table-subtext">{correction.branchName}</div>
                </td>
              ) : null}
              <td>{correction.attendanceDate}</td>
              <td>{formatCorrectionType(correction.correctionType)}</td>
              <td>{formatDateTime(correction.requestedTime)}</td>
              <td>{correction.status}</td>
              <td>{correction.reason}</td>
              <td>{correction.reviewNote ?? "Pending"}</td>
              {renderActions ? <td>{renderActions(correction)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="attendance-card-list correction-card-list">
        {corrections.map((correction) => (
          <article className="attendance-card" key={correction.id}>
            <div className="attendance-card-header">
              <strong>{showEmployee ? correction.employeeName : formatCorrectionType(correction.correctionType)}</strong>
              <span className="pill">{correction.status}</span>
            </div>
            <div className="attendance-card-grid">
              {showEmployee ? (
                <>
                  <span>Branch</span>
                  <strong>{correction.branchName}</strong>
                </>
              ) : null}
              <span>Date</span>
              <strong>{correction.attendanceDate}</strong>
              <span>Type</span>
              <strong>{formatCorrectionType(correction.correctionType)}</strong>
              <span>Requested time</span>
              <strong>{formatDateTime(correction.requestedTime)}</strong>
              <span>Reason</span>
              <strong>{correction.reason}</strong>
              <span>Owner note</span>
              <strong>{correction.reviewNote ?? "Pending"}</strong>
            </div>
            {renderActions ? <div className="table-action-row card-action-row">{renderActions(correction)}</div> : null}
            <div className="audit-trail">
              {correction.auditTrail.map((audit, index) => (
                <div className="audit-item" key={`${correction.id}-${index}`}>
                  <strong>{audit.actionType}</strong>
                  <span>{audit.actorName}</span>
                  <span>{formatDateTime(audit.createdAt)}</span>
                  {audit.note ? <span>{audit.note}</span> : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function formatCorrectionType(type: AttendanceCorrection["correctionType"]) {
  return type === "MISSED_CHECK_IN" ? "Missed check-in" : "Missed check-out";
}
