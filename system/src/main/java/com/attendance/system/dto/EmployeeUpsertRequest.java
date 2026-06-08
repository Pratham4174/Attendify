package com.attendance.system.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record EmployeeUpsertRequest(
        @NotBlank String employeeCode,
        @NotBlank String name,
        @NotBlank String designation,
        @Email @NotBlank String email,
        @NotBlank String phone,
        @NotBlank String branchId,
        @NotNull @DecimalMin("0.0") BigDecimal monthlySalary,
        @NotNull @Min(0) @Max(31) Integer monthlyLeaveAllowance,
        @NotNull @DecimalMin("0.0") BigDecimal advancePaid
) {
}
