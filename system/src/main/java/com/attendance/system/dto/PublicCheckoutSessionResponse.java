package com.attendance.system.dto;

public record PublicCheckoutSessionResponse(
        String checkoutSessionId,
        String planCode,
        String billingCycle,
        String accessMode,
        boolean paymentRequired,
        String amount,
        String currency,
        String cashfreeEnvironment,
        String paymentSessionId,
        String cashfreeOrderId,
        String trialEndsAt,
        String accessExpiresAt,
        String message
) {
}
