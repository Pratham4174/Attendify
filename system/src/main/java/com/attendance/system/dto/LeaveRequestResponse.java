package com.attendance.system.dto;

public record LeaveRequestResponse(
        String id,
        String employeeId,
        String employeeName,
        String branchName,
        String leaveType,
        String status,
        String startDate,
        String endDate,
        int totalDays,
        String reason,
        String reviewNote,
        String requestedAt,
        String reviewedAt
) {
}
