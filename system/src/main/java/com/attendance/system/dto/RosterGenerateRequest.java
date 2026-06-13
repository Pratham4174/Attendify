package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record RosterGenerateRequest(
        @NotBlank String branchId,
        @NotBlank String templateId,
        @NotBlank String month
) {
}
