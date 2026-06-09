package com.attendance.system.service;

import com.attendance.system.model.AttendanceRecordEntity;
public class InlineAttendanceImageStorageService implements AttendanceImageStorageService {
    @Override
    public String storeCheckInImage(AttendanceRecordEntity record, String imageDataUrl) {
        return imageDataUrl;
    }

    @Override
    public String storeCheckOutImage(AttendanceRecordEntity record, String imageDataUrl) {
        return imageDataUrl;
    }
}
