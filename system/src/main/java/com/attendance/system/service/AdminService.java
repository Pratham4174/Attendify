package com.attendance.system.service;

import com.attendance.system.dto.AttendanceRowResponse;
import com.attendance.system.dto.BranchResponse;
import com.attendance.system.dto.DashboardSummaryResponse;
import com.attendance.system.dto.EmployeeResponse;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.UserRole;
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
import java.util.List;

@Service
public class AdminService {
    private final EmployeeRepository employeeRepository;
    private final BranchRepository branchRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceMapper mapper;

    public AdminService(
            EmployeeRepository employeeRepository,
            BranchRepository branchRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            AttendanceMapper mapper
    ) {
        this.employeeRepository = employeeRepository;
        this.branchRepository = branchRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
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

    private void requireAdmin(AuthenticatedUser user) {
        if (user.role() != UserRole.VENDOR_ADMIN && user.role() != UserRole.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is required.");
        }
    }
}
