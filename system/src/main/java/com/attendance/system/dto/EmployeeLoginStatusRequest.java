package com.attendance.system.dto;

import jakarta.validation.constraints.NotNull;

public record EmployeeLoginStatusRequest(
        @NotNull Boolean enabled
) {
}
