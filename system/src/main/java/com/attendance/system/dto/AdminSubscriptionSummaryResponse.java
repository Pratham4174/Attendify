package com.attendance.system.dto;

import java.util.List;

public record AdminSubscriptionSummaryResponse(
        CurrentPlan currentPlan,
        List<PaymentHistoryEntry> paymentHistory
) {
    public record CurrentPlan(
            String vendorName,
            String propertyCode,
            String planCode,
            String planLabel,
            String billingCycle,
            String subscriptionStatus,
            Integer employeeLimit,
            long employeeUsed,
            int branchLimit,
            long branchUsed,
            boolean multiBranchIncluded,
            String renewalDate,
            String trialEndsAt
    ) {
    }

    public record PaymentHistoryEntry(
            String checkoutSessionId,
            String cashfreeOrderId,
            String planCode,
            String planLabel,
            String billingCycle,
            String accessMode,
            String amount,
            String currency,
            Integer employeeLimit,
            int branchLimit,
            String status,
            String paymentStatus,
            String createdAt,
            String verifiedAt,
            String accessExpiresAt,
            boolean invoiceAvailable
    ) {
    }
}
