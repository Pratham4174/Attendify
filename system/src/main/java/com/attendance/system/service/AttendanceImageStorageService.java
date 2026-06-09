package com.attendance.system.service;

import com.attendance.system.model.AttendanceRecordEntity;

public interface AttendanceImageStorageService {
    String storeCheckInImage(AttendanceRecordEntity record, String imageDataUrl);
    String storeCheckOutImage(AttendanceRecordEntity record, String imageDataUrl);
}
