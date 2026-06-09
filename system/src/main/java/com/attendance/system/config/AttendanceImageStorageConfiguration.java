package com.attendance.system.config;

import com.attendance.system.service.AttendanceImageStorageService;
import com.attendance.system.service.InlineAttendanceImageStorageService;
import com.attendance.system.service.R2AttendanceImageStorageService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

@Configuration
public class AttendanceImageStorageConfiguration {
    @Bean
    AttendanceImageStorageService attendanceImageStorageService(AttendanceImageStorageProperties properties) {
        if (!"r2".equals(properties.normalizedProvider())) {
            return new InlineAttendanceImageStorageService();
        }

        AttendanceImageStorageProperties.R2 r2 = properties.r2();
        if (r2 == null
                || !StringUtils.hasText(r2.endpoint())
                || !StringUtils.hasText(r2.bucket())
                || !StringUtils.hasText(r2.accessKeyId())
                || !StringUtils.hasText(r2.secretAccessKey())
                || !StringUtils.hasText(r2.publicBaseUrl())) {
            throw new IllegalStateException("Cloudflare R2 attendance image storage is enabled but configuration is incomplete.");
        }

        S3Client client = S3Client.builder()
                .endpointOverride(URI.create(r2.endpoint()))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(r2.accessKeyId(), r2.secretAccessKey())
                        )
                )
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .region(Region.of("auto"))
                .build();

        return new R2AttendanceImageStorageService(client, r2.bucket(), r2.publicBaseUrl());
    }
}
