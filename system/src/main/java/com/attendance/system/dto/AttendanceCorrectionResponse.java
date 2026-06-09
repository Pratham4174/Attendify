package com.attendance.system.dto;

import java.util.List;

public record AttendanceCorrectionResponse(
        String id,
        String employeeId,
        String employeeName,
        String branchName,
        String correctionType,
        String status,
        String attendanceDate,
        String requestedTime,
        String appliedTime,
        String reason,
        String reviewNote,
        String reviewedByName,
        String createdAt,
        String reviewedAt,
        List<AttendanceCorrectionAuditResponse> auditTrail
) {
}
