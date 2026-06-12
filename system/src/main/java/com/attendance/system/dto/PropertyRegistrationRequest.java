package com.attendance.system.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PropertyRegistrationRequest(
        @NotBlank String checkoutSessionId,
        @NotBlank @Size(max = 80) String propertyCode,
        @NotBlank @Size(max = 140) String propertyName,
        @NotBlank @Size(max = 140) String adminName,
        @Email @NotBlank @Size(max = 160) String adminEmail,
        @NotBlank @Size(min = 8, max = 120) String adminPassword,
        @NotBlank @Size(max = 30) String adminPhone,
        @NotBlank @Size(max = 140) String branchName,
        @NotBlank @Size(max = 220) String branchAddress,
        @NotNull @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") Double latitude,
        @NotNull @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") Double longitude,
        @NotNull @DecimalMin(value = "10.0") @DecimalMax(value = "500.0") Double radiusMeters,
        @Valid @NotEmpty List<EmployeeSeed> employees
) {
    public record EmployeeSeed(
            @NotBlank @Size(max = 60) String employeeCode,
            @NotBlank @Size(max = 140) String name,
            @Email @NotBlank @Size(max = 160) String email,
            @NotBlank @Size(max = 30) String phone,
            @NotBlank @Size(max = 100) String designation
    ) {
    }
}
