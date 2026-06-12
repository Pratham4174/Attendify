package com.attendance.system.dto;

public record PropertyRegistrationResponse(
        String message,
        String vendorId,
        String branchId,
        int employeesCreated,
        String adminEmail,
        String subscriptionPlanCode,
        String subscriptionBillingCycle,
        String accessExpiresAt,
        String trialEndsAt
) {
}
