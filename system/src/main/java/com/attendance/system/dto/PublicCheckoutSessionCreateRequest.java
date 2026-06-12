package com.attendance.system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PublicCheckoutSessionCreateRequest(
        @NotBlank @Size(max = 40) String planCode,
        @NotBlank @Size(max = 20) String billingCycle,
        @NotBlank @Size(max = 20) String accessMode,
        @NotBlank @Size(max = 140) String customerName,
        @Email @NotBlank @Size(max = 160) String customerEmail,
        @NotBlank @Size(max = 30) String customerPhone,
        @NotBlank @Size(max = 140) String companyName,
        @NotNull @Min(1) @Max(10000) Integer employeeCount
) {
}
