package com.attendance.system.controller;

import com.attendance.system.service.PublicBillingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/cashfree")
public class CashfreeWebhookController {
    private final PublicBillingService publicBillingService;

    public CashfreeWebhookController(PublicBillingService publicBillingService) {
        this.publicBillingService = publicBillingService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> receiveWebhook(
            @RequestHeader Map<String, String> headers,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        publicBillingService.processCashfreeWebhook(headers, payload == null ? Map.of() : payload);
        return ResponseEntity.ok(Map.of("status", "received"));
    }
}
