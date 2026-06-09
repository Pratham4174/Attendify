package com.attendance.system.controller;

import com.attendance.system.dto.AttendanceCorrectionCreateRequest;
import com.attendance.system.dto.AttendanceCorrectionDecisionRequest;
import com.attendance.system.dto.AttendanceCorrectionResponse;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.service.AttendanceCorrectionService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
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
public class AttendanceCorrectionController {
    private final AttendanceCorrectionService attendanceCorrectionService;

    public AttendanceCorrectionController(AttendanceCorrectionService attendanceCorrectionService) {
        this.attendanceCorrectionService = attendanceCorrectionService;
    }

    @GetMapping("/employee/corrections")
    public List<AttendanceCorrectionResponse> employeeCorrections(Authentication authentication) {
        return attendanceCorrectionService.employeeCorrections(currentUser(authentication));
    }

    @PostMapping("/employee/corrections")
    public AttendanceCorrectionResponse createCorrection(
            Authentication authentication,
            @Valid @RequestBody AttendanceCorrectionCreateRequest request
    ) {
        return attendanceCorrectionService.createCorrection(currentUser(authentication), request);
    }

    @GetMapping("/admin/corrections")
    public List<AttendanceCorrectionResponse> adminCorrections(Authentication authentication) {
        return attendanceCorrectionService.adminCorrections(currentUser(authentication));
    }

    @PatchMapping("/admin/corrections/{correctionId}")
    public AttendanceCorrectionResponse decideCorrection(
            Authentication authentication,
            @PathVariable String correctionId,
            @Valid @RequestBody AttendanceCorrectionDecisionRequest request
    ) {
        return attendanceCorrectionService.decideCorrection(currentUser(authentication), correctionId, request);
    }

    private AuthenticatedUser currentUser(Authentication authentication) {
        return (AuthenticatedUser) authentication.getPrincipal();
    }
}
