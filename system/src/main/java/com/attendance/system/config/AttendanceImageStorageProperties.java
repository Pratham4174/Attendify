package com.attendance.system.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.storage.attendance-images")
public record AttendanceImageStorageProperties(
        String provider,
        R2 r2
) {
    public String normalizedProvider() {
        return provider == null || provider.isBlank() ? "inline" : provider.trim().toLowerCase();
    }

    public record R2(
            String endpoint,
            String bucket,
            String accessKeyId,
            String secretAccessKey,
            String publicBaseUrl
    ) {
    }
}
