package com.attendance.system.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record RosterTemplateUpsertRequest(
        String branchId,
        @NotBlank String name,
        @NotBlank String industryType,
        @NotBlank String rotationType,
        @NotBlank String weeklyOffMode,
        @NotEmpty List<String> weeklyOffDays,
        @NotEmpty List<String> shiftIds,
        @NotNull @Min(1) @Max(14) Integer maxConsecutiveNightShifts,
        @NotNull @Min(1) @Max(24) Integer minRestHours,
        @NotBlank String holidayPolicy,
        String description,
        @NotNull Boolean active
) {
}
