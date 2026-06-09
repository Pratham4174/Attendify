package com.attendance.system.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record EmployeeBulkImportRequest(
        @NotEmpty List<@Valid EmployeeUpsertRequest> employees
) {
}
