package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LeaveDecisionRequest(
        @NotBlank String status,
        @Size(max = 400) String reviewNote
) {
}
