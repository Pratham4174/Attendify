package com.attendance.system.service;

import com.attendance.system.dto.EmployeeLeaveWorkspaceResponse;
import com.attendance.system.dto.HolidayResponse;
import com.attendance.system.dto.HolidayUpsertRequest;
import com.attendance.system.dto.LeaveDecisionRequest;
import com.attendance.system.dto.LeaveRequestCreateRequest;
import com.attendance.system.dto.LeaveRequestResponse;
import com.attendance.system.model.EmployeeEntity;
import com.attendance.system.model.HolidayEntity;
import com.attendance.system.model.LeaveRequestEntity;
import com.attendance.system.model.LeaveStatus;
import com.attendance.system.model.LeaveType;
import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.repository.AttendanceRecordRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.repository.HolidayRepository;
import com.attendance.system.repository.LeaveRequestRepository;
import com.attendance.system.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class LeaveService {
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final HolidayRepository holidayRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    public LeaveService(
            EmployeeRepository employeeRepository,
            LeaveRequestRepository leaveRequestRepository,
            HolidayRepository holidayRepository,
            AttendanceRecordRepository attendanceRecordRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.holidayRepository = holidayRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
    }

    @Transactional(readOnly = true)
    public EmployeeLeaveWorkspaceResponse employeeLeaves(AuthenticatedUser user) {
        EmployeeEntity employee = requireEmployee(user);
        List<LeaveRequestResponse> requests = leaveRequestRepository.findByEmployee_IdOrderByCreatedAtDesc(employee.getId())
                .stream()
                .map(this::toLeaveResponse)
                .toList();
        List<HolidayResponse> holidays = holidayRepository.findByVendor_IdOrderByHolidayDateAsc(user.vendorId())
                .stream()
                .map(this::toHolidayResponse)
                .toList();

        LocalDate monthStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate completedThrough = today.minusDays(1);
        int monthlyAllowance = employee.getMonthlyLeaveAllowance() == null ? 0 : employee.getMonthlyLeaveAllowance();

        List<AttendanceRecordEntity> attendanceRows = attendanceRecordRepository
                .findByEmployee_IdAndAttendanceDateBetweenOrderByAttendanceDateAsc(employee.getId(), monthStart, completedThrough)
                .stream()
                .filter(record -> record.getAttendanceDate() != null)
                .toList();

        java.util.Map<LocalDate, AttendanceRecordEntity> attendanceByDate = new java.util.LinkedHashMap<>();
        for (AttendanceRecordEntity attendanceRecord : attendanceRows) {
            attendanceByDate.putIfAbsent(attendanceRecord.getAttendanceDate(), attendanceRecord);
        }

        java.util.Set<LocalDate> holidayDates = holidayRepository
                .findByVendor_IdAndHolidayDateBetweenOrderByHolidayDateAsc(user.vendorId(), monthStart, completedThrough)
                .stream()
                .map(HolidayEntity::getHolidayDate)
                .collect(java.util.stream.Collectors.toCollection(java.util.HashSet::new));

        List<LeaveRequestEntity> approvedLeaves = leaveRequestRepository
                .findByEmployee_IdAndStatusAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
                        employee.getId(),
                        LeaveStatus.APPROVED,
                        monthStart,
                        monthEnd
                );

        java.util.Set<LocalDate> requestedPaidLeaveDates = new java.util.HashSet<>();
        for (LeaveRequestEntity leaveRequest : approvedLeaves) {
            if (leaveRequest.getLeaveType() != LeaveType.PAID) {
                continue;
            }
            expandDates(leaveRequest.getStartDate(), leaveRequest.getEndDate(), monthStart, completedThrough).stream()
                    .filter(date -> !holidayDates.contains(date) && !attendanceByDate.containsKey(date))
                    .forEach(requestedPaidLeaveDates::add);
        }

        int approvedPaidLeaves = 0;
        int autoAppliedPaidLeaves = 0;
        int remainingAllowance = monthlyAllowance;
        for (LocalDate date = monthStart; !date.isAfter(completedThrough); date = date.plusDays(1)) {
            if (holidayDates.contains(date)) {
                continue;
            }

            AttendanceRecordEntity attendanceRecord = attendanceByDate.get(date);
            if (attendanceRecord != null) {
                if (resolveWorkedDayUnits(attendanceRecord) == 0) {
                    if (remainingAllowance > 0) {
                        autoAppliedPaidLeaves++;
                        remainingAllowance--;
                    }
                }
                continue;
            }

            if (requestedPaidLeaveDates.contains(date)) {
                if (remainingAllowance > 0) {
                    approvedPaidLeaves++;
                    remainingAllowance--;
                }
                continue;
            }

            if (!date.isAfter(completedThrough) && remainingAllowance > 0) {
                autoAppliedPaidLeaves++;
                remainingAllowance--;
            }
        }

        int usedPaidLeaves = approvedPaidLeaves + autoAppliedPaidLeaves;
        return new EmployeeLeaveWorkspaceResponse(
                new EmployeeLeaveWorkspaceResponse.LeaveBalanceSummary(
                        monthlyAllowance,
                        approvedPaidLeaves,
                        autoAppliedPaidLeaves,
                        usedPaidLeaves,
                        Math.max(monthlyAllowance - usedPaidLeaves, 0)
                ),
                requests,
                holidays
        );
    }

    @Transactional
    public LeaveRequestResponse applyLeave(AuthenticatedUser user, LeaveRequestCreateRequest request) {
        EmployeeEntity employee = requireEmployee(user);
        LocalDate startDate = parseDate(request.startDate(), "Leave start date must use YYYY-MM-DD format.");
        LocalDate endDate = parseDate(request.endDate(), "Leave end date must use YYYY-MM-DD format.");
        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Leave end date must be on or after the start date.");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > 31) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Leave requests cannot be longer than 32 days.");
        }

        LeaveType leaveType = parseLeaveType(request.leaveType());
        boolean overlaps = leaveRequestRepository.findByEmployee_IdAndStatusIn(
                        employee.getId(),
                        List.of(LeaveStatus.PENDING, LeaveStatus.APPROVED)
                )
                .stream()
                .anyMatch(existing -> overlaps(existing.getStartDate(), existing.getEndDate(), startDate, endDate));
        if (overlaps) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This leave overlaps with another pending or approved leave request.");
        }

        LeaveRequestEntity leaveRequest = new LeaveRequestEntity();
        leaveRequest.setVendor(employee.getVendor());
        leaveRequest.setEmployee(employee);
        leaveRequest.setBranch(employee.getBranch());
        leaveRequest.setLeaveType(leaveType);
        leaveRequest.setStatus(LeaveStatus.PENDING);
        leaveRequest.setStartDate(startDate);
        leaveRequest.setEndDate(endDate);
        leaveRequest.setReason(request.reason().trim());
        leaveRequest.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return toLeaveResponse(leaveRequestRepository.save(leaveRequest));
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> adminLeaves(AuthenticatedUser user) {
        requireAdmin(user);
        return leaveRequestRepository.findByVendor_IdOrderByStartDateDescCreatedAtDesc(user.vendorId())
                .stream()
                .map(this::toLeaveResponse)
                .toList();
    }

    @Transactional
    public LeaveRequestResponse decideLeave(AuthenticatedUser user, String leaveId, LeaveDecisionRequest request) {
        requireAdmin(user);
        LeaveRequestEntity leaveRequest = leaveRequestRepository.findByIdAndVendor_Id(UUID.fromString(leaveId), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leave request not found."));
        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending leave requests can be updated.");
        }

        leaveRequest.setStatus(parseDecisionStatus(request.status()));
        leaveRequest.setReviewNote(request.reviewNote() == null ? null : request.reviewNote().trim());
        leaveRequest.setReviewedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return toLeaveResponse(leaveRequestRepository.save(leaveRequest));
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> adminHolidays(AuthenticatedUser user) {
        requireAdmin(user);
        return holidayRepository.findByVendor_IdOrderByHolidayDateAsc(user.vendorId())
                .stream()
                .map(this::toHolidayResponse)
                .toList();
    }

    @Transactional
    public HolidayResponse createHoliday(AuthenticatedUser user, HolidayUpsertRequest request) {
        requireAdmin(user);
        LocalDate holidayDate = parseDate(request.holidayDate(), "Holiday date must use YYYY-MM-DD format.");
        if (holidayRepository.existsByVendor_IdAndHolidayDate(user.vendorId(), holidayDate)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A holiday already exists for this date.");
        }

        HolidayEntity holiday = new HolidayEntity();
        holiday.setVendor(loadVendorForAdmin(user));
        holiday.setName(request.name().trim());
        holiday.setHolidayDate(holidayDate);
        return toHolidayResponse(holidayRepository.save(holiday));
    }

    @Transactional
    public void deleteHoliday(AuthenticatedUser user, String holidayId) {
        requireAdmin(user);
        HolidayEntity holiday = holidayRepository.findByIdAndVendor_Id(UUID.fromString(holidayId), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Holiday not found."));
        holidayRepository.delete(holiday);
    }

    private EmployeeEntity requireEmployee(AuthenticatedUser user) {
        if (user.role() != UserRole.EMPLOYEE || user.employeeId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Employee access is required.");
        }
        return employeeRepository.findByIdAndVendor_Id(user.employeeId(), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee profile not found."));
    }

    private void requireAdmin(AuthenticatedUser user) {
        if (user.role() != UserRole.VENDOR_ADMIN && user.role() != UserRole.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is required.");
        }
    }

    private com.attendance.system.model.VendorEntity loadVendorForAdmin(AuthenticatedUser user) {
        EmployeeEntity employee = user.employeeId() == null
                ? employeeRepository.findByVendor_IdOrderByNameAsc(user.vendorId()).stream().findFirst().orElse(null)
                : employeeRepository.findByIdAndVendor_Id(user.employeeId(), user.vendorId()).orElse(null);
        if (employee == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a branch and employee before creating holidays.");
        }
        return employee.getVendor();
    }

    private LeaveType parseLeaveType(String value) {
        try {
            return LeaveType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Leave type must be PAID or UNPAID.");
        }
    }

    private LeaveStatus parseDecisionStatus(String value) {
        try {
            LeaveStatus status = LeaveStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
            if (status == LeaveStatus.PENDING) {
                throw new IllegalArgumentException();
            }
            return status;
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Leave decision must be APPROVED or REJECTED.");
        }
    }

    private LocalDate parseDate(String value, String errorMessage) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
    }

    private boolean overlaps(LocalDate startA, LocalDate endA, LocalDate startB, LocalDate endB) {
        return !startA.isAfter(endB) && !startB.isAfter(endA);
    }

    private List<LocalDate> expandDates(LocalDate startDate, LocalDate endDate, LocalDate clampStart, LocalDate clampEnd) {
        LocalDate effectiveStart = startDate.isAfter(clampStart) ? startDate : clampStart;
        LocalDate effectiveEnd = endDate.isBefore(clampEnd) ? endDate : clampEnd;
        if (effectiveEnd.isBefore(effectiveStart)) {
            return List.of();
        }
        return effectiveStart.datesUntil(effectiveEnd.plusDays(1)).toList();
    }

    private int resolveWorkedDayUnits(AttendanceRecordEntity record) {
        if (record.getCheckInTime() == null || record.getCheckOutTime() == null) {
            return 0;
        }

        long minutesWorked = java.time.Duration.between(record.getCheckInTime(), record.getCheckOutTime()).toMinutes();
        int halfDayMinutes = record.getBranch().getHalfDayMinutes() == null ? 240 : record.getBranch().getHalfDayMinutes();
        if (minutesWorked >= halfDayMinutes) {
            return 1;
        }
        return 0;
    }

    private LeaveRequestResponse toLeaveResponse(LeaveRequestEntity request) {
        return new LeaveRequestResponse(
                request.getId().toString(),
                request.getEmployee().getId().toString(),
                request.getEmployee().getName(),
                request.getBranch().getName(),
                request.getLeaveType().name(),
                request.getStatus().name(),
                request.getStartDate().toString(),
                request.getEndDate().toString(),
                (int) ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1,
                request.getReason(),
                request.getReviewNote(),
                request.getCreatedAt().toString(),
                request.getReviewedAt() == null ? null : request.getReviewedAt().toString()
        );
    }

    private HolidayResponse toHolidayResponse(HolidayEntity holiday) {
        return new HolidayResponse(
                holiday.getId().toString(),
                holiday.getName(),
                holiday.getHolidayDate().toString()
        );
    }
}
