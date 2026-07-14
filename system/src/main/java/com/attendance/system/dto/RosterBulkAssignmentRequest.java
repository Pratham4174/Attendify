package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record RosterBulkAssignmentRequest(
        @NotBlank String employeeId,
        @NotBlank String shiftId,
        @NotBlank String startDate,
        String endDate,
        String rangeMode,
        String assignmentType,
        String notes,
        Boolean skipWeeklyOffs
) {
}
