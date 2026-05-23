package com.attendance.system.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.attendance.system.dto.AttendanceRowResponse;
import com.attendance.system.dto.AdminTrackingResponse;
import com.attendance.system.dto.BranchResponse;
import com.attendance.system.dto.DashboardSummaryResponse;
import com.attendance.system.dto.EmployeeResponse;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.service.AdminService;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    public DashboardSummaryResponse dashboard(Authentication authentication) {
        return adminService.dashboard(currentUser(authentication));
    }

    @GetMapping("/employees")
    public List<EmployeeResponse> employees(Authentication authentication) {
        return adminService.employees(currentUser(authentication));
    }

    @GetMapping("/branches")
    public List<BranchResponse> branches(Authentication authentication) {
        return adminService.branches(currentUser(authentication));
    }

    @GetMapping("/attendance")
    public List<AttendanceRowResponse> attendance(Authentication authentication) {
        return adminService.attendance(currentUser(authentication));
    }

    @GetMapping("/tracking")
    public AdminTrackingResponse tracking(
            Authentication authentication,
            @RequestParam(required = false) String date
    ) {
        return adminService.tracking(currentUser(authentication), date);
    }

    private AuthenticatedUser currentUser(Authentication authentication) {
        return (AuthenticatedUser) authentication.getPrincipal();
    }
}
