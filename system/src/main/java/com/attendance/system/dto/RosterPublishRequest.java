package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record RosterPublishRequest(
        @NotBlank String branchId,
        @NotBlank String month,
        List<String> notifyChannels
) {
}
