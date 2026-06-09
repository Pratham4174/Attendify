import type { ReactNode } from "react";
import { formatDateTime } from "../lib/format";
import type { Holiday, LeaveRequest } from "../types";
import { EmptyState } from "./shared";

export function LeaveRequestTable({
  requests,
  showEmployee,
  renderActions,
  emptyTitle,
  emptyMessage
}: {
  requests: LeaveRequest[];
  showEmployee?: boolean;
  renderActions?: (request: LeaveRequest) => ReactNode;
  emptyTitle: string;
  emptyMessage: string;
}) {
  if (!requests.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <>
      <table className="data-table desktop-table">
        <thead>
          <tr>
            {showEmployee ? <th>Employee</th> : null}
            <th>Dates</th>
            <th>Days</th>
            <th>Type</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Requested</th>
            <th>Decision note</th>
            {renderActions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              {showEmployee ? (
                <td>
                  <strong>{request.employeeName}</strong>
                  <div className="table-subtext">{request.branchName}</div>
                </td>
              ) : null}
              <td>
                <strong>{request.startDate}</strong>
                <div className="table-subtext">{request.endDate}</div>
              </td>
              <td>{request.totalDays}</td>
              <td>{request.leaveType}</td>
              <td>{request.status}</td>
              <td>{request.reason}</td>
              <td>{formatDateTime(request.requestedAt)}</td>
              <td>{request.reviewNote ?? "Pending"}</td>
              {renderActions ? <td>{renderActions(request)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="attendance-card-list leave-card-list">
        {requests.map((request) => (
          <article className="attendance-card" key={request.id}>
            <div className="attendance-card-header">
              <strong>{showEmployee ? request.employeeName : `${request.leaveType} leave`}</strong>
              <span className="pill">{request.status}</span>
            </div>
            <div className="attendance-card-grid">
              {showEmployee ? (
                <>
                  <span>Branch</span>
                  <strong>{request.branchName}</strong>
                </>
              ) : null}
              <span>Dates</span>
              <strong>
                {request.startDate} to {request.endDate}
              </strong>
              <span>Total days</span>
              <strong>{request.totalDays}</strong>
              <span>Type</span>
              <strong>{request.leaveType}</strong>
              <span>Reason</span>
              <strong>{request.reason}</strong>
              <span>Requested</span>
              <strong>{formatDateTime(request.requestedAt)}</strong>
              <span>Decision note</span>
              <strong>{request.reviewNote ?? "Pending"}</strong>
            </div>
            {renderActions ? <div className="table-action-row card-action-row">{renderActions(request)}</div> : null}
          </article>
        ))}
      </div>
    </>
  );
}

export function HolidayList({
  holidays,
  onRemove
}: {
  holidays: Holiday[];
  onRemove?: (holiday: Holiday) => void;
}) {
  if (!holidays.length) {
    return <EmptyState title="No holidays added yet" message="Add a holiday so teams can see upcoming off days clearly." />;
  }

  return (
    <div className="branch-list holiday-list">
      {holidays.map((holiday) => (
        <div className="branch-item holiday-item" key={holiday.id}>
          <div>
            <strong>{holiday.name}</strong>
            <span>{holiday.holidayDate}</span>
          </div>
          {onRemove ? (
            <button className="ghost-button compact-button danger-button" onClick={() => onRemove(holiday)} type="button">
              Remove
            </button>
          ) : (
            <span className="pill">Holiday</span>
          )}
        </div>
      ))}
    </div>
  );
}
