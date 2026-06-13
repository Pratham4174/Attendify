package com.attendance.system.dto;

import java.util.List;

public record RosterMonthlyViewResponse(
        String month,
        String branchId,
        String branchName,
        boolean published,
        List<String> dates,
        List<EmployeeMonthRosterRow> employees,
        List<RosterConflictResponse> conflicts
) {
    public record EmployeeMonthRosterRow(
            String employeeId,
            String employeeName,
            String designation,
            List<RosterAssignmentResponse> assignments
    ) {
    }
}
