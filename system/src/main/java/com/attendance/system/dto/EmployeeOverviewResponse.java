package com.attendance.system.dto;

import java.util.List;

public record EmployeeOverviewResponse(
        EmployeeSummary employee,
        BranchSummary branch,
        AttendanceRowResponse todayAttendance,
        List<AttendanceRowResponse> recentAttendance,
        TrackingSummary tracking
) {
    public record EmployeeSummary(
            String id,
            String branchId,
            String employeeCode,
            String name,
            String email,
            String phone,
            String status,
            String designation
    ) {
    }

    public record BranchSummary(
            String id,
            String name,
            String address,
            double latitude,
            double longitude,
            double radiusMeters
    ) {
    }

    public record TrackingSummary(
            boolean active,
            String lastTrackedAt,
            int pointsCapturedToday
    ) {
    }
}
