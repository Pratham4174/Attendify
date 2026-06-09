package com.attendance.system.service;

import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.EmployeeEntity;

public interface AttendanceImageStorageService {
    String storeCheckInImage(AttendanceRecordEntity record, String imageDataUrl);
    String storeCheckOutImage(AttendanceRecordEntity record, String imageDataUrl);
    String storeProfileImage(EmployeeEntity employee, String imageDataUrl);
}
