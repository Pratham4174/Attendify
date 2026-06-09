package com.attendance.system.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.attendance.system.dto.AttendanceRowResponse;
import com.attendance.system.dto.AdminTrackingResponse;
import com.attendance.system.dto.BranchResponse;
import com.attendance.system.dto.BranchUpsertRequest;
import com.attendance.system.dto.DashboardSummaryResponse;
import com.attendance.system.dto.EmployeeBranchTransferRequest;
import com.attendance.system.dto.EmployeeBulkImportRequest;
import com.attendance.system.dto.EmployeeBulkImportResponse;
import com.attendance.system.dto.EmployeeLoginStatusRequest;
import com.attendance.system.dto.EmployeePasswordResetRequest;
import com.attendance.system.dto.EmployeeResponse;
import com.attendance.system.dto.EmployeeStatusRequest;
import com.attendance.system.dto.EmployeeUpsertRequest;
import com.attendance.system.dto.PayrollSummaryResponse;
import com.attendance.system.dto.SalaryAdvancePaymentRequest;
import com.attendance.system.dto.SalaryAdvancePaymentResponse;
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

    @PostMapping("/employees")
    public EmployeeResponse createEmployee(
            Authentication authentication,
            @Valid @RequestBody EmployeeUpsertRequest request
    ) {
        return adminService.createEmployee(currentUser(authentication), request);
    }

    @PutMapping("/employees/{employeeId}")
    public EmployeeResponse updateEmployee(
            Authentication authentication,
            @PathVariable String employeeId,
            @Valid @RequestBody EmployeeUpsertRequest request
    ) {
        return adminService.updateEmployee(currentUser(authentication), employeeId, request);
    }

    @PatchMapping("/employees/{employeeId}/status")
    public EmployeeResponse updateEmployeeStatus(
            Authentication authentication,
            @PathVariable String employeeId,
            @Valid @RequestBody EmployeeStatusRequest request
    ) {
        return adminService.updateEmployeeStatus(currentUser(authentication), employeeId, request);
    }

    @PatchMapping("/employees/{employeeId}/login")
    public EmployeeResponse updateEmployeeLoginStatus(
            Authentication authentication,
            @PathVariable String employeeId,
            @Valid @RequestBody EmployeeLoginStatusRequest request
    ) {
        return adminService.updateEmployeeLoginStatus(currentUser(authentication), employeeId, request);
    }

    @PatchMapping("/employees/{employeeId}/branch")
    public EmployeeResponse transferEmployee(
            Authentication authentication,
            @PathVariable String employeeId,
            @Valid @RequestBody EmployeeBranchTransferRequest request
    ) {
        return adminService.transferEmployee(currentUser(authentication), employeeId, request);
    }

    @PostMapping("/employees/{employeeId}/reset-password")
    public void resetEmployeePassword(
            Authentication authentication,
            @PathVariable String employeeId,
            @Valid @RequestBody EmployeePasswordResetRequest request
    ) {
        adminService.resetEmployeePassword(currentUser(authentication), employeeId, request);
    }

    @PostMapping("/employees/bulk-import")
    public EmployeeBulkImportResponse bulkImportEmployees(
            Authentication authentication,
            @Valid @RequestBody EmployeeBulkImportRequest request
    ) {
        return adminService.bulkImportEmployees(currentUser(authentication), request);
    }

    @DeleteMapping("/employees/{employeeId}")
    public void removeEmployee(Authentication authentication, @PathVariable String employeeId) {
        adminService.removeEmployee(currentUser(authentication), employeeId);
    }

    @GetMapping("/branches")
    public List<BranchResponse> branches(Authentication authentication) {
        return adminService.branches(currentUser(authentication));
    }

    @PostMapping("/branches")
    public BranchResponse createBranch(
            Authentication authentication,
            @Valid @RequestBody BranchUpsertRequest request
    ) {
        return adminService.createBranch(currentUser(authentication), request);
    }

    @PutMapping("/branches/{branchId}")
    public BranchResponse updateBranch(
            Authentication authentication,
            @PathVariable String branchId,
            @Valid @RequestBody BranchUpsertRequest request
    ) {
        return adminService.updateBranch(currentUser(authentication), branchId, request);
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

    @GetMapping("/payroll")
    public PayrollSummaryResponse payroll(
            Authentication authentication,
            @RequestParam(required = false) String month
    ) {
        return adminService.payroll(currentUser(authentication), month);
    }

    @PostMapping("/advance-payments")
    public SalaryAdvancePaymentResponse recordAdvancePayment(
            Authentication authentication,
            @Valid @RequestBody SalaryAdvancePaymentRequest request
    ) {
        return adminService.recordAdvancePayment(currentUser(authentication), request);
    }

    private AuthenticatedUser currentUser(Authentication authentication) {
        return (AuthenticatedUser) authentication.getPrincipal();
    }
}
