package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AttendanceCorrectionCreateRequest(
        @NotBlank String correctionType,
        @NotBlank String attendanceDate,
        @NotBlank String requestedTime,
        @NotBlank @Size(max = 400) String reason
) {
}
