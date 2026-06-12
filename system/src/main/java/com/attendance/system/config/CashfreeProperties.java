package com.attendance.system.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.billing.cashfree")
public record CashfreeProperties(
        boolean enabled,
        String clientId,
        String clientSecret,
        String environment,
        String returnBaseUrl
) {
    public String apiBaseUrl() {
        return "production".equalsIgnoreCase(environment)
                ? "https://api.cashfree.com"
                : "https://sandbox.cashfree.com";
    }
}
