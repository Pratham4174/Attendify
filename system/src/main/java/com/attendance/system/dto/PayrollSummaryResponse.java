package com.attendance.system.dto;

import java.util.List;

public record PayrollSummaryResponse(
        String month,
        List<SalaryAdvancePaymentRow> advancePayments,
        List<EmployeePayrollRow> employees
) {
    public record EmployeePayrollRow(
            String employeeId,
            String employeeName,
            String designation,
            String status,
            BigDecimalValue monthlySalary,
            int daysCounted,
            int workedDays,
            int halfDays,
            int holidayDays,
            BigDecimalValue workedDayUnits,
            int allowedLeaves,
            int paidLeaveDays,
            int unpaidLeaveDays,
            BigDecimalValue payableDays,
            BigDecimalValue dailyRate,
            BigDecimalValue grossPayable,
            BigDecimalValue openingAdvance,
            BigDecimalValue monthAdvancePaid,
            BigDecimalValue totalAdvanceDeducted,
            BigDecimalValue netPayable
    ) {
    }

    public record SalaryAdvancePaymentRow(
            String id,
            String employeeId,
            String employeeName,
            String paymentDate,
            BigDecimalValue amount,
            String note,
            String createdAt
    ) {
    }

    public record BigDecimalValue(
            String value
    ) {
    }
}
