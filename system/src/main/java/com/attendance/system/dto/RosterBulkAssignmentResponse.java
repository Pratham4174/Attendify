package com.attendance.system.dto;

public record RosterBulkAssignmentResponse(
        int created,
        int updated,
        int skipped,
        String startDate,
        String endDate,
        String message
) {
}
