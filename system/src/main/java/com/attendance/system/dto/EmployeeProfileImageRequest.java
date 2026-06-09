package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record EmployeeProfileImageRequest(
        @NotBlank String imageDataUrl
) {
}
