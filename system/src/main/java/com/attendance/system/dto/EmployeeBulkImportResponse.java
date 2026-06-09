package com.attendance.system.dto;

import java.util.List;

public record EmployeeBulkImportResponse(
        int totalRows,
        int createdCount,
        int failedCount,
        List<RowResult> results
) {
    public record RowResult(
            int rowNumber,
            String employeeCode,
            String employeeName,
            boolean success,
            String message
    ) {
    }
}
