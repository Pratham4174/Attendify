package com.attendance.system.controller;

import com.attendance.system.dto.MessageResponse;
import com.attendance.system.dto.PricingCatalogResponse;
import com.attendance.system.dto.PropertyRegistrationRequest;
import com.attendance.system.dto.PropertyRegistrationResponse;
import com.attendance.system.dto.PublicCheckoutSessionCreateRequest;
import com.attendance.system.dto.PublicCheckoutSessionResponse;
import com.attendance.system.dto.PublicCheckoutSessionVerificationResponse;
import com.attendance.system.dto.SalesInquiryRequest;
import com.attendance.system.dto.SubscriptionRenewalRequest;
import com.attendance.system.service.PublicBillingService;
import com.attendance.system.service.PropertyRegistrationService;
import com.attendance.system.service.SalesInquiryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {
    private final PropertyRegistrationService propertyRegistrationService;
    private final PublicBillingService publicBillingService;
    private final SalesInquiryService salesInquiryService;

    public PublicController(
            PropertyRegistrationService propertyRegistrationService,
            PublicBillingService publicBillingService,
            SalesInquiryService salesInquiryService
    ) {
        this.propertyRegistrationService = propertyRegistrationService;
        this.publicBillingService = publicBillingService;
        this.salesInquiryService = salesInquiryService;
    }

    @GetMapping("/pricing")
    public PricingCatalogResponse getPricing() {
        return publicBillingService.getPricingCatalog();
    }

    @PostMapping("/checkout-sessions")
    public PublicCheckoutSessionResponse createCheckoutSession(@Valid @RequestBody PublicCheckoutSessionCreateRequest request) {
        return publicBillingService.createCheckoutSession(request);
    }

    @PostMapping("/subscription-renewals")
    public PublicCheckoutSessionResponse createSubscriptionRenewal(@Valid @RequestBody SubscriptionRenewalRequest request) {
        return publicBillingService.createSubscriptionRenewal(request);
    }

    @PostMapping("/checkout-sessions/{orderId}/verify")
    public PublicCheckoutSessionVerificationResponse verifyCheckoutSession(@PathVariable String orderId) {
        return publicBillingService.verifyCheckoutSession(orderId);
    }

    @PostMapping("/sales-inquiries")
    public MessageResponse createSalesInquiry(@Valid @RequestBody SalesInquiryRequest request) {
        salesInquiryService.createInquiry(request);
        return new MessageResponse("Thanks. Our team will reach out to you shortly.");
    }

    @PostMapping("/property-registration")
    public PropertyRegistrationResponse registerProperty(@Valid @RequestBody PropertyRegistrationRequest request) {
        return propertyRegistrationService.register(request);
    }
}
