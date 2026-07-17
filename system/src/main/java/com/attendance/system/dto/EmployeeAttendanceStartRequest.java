package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record EmployeeAttendanceStartRequest(
        @NotEmpty List<@NotBlank String> employeeIds,
        @NotBlank String startDate
) {
}
