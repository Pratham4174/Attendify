package com.attendance.system.dto;

public record SalaryAdvancePaymentResponse(
        String id,
        String employeeId,
        String employeeName,
        String paymentDate,
        String amount,
        String note,
        String createdAt
) {
}
