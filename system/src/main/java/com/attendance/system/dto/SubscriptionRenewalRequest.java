package com.attendance.system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubscriptionRenewalRequest(
        @NotBlank @Size(max = 80) String propertyCode,
        @Email @NotBlank @Size(max = 160) String adminEmail,
        @NotBlank @Size(max = 140) String customerName,
        @NotBlank @Size(max = 30) String customerPhone,
        @NotBlank @Size(max = 40) String planCode,
        @NotBlank @Size(max = 20) String billingCycle
) {
}
