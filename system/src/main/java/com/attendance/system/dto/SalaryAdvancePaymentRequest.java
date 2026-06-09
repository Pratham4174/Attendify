package com.attendance.system.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SalaryAdvancePaymentRequest(
        @NotBlank String employeeId,
        @NotBlank String paymentDate,
        @NotNull @DecimalMin("0.0") BigDecimal amount,
        @Size(max = 400) String note
) {
}
