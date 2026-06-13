package com.attendance.system.dto;

public record RosterPublishResponse(
        String month,
        String branchId,
        int assignmentsPublished,
        int employeesAffected,
        String message
) {
}
