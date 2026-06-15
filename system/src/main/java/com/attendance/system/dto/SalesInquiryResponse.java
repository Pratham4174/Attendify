package com.attendance.system.dto;

public record SalesInquiryResponse(
        String message,
        boolean emailDelivered,
        boolean saved
) {
}
