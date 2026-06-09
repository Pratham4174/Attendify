package com.attendance.system.controller;

import com.attendance.system.dto.AttendanceActionResponse;
import com.attendance.system.dto.AttendanceRequest;
import com.attendance.system.dto.EmployeeProfileImageRequest;
import com.attendance.system.dto.EmployeeOverviewResponse;
import com.attendance.system.dto.LocationPingRequest;
import com.attendance.system.dto.LocationPingResponse;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AttendanceController {
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping("/employee/overview")
    public EmployeeOverviewResponse overview(Authentication authentication) {
        return attendanceService.employeeOverview(currentUser(authentication));
    }

    @PostMapping("/employee/profile-image")
    public EmployeeOverviewResponse saveProfileImage(
            Authentication authentication,
            @Valid @RequestBody EmployeeProfileImageRequest request
    ) {
        return attendanceService.saveEmployeeProfileImage(currentUser(authentication), request);
    }

    @PostMapping("/attendance/check-in")
    public AttendanceActionResponse checkIn(
            Authentication authentication,
            @Valid @RequestBody AttendanceRequest request
    ) {
        return attendanceService.checkIn(currentUser(authentication), request);
    }

    @PostMapping("/attendance/check-out")
    public AttendanceActionResponse checkOut(
            Authentication authentication,
            @Valid @RequestBody AttendanceRequest request
    ) {
        return attendanceService.checkOut(currentUser(authentication), request);
    }

    @PostMapping("/attendance/location-ping")
    public LocationPingResponse locationPing(
            Authentication authentication,
            @Valid @RequestBody LocationPingRequest request
    ) {
        return attendanceService.recordLocationPing(currentUser(authentication), request);
    }

    private AuthenticatedUser currentUser(Authentication authentication) {
        return (AuthenticatedUser) authentication.getPrincipal();
    }
}
