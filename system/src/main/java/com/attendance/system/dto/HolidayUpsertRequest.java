package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HolidayUpsertRequest(
        @NotBlank @Size(max = 140) String name,
        @NotBlank String holidayDate
) {
}
