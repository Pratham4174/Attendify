package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminSubscriptionCheckoutRequest(
        @NotBlank(message = "Please select a plan.")
        String planCode,
        @NotBlank(message = "Please select a billing cycle.")
        String billingCycle,
        @NotBlank(message = "Please enter a contact phone number.")
        String customerPhone
) {
}
