package com.attendance.system.dto;

public record PublicCheckoutSessionVerificationResponse(
        String checkoutSessionId,
        String planCode,
        String billingCycle,
        String accessMode,
        String status,
        String paymentStatus,
        boolean unlocked,
        Integer employeeCount,
        Integer maxBranches,
        String trialEndsAt,
        String accessExpiresAt,
        String message
) {
}
