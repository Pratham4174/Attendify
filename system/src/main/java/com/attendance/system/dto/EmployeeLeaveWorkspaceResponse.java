package com.attendance.system.dto;

import java.util.List;

public record EmployeeLeaveWorkspaceResponse(
        LeaveBalanceSummary balance,
        List<LeaveRequestResponse> requests,
        List<HolidayResponse> holidays
) {
    public record LeaveBalanceSummary(
            int monthlyAllowance,
            int approvedPaidLeaves,
            int remainingPaidLeaves
    ) {
    }
}
