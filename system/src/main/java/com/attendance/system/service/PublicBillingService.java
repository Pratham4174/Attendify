package com.attendance.system.service;

import com.attendance.system.config.CashfreeProperties;
import com.attendance.system.dto.PricingCatalogResponse;
import com.attendance.system.dto.PublicCheckoutSessionCreateRequest;
import com.attendance.system.dto.PublicCheckoutSessionResponse;
import com.attendance.system.dto.PublicCheckoutSessionVerificationResponse;
import com.attendance.system.dto.SubscriptionRenewalRequest;
import com.attendance.system.model.PublicCheckoutSessionEntity;
import com.attendance.system.model.UserEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.model.VendorEntity;
import com.attendance.system.repository.PublicCheckoutSessionRepository;
import com.attendance.system.repository.UserRepository;
import com.attendance.system.repository.VendorRepository;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@EnableConfigurationProperties(CashfreeProperties.class)
public class PublicBillingService {
    private static final int FREE_TRIAL_DAYS = 3;
    private static final String CURRENCY = "INR";
    private final PublicCheckoutSessionRepository publicCheckoutSessionRepository;
    private final VendorRepository vendorRepository;
    private final UserRepository userRepository;
    private final CashfreeProperties cashfreeProperties;
    private final RestClient restClient;

    public PublicBillingService(
            PublicCheckoutSessionRepository publicCheckoutSessionRepository,
            VendorRepository vendorRepository,
            UserRepository userRepository,
            CashfreeProperties cashfreeProperties
    ) {
        this.publicCheckoutSessionRepository = publicCheckoutSessionRepository;
        this.vendorRepository = vendorRepository;
        this.userRepository = userRepository;
        this.cashfreeProperties = cashfreeProperties;
        this.restClient = RestClient.builder().baseUrl(cashfreeProperties.apiBaseUrl()).build();
    }

    public PricingCatalogResponse getPricingCatalog() {
        return new PricingCatalogResponse(
                FREE_TRIAL_DAYS,
                List.of(
                        buildPlan("starter-10", "Up to 10 employees", 10, 1, false, new BigDecimal("1199.00")),
                        buildPlan("growth-25", "Up to 25 employees", 25, 1, false, new BigDecimal("1999.00")),
                        buildPlan("business-50", "Up to 50 employees", 50, 10, true, new BigDecimal("2999.00")),
                        new PricingCatalogResponse.PricingPlan(
                                "custom-50-plus",
                                "More than 50 employees",
                                "Custom rollout for larger teams with tailored onboarding and pricing.",
                                null,
                                0,
                                true,
                                true,
                                commonFeatures(),
                                List.of()
                        )
                )
        );
    }

    @Transactional
    public PublicCheckoutSessionResponse createCheckoutSession(PublicCheckoutSessionCreateRequest request) {
        Plan plan = requirePlan(request.planCode(), request.employeeCount());
        String accessMode = normalizeAccessMode(request.accessMode(), plan);
        String billingCycle = normalizeBillingCycle(request.billingCycle(), accessMode);

        PublicCheckoutSessionEntity session = new PublicCheckoutSessionEntity();
        session.setPlanCode(plan.code());
        session.setBillingCycle(billingCycle);
        session.setAccessMode(accessMode);
        session.setStatus("CREATED");
        session.setCustomerName(request.customerName().trim());
        session.setCustomerEmail(request.customerEmail().trim().toLowerCase(Locale.ROOT));
        session.setCustomerPhone(request.customerPhone().trim());
        session.setCompanyName(request.companyName().trim());
        session.setEmployeeCount(request.employeeCount());
        session.setCurrency(CURRENCY);
        session.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        if ("TRIAL".equals(accessMode)) {
            OffsetDateTime trialEndsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(FREE_TRIAL_DAYS);
            session.setAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            session.setPaymentStatus("TRIAL");
            session.setStatus("UNLOCKED");
            session.setTrialEndsAt(trialEndsAt);
            session.setAccessExpiresAt(trialEndsAt);
            PublicCheckoutSessionEntity saved = publicCheckoutSessionRepository.save(session);
            return new PublicCheckoutSessionResponse(
                    saved.getId().toString(),
                    saved.getPlanCode(),
                    saved.getBillingCycle(),
                    saved.getAccessMode(),
                    false,
                    saved.getAmount().toPlainString(),
                    saved.getCurrency(),
                    cashfreeProperties.environment(),
                    null,
                    null,
                    trialEndsAt.toString(),
                    trialEndsAt.toString(),
                    "Your 3-day free access is ready. You can now continue with property setup."
            );
        }

        BillingOption billing = requireBilling(plan, billingCycle);
        session.setAmount(billing.amount());
        String orderId = "peeplify-" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);
        session.setCashfreeOrderId(orderId);
        session.setPaymentStatus("PENDING");

        Map<String, Object> response;
        try {
            if (!cashfreeProperties.enabled() || blank(cashfreeProperties.clientId()) || blank(cashfreeProperties.clientSecret())) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Payments are not configured yet. Please enable Cashfree credentials first.");
            }

            response = restClient.post()
                    .uri("/pg/orders")
                    .header("x-client-id", cashfreeProperties.clientId())
                    .header("x-client-secret", cashfreeProperties.clientSecret())
                    .header("x-api-version", "2023-08-01")
                    .body(Map.of(
                            "order_id", orderId,
                            "order_amount", billing.amount(),
                            "order_currency", CURRENCY,
                            "customer_details", Map.of(
                                    "customer_id", "cust-" + UUID.randomUUID().toString().substring(0, 8),
                                    "customer_name", session.getCustomerName(),
                                    "customer_email", session.getCustomerEmail(),
                                    "customer_phone", session.getCustomerPhone()
                            ),
                            "order_meta", Map.of(
                                    "return_url", cashfreeProperties.returnBaseUrl() + "?checkout_session_id=" + orderId
                            )
                    ))
                    .retrieve()
                    .body(Map.class);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to start the payment session right now.");
        }

        Object paymentSessionId = response == null ? null : response.get("payment_session_id");
        if (paymentSessionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cashfree did not return a payment session.");
        }

        session.setPaymentSessionId(paymentSessionId.toString());
        PublicCheckoutSessionEntity saved = publicCheckoutSessionRepository.save(session);
        return new PublicCheckoutSessionResponse(
                saved.getId().toString(),
                saved.getPlanCode(),
                saved.getBillingCycle(),
                saved.getAccessMode(),
                true,
                saved.getAmount().toPlainString(),
                saved.getCurrency(),
                cashfreeProperties.environment(),
                saved.getPaymentSessionId(),
                saved.getCashfreeOrderId(),
                null,
                null,
                "Payment session created successfully."
        );
    }

    @Transactional
    public PublicCheckoutSessionResponse createSubscriptionRenewal(SubscriptionRenewalRequest request) {
        String propertyCode = request.propertyCode().trim().toLowerCase(Locale.ROOT);
        VendorEntity vendor = vendorRepository.findByCode(propertyCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property code was not found."));

        UserEntity adminUser = userRepository.findByEmailIgnoreCase(request.adminEmail().trim().toLowerCase(Locale.ROOT))
                .filter(UserEntity::isActive)
                .filter(user -> user.getRole() == UserRole.VENDOR_ADMIN)
                .filter(user -> user.getVendor().getId().equals(vendor.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin email does not match this property."));

        Plan plan = requirePlan(request.planCode(), planEmployeeLimit(request.planCode()));
        BillingOption billing = requireBilling(plan, normalizeBillingCycle(request.billingCycle(), "PAID"));

        PublicCheckoutSessionEntity session = new PublicCheckoutSessionEntity();
        session.setVendor(vendor);
        session.setPlanCode(plan.code());
        session.setBillingCycle(billing.billingCycle());
        session.setAccessMode("PAID");
        session.setStatus("CREATED");
        session.setCustomerName(request.customerName().trim());
        session.setCustomerEmail(adminUser.getEmail());
        session.setCustomerPhone(request.customerPhone().trim());
        session.setCompanyName(vendor.getName());
        session.setEmployeeCount(plan.employeeLimit());
        session.setAmount(billing.amount());
        session.setCurrency(CURRENCY);
        session.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        session.setPaymentStatus("PENDING");

        String orderId = "peeplify-renew-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        session.setCashfreeOrderId(orderId);

        Map<String, Object> response;
        try {
            if (!cashfreeProperties.enabled() || blank(cashfreeProperties.clientId()) || blank(cashfreeProperties.clientSecret())) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Payments are not configured yet. Please enable Cashfree credentials first.");
            }

            response = restClient.post()
                    .uri("/pg/orders")
                    .header("x-client-id", cashfreeProperties.clientId())
                    .header("x-client-secret", cashfreeProperties.clientSecret())
                    .header("x-api-version", "2023-08-01")
                    .body(Map.of(
                            "order_id", orderId,
                            "order_amount", billing.amount(),
                            "order_currency", CURRENCY,
                            "customer_details", Map.of(
                                    "customer_id", "renew-" + vendor.getId().toString().substring(0, 8),
                                    "customer_name", session.getCustomerName(),
                                    "customer_email", session.getCustomerEmail(),
                                    "customer_phone", session.getCustomerPhone()
                            ),
                            "order_meta", Map.of(
                                    "return_url", cashfreeProperties.returnBaseUrl() + "?checkout_session_id=" + orderId + "&renew=1"
                            )
                    ))
                    .retrieve()
                    .body(Map.class);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to start the payment session right now.");
        }

        Object paymentSessionId = response == null ? null : response.get("payment_session_id");
        if (paymentSessionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cashfree did not return a payment session.");
        }

        session.setPaymentSessionId(paymentSessionId.toString());
        PublicCheckoutSessionEntity saved = publicCheckoutSessionRepository.save(session);
        return new PublicCheckoutSessionResponse(
                saved.getId().toString(),
                saved.getPlanCode(),
                saved.getBillingCycle(),
                saved.getAccessMode(),
                true,
                saved.getAmount().toPlainString(),
                saved.getCurrency(),
                cashfreeProperties.environment(),
                saved.getPaymentSessionId(),
                saved.getCashfreeOrderId(),
                null,
                null,
                "Renewal payment session created successfully."
        );
    }

    @Transactional
    public PublicCheckoutSessionVerificationResponse verifyCheckoutSession(String checkoutOrderId) {
        PublicCheckoutSessionEntity session = publicCheckoutSessionRepository.findByCashfreeOrderId(checkoutOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment session was not found."));

        if ("UNLOCKED".equals(session.getStatus())) {
            Plan plan = requirePlan(session.getPlanCode(), session.getEmployeeCount());
            return new PublicCheckoutSessionVerificationResponse(
                    session.getId().toString(),
                    session.getPlanCode(),
                    session.getBillingCycle(),
                    session.getAccessMode(),
                    session.getStatus(),
                    session.getPaymentStatus(),
                    true,
                    session.getEmployeeCount(),
                    plan.maxBranches(),
                    session.getTrialEndsAt() == null ? null : session.getTrialEndsAt().toString(),
                    session.getAccessExpiresAt() == null ? null : session.getAccessExpiresAt().toString(),
                    "This registration session is already unlocked."
            );
        }

        Map<String, Object> orderResponse;
        try {
            orderResponse = restClient.get()
                    .uri("/pg/orders/{orderId}", session.getCashfreeOrderId())
                    .header("x-client-id", cashfreeProperties.clientId())
                    .header("x-client-secret", cashfreeProperties.clientSecret())
                    .header("x-api-version", "2023-08-01")
                    .retrieve()
                    .body(Map.class);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to verify the payment right now.");
        }

        String orderStatus = stringValue(orderResponse == null ? null : orderResponse.get("order_status"));
        if (!"PAID".equalsIgnoreCase(orderStatus)) {
            session.setPaymentStatus(orderStatus == null ? "PENDING" : orderStatus.toUpperCase(Locale.ROOT));
            publicCheckoutSessionRepository.save(session);
            return new PublicCheckoutSessionVerificationResponse(
                    session.getId().toString(),
                    session.getPlanCode(),
                    session.getBillingCycle(),
                    session.getAccessMode(),
                    session.getStatus(),
                    session.getPaymentStatus(),
                    false,
                    session.getEmployeeCount(),
                    0,
                    session.getTrialEndsAt() == null ? null : session.getTrialEndsAt().toString(),
                    session.getAccessExpiresAt() == null ? null : session.getAccessExpiresAt().toString(),
                    "Payment is not completed yet."
            );
        }

        Plan plan = requirePlan(session.getPlanCode(), session.getEmployeeCount());
        BillingOption billing = requireBilling(plan, session.getBillingCycle());
        OffsetDateTime accessExpiresAt = OffsetDateTime.now(ZoneOffset.UTC).plusMonths(billing.billingMonths());
        session.setStatus("UNLOCKED");
        session.setPaymentStatus("PAID");
        session.setVerifiedAt(OffsetDateTime.now(ZoneOffset.UTC));
        session.setAccessExpiresAt(accessExpiresAt);
        if (session.getVendor() != null) {
            VendorEntity vendor = session.getVendor();
            vendor.setSubscriptionPlanCode(session.getPlanCode());
            vendor.setSubscriptionBillingCycle(session.getBillingCycle());
            vendor.setSubscriptionStatus("ACTIVE");
            vendor.setMaxEmployees(plan.employeeLimit());
            vendor.setMaxBranches(plan.maxBranches());
            vendor.setTrialEndsAt(null);
            vendor.setAccessExpiresAt(accessExpiresAt);
            vendor.setStatus("ACTIVE");
            session.setStatus("CONSUMED");
        }
        publicCheckoutSessionRepository.save(session);

        return new PublicCheckoutSessionVerificationResponse(
                session.getId().toString(),
                session.getPlanCode(),
                session.getBillingCycle(),
                session.getAccessMode(),
                session.getStatus(),
                session.getPaymentStatus(),
                true,
                session.getEmployeeCount(),
                plan.maxBranches(),
                session.getTrialEndsAt() == null ? null : session.getTrialEndsAt().toString(),
                accessExpiresAt.toString(),
                session.getVendor() == null
                        ? "Payment verified. You can now continue with property setup."
                        : "Payment verified. Your workspace has been renewed. Please sign in again."
        );
    }

    public PublicCheckoutSessionEntity requireUnlockedSession(String checkoutSessionId) {
        PublicCheckoutSessionEntity session = publicCheckoutSessionRepository.findById(UUID.fromString(checkoutSessionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration access was not found."));
        if (!"UNLOCKED".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complete your trial or payment before registering the property.");
        }
        return session;
    }

    private PricingCatalogResponse.PricingPlan buildPlan(String code, String label, int employeeLimit, int maxBranches, boolean multiBranch, BigDecimal monthlyAmount) {
        return new PricingCatalogResponse.PricingPlan(
                code,
                label,
                "All Peeplify core features included.",
                employeeLimit,
                maxBranches,
                multiBranch,
                false,
                commonFeatures(),
                List.of(
                        billingOption("MONTHLY", 1, 0, "Monthly", monthlyAmount),
                        billingOption("QUARTERLY", 3, 10, "Quarterly", monthlyAmount),
                        billingOption("HALF_YEARLY", 6, 20, "Half-yearly", monthlyAmount),
                        billingOption("YEARLY", 12, 25, "Yearly", monthlyAmount)
                )
        );
    }

    private PricingCatalogResponse.PricingOption billingOption(String billingCycle, int months, int discountPercent, String label, BigDecimal monthlyAmount) {
        BigDecimal gross = monthlyAmount.multiply(BigDecimal.valueOf(months));
        BigDecimal net = gross.multiply(BigDecimal.valueOf(100 - discountPercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                .setScale(0, RoundingMode.HALF_UP);
        return new PricingCatalogResponse.PricingOption(
                billingCycle,
                months,
                discountPercent,
                label,
                net.toPlainString()
        );
    }

    private BillingOption requireBilling(Plan plan, String billingCycle) {
        return plan.billingOptions().stream()
                .filter(option -> option.billingCycle().equalsIgnoreCase(billingCycle))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported billing cycle."));
    }

    private String normalizeAccessMode(String accessMode, Plan plan) {
        String normalized = accessMode == null ? "" : accessMode.trim().toUpperCase(Locale.ROOT);
        if ("TRIAL".equals(normalized)) {
            return "TRIAL";
        }
        if ("PAID".equals(normalized)) {
            return "PAID";
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported access mode.");
    }

    private String normalizeBillingCycle(String billingCycle, String accessMode) {
        if ("TRIAL".equals(accessMode)) {
            return "TRIAL";
        }
        String normalized = billingCycle == null ? "" : billingCycle.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a billing cycle.");
        }
        return normalized;
    }

    private Plan requirePlan(String planCode, int employeeCount) {
        return plans().stream()
                .filter(plan -> plan.code().equalsIgnoreCase(planCode))
                .findFirst()
                .filter(plan -> plan.employeeLimit() == null || employeeCount <= plan.employeeLimit())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a valid plan for your team size."));
    }

    private int planEmployeeLimit(String planCode) {
        return plans().stream()
                .filter(plan -> plan.code().equalsIgnoreCase(planCode))
                .findFirst()
                .map(Plan::employeeLimit)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a valid plan."));
    }

    private List<Plan> plans() {
        return List.of(
                new Plan("starter-10", 10, 1, List.of(
                        new BillingOption("MONTHLY", new BigDecimal("1199.00"), 1),
                        new BillingOption("QUARTERLY", new BigDecimal("3237.00"), 3),
                        new BillingOption("HALF_YEARLY", new BigDecimal("5755.00"), 6),
                        new BillingOption("YEARLY", new BigDecimal("10791.00"), 12)
                )),
                new Plan("growth-25", 25, 1, List.of(
                        new BillingOption("MONTHLY", new BigDecimal("1999.00"), 1),
                        new BillingOption("QUARTERLY", new BigDecimal("5397.00"), 3),
                        new BillingOption("HALF_YEARLY", new BigDecimal("9595.00"), 6),
                        new BillingOption("YEARLY", new BigDecimal("17991.00"), 12)
                )),
                new Plan("business-50", 50, 10, List.of(
                        new BillingOption("MONTHLY", new BigDecimal("2999.00"), 1),
                        new BillingOption("QUARTERLY", new BigDecimal("8097.00"), 3),
                        new BillingOption("HALF_YEARLY", new BigDecimal("14395.00"), 6),
                        new BillingOption("YEARLY", new BigDecimal("26991.00"), 12)
                ))
        );
    }

    private List<String> commonFeatures() {
        return List.of(
                "Attendance with selfie and GPS proof",
                "Leave management and attendance corrections",
                "Payroll snapshots and salary advance tracking",
                "Employee management and attendance reports"
        );
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private record Plan(String code, Integer employeeLimit, int maxBranches, List<BillingOption> billingOptions) {
    }

    private record BillingOption(String billingCycle, BigDecimal amount, int billingMonths) {
    }
}
