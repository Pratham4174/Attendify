package com.attendance.system.service;

import com.attendance.system.dto.AdminSubscriptionCheckoutRequest;
import com.attendance.system.dto.AdminSubscriptionSummaryResponse;
import com.attendance.system.dto.PublicCheckoutSessionResponse;
import com.attendance.system.dto.SubscriptionRenewalRequest;
import com.attendance.system.model.PublicCheckoutSessionEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.model.VendorEntity;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.repository.PublicCheckoutSessionRepository;
import com.attendance.system.repository.VendorRepository;
import com.attendance.system.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class AdminSubscriptionService {
    private final VendorRepository vendorRepository;
    private final EmployeeRepository employeeRepository;
    private final BranchRepository branchRepository;
    private final PublicCheckoutSessionRepository publicCheckoutSessionRepository;
    private final PublicBillingService publicBillingService;

    public AdminSubscriptionService(
            VendorRepository vendorRepository,
            EmployeeRepository employeeRepository,
            BranchRepository branchRepository,
            PublicCheckoutSessionRepository publicCheckoutSessionRepository,
            PublicBillingService publicBillingService
    ) {
        this.vendorRepository = vendorRepository;
        this.employeeRepository = employeeRepository;
        this.branchRepository = branchRepository;
        this.publicCheckoutSessionRepository = publicCheckoutSessionRepository;
        this.publicBillingService = publicBillingService;
    }

    @Transactional(readOnly = true)
    public AdminSubscriptionSummaryResponse getDashboard(AuthenticatedUser user) {
        requireAdmin(user);
        VendorEntity vendor = loadVendor(user);
        List<PublicCheckoutSessionEntity> sessions = publicCheckoutSessionRepository.findByVendor_IdOrderByCreatedAtDesc(vendor.getId());

        AdminSubscriptionSummaryResponse.CurrentPlan currentPlan = new AdminSubscriptionSummaryResponse.CurrentPlan(
                vendor.getName(),
                vendor.getCode(),
                vendor.getSubscriptionPlanCode(),
                planLabel(vendor.getSubscriptionPlanCode()),
                billingCycleLabel(vendor.getSubscriptionBillingCycle()),
                normalizeStatus(vendor.getSubscriptionStatus()),
                vendor.getMaxEmployees(),
                employeeRepository.countByVendor_IdAndStatusNot(vendor.getId(), "REMOVED"),
                vendor.getMaxBranches() == null ? 0 : vendor.getMaxBranches(),
                branchRepository.countByVendor_Id(vendor.getId()),
                vendor.getMaxBranches() != null && vendor.getMaxBranches() > 1,
                toIsoString(vendor.getAccessExpiresAt()),
                toIsoString(vendor.getTrialEndsAt())
        );

        List<AdminSubscriptionSummaryResponse.PaymentHistoryEntry> paymentHistory = sessions.stream()
                .map(session -> new AdminSubscriptionSummaryResponse.PaymentHistoryEntry(
                        session.getId().toString(),
                        session.getCashfreeOrderId(),
                        session.getPlanCode(),
                        planLabel(session.getPlanCode()),
                        billingCycleLabel(session.getBillingCycle()),
                        session.getAccessMode(),
                        session.getAmount().toPlainString(),
                        session.getCurrency(),
                        session.getEmployeeCount(),
                        maxBranchesForPlan(session.getPlanCode()),
                        session.getStatus(),
                        session.getPaymentStatus(),
                        toIsoString(session.getCreatedAt()),
                        toIsoString(session.getVerifiedAt()),
                        toIsoString(session.getAccessExpiresAt()),
                        "PAID".equalsIgnoreCase(session.getPaymentStatus())
                ))
                .toList();

        return new AdminSubscriptionSummaryResponse(currentPlan, paymentHistory);
    }

    @Transactional
    public PublicCheckoutSessionResponse createCheckoutSession(
            AuthenticatedUser user,
            AdminSubscriptionCheckoutRequest request
    ) {
        requireAdmin(user);
        VendorEntity vendor = loadVendor(user);
        return publicBillingService.createSubscriptionRenewal(new SubscriptionRenewalRequest(
                vendor.getCode(),
                user.email(),
                user.name(),
                request.customerPhone().trim(),
                request.planCode().trim(),
                request.billingCycle().trim()
        ));
    }

    private VendorEntity loadVendor(AuthenticatedUser user) {
        return vendorRepository.findById(user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace was not found."));
    }

    private void requireAdmin(AuthenticatedUser user) {
        if (user.role() != UserRole.VENDOR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the workspace owner can manage subscriptions.");
        }
    }

    private String planLabel(String planCode) {
        if (planCode == null || planCode.isBlank()) {
            return "No active plan";
        }
        return switch (planCode.toLowerCase(Locale.ROOT)) {
            case "starter-10" -> "Up to 10 employees";
            case "growth-25" -> "Up to 25 employees";
            case "business-50" -> "Up to 50 employees";
            default -> planCode;
        };
    }

    private int maxBranchesForPlan(String planCode) {
        if (planCode == null || planCode.isBlank()) {
            return 0;
        }
        return "business-50".equalsIgnoreCase(planCode) ? 10 : 1;
    }

    private String billingCycleLabel(String billingCycle) {
        if (billingCycle == null || billingCycle.isBlank()) {
            return "Not selected";
        }
        return switch (billingCycle.toUpperCase(Locale.ROOT)) {
            case "MONTHLY" -> "Monthly";
            case "QUARTERLY" -> "Quarterly";
            case "HALF_YEARLY" -> "Half-yearly";
            case "YEARLY" -> "Yearly";
            case "TRIAL" -> "Free trial";
            default -> billingCycle;
        };
    }

    private String normalizeStatus(String subscriptionStatus) {
        if (subscriptionStatus == null || subscriptionStatus.isBlank()) {
            return "Inactive";
        }
        return switch (subscriptionStatus.toUpperCase(Locale.ROOT)) {
            case "ACTIVE" -> "Active";
            case "TRIAL_ACTIVE" -> "Trial active";
            case "EXPIRED" -> "Expired";
            default -> subscriptionStatus.replace('_', ' ');
        };
    }

    private String toIsoString(java.time.OffsetDateTime value) {
        return value == null ? null : value.toString();
    }
}
