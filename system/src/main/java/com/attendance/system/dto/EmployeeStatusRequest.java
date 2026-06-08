package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record EmployeeStatusRequest(
        @NotBlank String status
) {
}
