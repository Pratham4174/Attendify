package com.attendance.system.dto;

import java.util.List;

public record RosterTemplateResponse(
        String id,
        String branchId,
        String branchName,
        String name,
        String industryType,
        String rotationType,
        String weeklyOffMode,
        List<String> weeklyOffDays,
        List<String> shiftIds,
        List<String> shiftLabels,
        int maxConsecutiveNightShifts,
        int minRestHours,
        String holidayPolicy,
        String description,
        boolean active
) {
}
