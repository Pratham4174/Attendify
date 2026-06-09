package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LeaveRequestCreateRequest(
        @NotBlank String leaveType,
        @NotBlank String startDate,
        @NotBlank String endDate,
        @NotBlank @Size(max = 400) String reason
) {
}
