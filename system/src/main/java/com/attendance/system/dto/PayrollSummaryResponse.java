package com.attendance.system.dto;

import java.util.List;

public record PayrollSummaryResponse(
        String month,
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
            int allowedLeaves,
            int unpaidLeaveDays,
            int payableDays,
            BigDecimalValue dailyRate,
            BigDecimalValue grossPayable,
            BigDecimalValue advancePaid,
            BigDecimalValue netPayable
    ) {
    }

    public record BigDecimalValue(
            String value
    ) {
    }
}
