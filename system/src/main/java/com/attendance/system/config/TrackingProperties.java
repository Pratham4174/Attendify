package com.attendance.system.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.features.tracking")
public record TrackingProperties(
        boolean enabled
) {
}
