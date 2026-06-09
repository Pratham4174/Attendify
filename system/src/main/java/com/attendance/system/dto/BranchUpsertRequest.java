package com.attendance.system.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record BranchUpsertRequest(
        @NotBlank String name,
        @NotBlank String address,
        @NotNull @DecimalMin(value = "-90.0") BigDecimal latitude,
        @NotNull @DecimalMin(value = "-180.0") BigDecimal longitude,
        @NotNull @DecimalMin("1.0") BigDecimal radiusMeters,
        @NotBlank String shiftStartTime,
        @NotBlank String shiftEndTime,
        @NotNull @Min(0) @Max(240) Integer graceMinutes,
        @NotNull @Min(1) @Max(24) Integer halfDayHours,
        @NotNull @Min(1) @Max(24) Integer fullDayHours
) {
}
