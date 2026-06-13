package com.attendance.system.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record RosterShiftUpsertRequest(
        @NotBlank String branchId,
        @NotBlank String code,
        @NotBlank String name,
        String description,
        @NotBlank @Pattern(regexp = "^\\d{2}:\\d{2}$") String startTime,
        @NotBlank @Pattern(regexp = "^\\d{2}:\\d{2}$") String endTime,
        @NotNull @Min(1) @Max(1440) Integer workMinutes,
        @NotNull @Min(0) @Max(360) Integer breakMinutes,
        @NotNull @Min(1) @Max(1000) Integer requiredHeadcount,
        @NotBlank @Pattern(regexp = "^#[A-Fa-f0-9]{6}$") String colorHex,
        @NotNull Boolean active
) {
}
