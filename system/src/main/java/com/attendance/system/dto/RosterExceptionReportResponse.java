package com.attendance.system.dto;

import java.util.List;

public record RosterExceptionReportResponse(
        String date,
        List<RosterExceptionRow> rows
) {
    public record RosterExceptionRow(
            String employeeId,
            String employeeName,
            String branchName,
            String scheduledShiftName,
            String scheduledStartTime,
            String scheduledEndTime,
            String actualCheckInTime,
            String actualCheckOutTime,
            int lateMinutes,
            int earlyDepartureMinutes,
            int overtimeMinutes,
            String status
    ) {
    }
}
