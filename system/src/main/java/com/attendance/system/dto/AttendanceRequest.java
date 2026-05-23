package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AttendanceRequest(
        @NotBlank String branchId,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotBlank String imageDataUrl
) {
}
