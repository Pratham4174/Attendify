package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmployeePasswordResetRequest(
        @NotBlank
        @Size(min = 6, max = 120)
        String newPassword
) {
}
