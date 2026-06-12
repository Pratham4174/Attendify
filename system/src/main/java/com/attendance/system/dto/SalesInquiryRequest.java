package com.attendance.system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SalesInquiryRequest(
        @NotBlank @Size(max = 140) String contactName,
        @Email @NotBlank @Size(max = 160) String contactEmail,
        @NotBlank @Size(max = 30) String contactPhone,
        @NotBlank @Size(max = 140) String companyName,
        @NotNull @Min(51) @Max(10000) Integer employeeCount,
        @Size(max = 1000) String message
) {
}
