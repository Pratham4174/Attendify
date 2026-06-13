package com.attendance.system.dto;

public record RosterShiftResponse(
        String id,
        String branchId,
        String branchName,
        String code,
        String name,
        String description,
        String startTime,
        String endTime,
        boolean crossesMidnight,
        int workMinutes,
        int breakMinutes,
        int requiredHeadcount,
        String colorHex,
        boolean active
) {
}
