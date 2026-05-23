package com.attendance.system.service;

import com.attendance.system.dto.AttendanceRowResponse;
import com.attendance.system.dto.AdminTrackingResponse;
import com.attendance.system.dto.BranchResponse;
import com.attendance.system.dto.DashboardSummaryResponse;
import com.attendance.system.dto.EmployeeResponse;
import com.attendance.system.model.AttendanceLocationLogEntity;
import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.repository.AttendanceLocationLogRepository;
import com.attendance.system.repository.AttendanceRecordRepository;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminService {
    private final EmployeeRepository employeeRepository;
    private final BranchRepository branchRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceLocationLogRepository attendanceLocationLogRepository;
    private final AttendanceMapper mapper;

    public AdminService(
            EmployeeRepository employeeRepository,
            BranchRepository branchRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            AttendanceLocationLogRepository attendanceLocationLogRepository,
            AttendanceMapper mapper
    ) {
        this.employeeRepository = employeeRepository;
        this.branchRepository = branchRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.attendanceLocationLogRepository = attendanceLocationLogRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse dashboard(AuthenticatedUser user) {
        requireAdmin(user);
        List<com.attendance.system.model.EmployeeEntity> vendorEmployees = employeeRepository.findByVendor_IdOrderByNameAsc(user.vendorId());
        long totalEmployees = vendorEmployees.size();
        long presentToday = attendanceRecordRepository.countByVendor_IdAndAttendanceDate(user.vendorId(), LocalDate.now(ZoneOffset.UTC));
        long checkedOutToday = attendanceRecordRepository.countByVendor_IdAndAttendanceDateAndCheckOutTimeIsNotNull(user.vendorId(), LocalDate.now(ZoneOffset.UTC));
        long absentToday = Math.max(totalEmployees - presentToday, 0);

        List<DashboardSummaryResponse.BranchAttendanceSnapshot> branchSnapshots = branchRepository
                .findByVendor_IdOrderByNameAsc(user.vendorId())
                .stream()
                .map(branch -> new DashboardSummaryResponse.BranchAttendanceSnapshot(
                        branch.getId().toString(),
                        branch.getName(),
                        vendorEmployees.stream()
                                .filter(employee -> employee.getBranch().getId().equals(branch.getId()))
                                .count(),
                        attendanceRecordRepository.countByVendor_IdAndBranch_IdAndAttendanceDate(
                                user.vendorId(),
                                branch.getId(),
                                LocalDate.now(ZoneOffset.UTC)
                        )
                ))
                .toList();

        List<AttendanceRowResponse> recent = attendanceRecordRepository.findByVendor_IdOrderByAttendanceDateDescCheckInTimeDesc(user.vendorId())
                .stream()
                .limit(10)
                .map(mapper::toAttendanceRow)
                .toList();

        return new DashboardSummaryResponse(
                new DashboardSummaryResponse.SummaryCards(totalEmployees, presentToday, checkedOutToday, absentToday),
                branchSnapshots,
                recent
        );
    }

    @Transactional(readOnly = true)
    public List<EmployeeResponse> employees(AuthenticatedUser user) {
        requireAdmin(user);
        return employeeRepository.findByVendor_IdOrderByNameAsc(user.vendorId()).stream().map(mapper::toEmployeeResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> branches(AuthenticatedUser user) {
        requireAdmin(user);
        return branchRepository.findByVendor_IdOrderByNameAsc(user.vendorId()).stream().map(mapper::toBranchResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceRowResponse> attendance(AuthenticatedUser user) {
        requireAdmin(user);
        return attendanceRecordRepository.findByVendor_IdOrderByAttendanceDateDescCheckInTimeDesc(user.vendorId())
                .stream()
                .map(mapper::toAttendanceRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminTrackingResponse tracking(AuthenticatedUser user, String date) {
        requireAdmin(user);
        LocalDate trackingDate = parseDate(date);
        List<AttendanceLocationLogEntity> logs = attendanceLocationLogRepository
                .findByVendor_IdAndAttendanceRecord_AttendanceDateOrderByEmployee_NameAscCapturedAtAsc(user.vendorId(), trackingDate);

        Map<UUID, AdminTrackingResponse.EmployeeDayRoute> routeMap = new LinkedHashMap<>();
        for (AttendanceLocationLogEntity log : logs) {
            AttendanceRecordEntity record = log.getAttendanceRecord();
            UUID employeeId = log.getEmployee().getId();
            AdminTrackingResponse.EmployeeDayRoute existing = routeMap.get(employeeId);
            List<AdminTrackingResponse.RoutePoint> points = existing == null ? new ArrayList<>() : new ArrayList<>(existing.points());
            points.add(new AdminTrackingResponse.RoutePoint(
                    log.getCapturedAt().toString(),
                    log.getLatitude().doubleValue(),
                    log.getLongitude().doubleValue(),
                    log.getAccuracyMeters() == null ? null : log.getAccuracyMeters().doubleValue()
            ));

            routeMap.put(employeeId, new AdminTrackingResponse.EmployeeDayRoute(
                    employeeId.toString(),
                    log.getEmployee().getName(),
                    record.getBranch().getName(),
                    record.getStatus().name(),
                    record.getCheckInTime().toString(),
                    record.getCheckOutTime() == null ? null : record.getCheckOutTime().toString(),
                    record.getCheckOutTime() == null,
                    points.size(),
                    points
            ));
        }

        return new AdminTrackingResponse(trackingDate.toString(), List.copyOf(routeMap.values()));
    }

    private void requireAdmin(AuthenticatedUser user) {
        if (user.role() != UserRole.VENDOR_ADMIN && user.role() != UserRole.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is required.");
        }
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) {
            return LocalDate.now(ZoneOffset.UTC);
        }

        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tracking date must use YYYY-MM-DD format.");
        }
    }
}
