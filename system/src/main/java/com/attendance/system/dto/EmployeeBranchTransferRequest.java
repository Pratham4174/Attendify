package com.attendance.system.dto;

import jakarta.validation.constraints.NotBlank;

public record EmployeeBranchTransferRequest(
        @NotBlank String branchId
) {
}
