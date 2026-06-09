package com.attendance.system.controller;

import com.attendance.system.dto.EmployeeLeaveWorkspaceResponse;
import com.attendance.system.dto.HolidayResponse;
import com.attendance.system.dto.HolidayUpsertRequest;
import com.attendance.system.dto.LeaveDecisionRequest;
import com.attendance.system.dto.LeaveRequestCreateRequest;
import com.attendance.system.dto.LeaveRequestResponse;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LeaveController {
    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/employee/leaves")
    public EmployeeLeaveWorkspaceResponse employeeLeaves(Authentication authentication) {
        return leaveService.employeeLeaves(currentUser(authentication));
    }

    @PostMapping("/employee/leaves")
    public LeaveRequestResponse applyLeave(
            Authentication authentication,
            @Valid @RequestBody LeaveRequestCreateRequest request
    ) {
        return leaveService.applyLeave(currentUser(authentication), request);
    }

    @GetMapping("/admin/leaves")
    public List<LeaveRequestResponse> adminLeaves(Authentication authentication) {
        return leaveService.adminLeaves(currentUser(authentication));
    }

    @PatchMapping("/admin/leaves/{leaveId}")
    public LeaveRequestResponse decideLeave(
            Authentication authentication,
            @PathVariable String leaveId,
            @Valid @RequestBody LeaveDecisionRequest request
    ) {
        return leaveService.decideLeave(currentUser(authentication), leaveId, request);
    }

    @GetMapping("/admin/holidays")
    public List<HolidayResponse> adminHolidays(Authentication authentication) {
        return leaveService.adminHolidays(currentUser(authentication));
    }

    @PostMapping("/admin/holidays")
    public HolidayResponse createHoliday(
            Authentication authentication,
            @Valid @RequestBody HolidayUpsertRequest request
    ) {
        return leaveService.createHoliday(currentUser(authentication), request);
    }

    @DeleteMapping("/admin/holidays/{holidayId}")
    public void deleteHoliday(Authentication authentication, @PathVariable String holidayId) {
        leaveService.deleteHoliday(currentUser(authentication), holidayId);
    }

    private AuthenticatedUser currentUser(Authentication authentication) {
        return (AuthenticatedUser) authentication.getPrincipal();
    }
}
