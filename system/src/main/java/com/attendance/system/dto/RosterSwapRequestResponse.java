package com.attendance.system.dto;

public record RosterSwapRequestResponse(
        String id,
        String requesterEmployeeName,
        String targetEmployeeName,
        String requesterAssignmentDate,
        String requesterShiftName,
        String targetAssignmentDate,
        String targetShiftName,
        String status,
        String reason,
        String reviewNote,
        String requestedAt,
        String reviewedAt
) {
}
