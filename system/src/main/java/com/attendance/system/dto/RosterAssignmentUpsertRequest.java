package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record RosterAssignmentUpsertRequest(
        @NotBlank String employeeId,
        @NotBlank String shiftId,
        @NotBlank String assignmentDate,
        String assignmentType,
        String notes
) {
}
