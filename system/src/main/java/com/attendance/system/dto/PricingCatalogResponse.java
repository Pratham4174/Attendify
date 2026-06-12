package com.attendance.system.dto;

import java.util.List;

public record PricingCatalogResponse(
        int freeTrialDays,
        List<PricingPlan> plans
) {
    public record PricingPlan(
            String code,
            String label,
            String description,
            Integer employeeLimit,
            int maxBranches,
            boolean multipleBranchesIncluded,
            boolean customPlan,
            List<String> features,
            List<PricingOption> billingOptions
    ) {
    }

    public record PricingOption(
            String billingCycle,
            int billingMonths,
            int discountPercent,
            String displayLabel,
            String amount
    ) {
    }
}
