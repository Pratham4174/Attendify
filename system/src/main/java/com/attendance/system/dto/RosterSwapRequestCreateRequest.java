package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record RosterSwapRequestCreateRequest(
        @NotBlank String requesterAssignmentId,
        @NotBlank String targetAssignmentId,
        String reason
) {
}
