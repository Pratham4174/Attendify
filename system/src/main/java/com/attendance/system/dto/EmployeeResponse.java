package com.attendance.system.dto;

public record EmployeeResponse(
        String id,
        String employeeCode,
        String name,
        String designation,
        String email,
        String phone,
        String status,
        String branchId,
        String branchName,
        String monthlySalary,
        int monthlyLeaveAllowance,
        String advancePaid,
        boolean loginEnabled,
        String profileImageRef,
        String createdAt
) {
}
