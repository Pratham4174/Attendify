package com.attendance.system.dto;

public record AttendanceCorrectionAuditResponse(
        String actionType,
        String actorName,
        String note,
        String beforeCheckInTime,
        String beforeCheckOutTime,
        String afterCheckInTime,
        String afterCheckOutTime,
        String createdAt
) {
}
