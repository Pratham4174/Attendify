package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AttendanceCorrectionDecisionRequest(
        @NotBlank String status,
        String approvedTime,
        @NotBlank @Size(max = 400) String reviewNote
) {
}
