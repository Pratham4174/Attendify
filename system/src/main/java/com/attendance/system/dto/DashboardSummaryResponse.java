package com.attendance.system.dto;

import java.util.List;

public record DashboardSummaryResponse(
        SummaryCards cards,
        List<BranchAttendanceSnapshot> branchSnapshots,
        List<AttendanceRowResponse> recentAttendance
) {
    public record SummaryCards(
            long totalEmployees,
            long presentToday,
            long checkedOutToday,
            long absentToday
    ) {
    }

    public record BranchAttendanceSnapshot(
            String branchId,
            String branchName,
            long headcount,
            long present
    ) {
    }
}
