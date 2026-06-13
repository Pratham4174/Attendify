package com.attendance.system.dto;

import java.util.List;

public record BranchResponse(
        String id,
        String name,
        String address,
        double latitude,
        double longitude,
        double radiusMeters,
        String shiftStartTime,
        String shiftEndTime,
        int graceMinutes,
        int halfDayHours,
        int fullDayHours,
        String weeklyOffMode,
        List<String> weeklyOffDays
) {
}
