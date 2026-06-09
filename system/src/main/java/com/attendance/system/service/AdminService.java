package com.attendance.system.service;

import com.attendance.system.config.TrackingProperties;
import com.attendance.system.dto.AttendanceRowResponse;
import com.attendance.system.dto.AdminTrackingResponse;
import com.attendance.system.dto.BranchResponse;
import com.attendance.system.dto.DashboardSummaryResponse;
import com.attendance.system.dto.EmployeeResponse;
import com.attendance.system.dto.EmployeeStatusRequest;
import com.attendance.system.dto.EmployeeUpsertRequest;
import com.attendance.system.dto.PayrollSummaryResponse;
import com.attendance.system.model.AttendanceLocationLogEntity;
import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.EmployeeEntity;
import com.attendance.system.model.HolidayEntity;
import com.attendance.system.model.LeaveRequestEntity;
import com.attendance.system.model.LeaveStatus;
import com.attendance.system.model.LeaveType;
import com.attendance.system.model.UserEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.repository.AttendanceLocationLogRepository;
import com.attendance.system.repository.AttendanceRecordRepository;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.repository.HolidayRepository;
import com.attendance.system.repository.LeaveRequestRepository;
import com.attendance.system.repository.UserRepository;
import com.attendance.system.security.AuthenticatedUser;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminService {
    private final EmployeeRepository employeeRepository;
    private final BranchRepository branchRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceLocationLogRepository attendanceLocationLogRepository;
    private final UserRepository userRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final HolidayRepository holidayRepository;
    private final AttendanceMapper mapper;
    private final TrackingProperties trackingProperties;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            EmployeeRepository employeeRepository,
            BranchRepository branchRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            AttendanceLocationLogRepository attendanceLocationLogRepository,
            UserRepository userRepository,
            LeaveRequestRepository leaveRequestRepository,
            HolidayRepository holidayRepository,
            AttendanceMapper mapper,
            TrackingProperties trackingProperties,
            PasswordEncoder passwordEncoder
    ) {
        this.employeeRepository = employeeRepository;
        this.branchRepository = branchRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.attendanceLocationLogRepository = attendanceLocationLogRepository;
        this.userRepository = userRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.holidayRepository = holidayRepository;
        this.mapper = mapper;
        this.trackingProperties = trackingProperties;
        this.passwordEncoder = passwordEncoder;
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
        return employeeRepository.findByVendor_IdOrderByNameAsc(user.vendorId()).stream()
                .filter(employee -> !"REMOVED".equalsIgnoreCase(employee.getStatus()))
                .map(mapper::toEmployeeResponse)
                .toList();
    }

    @Transactional
    public EmployeeResponse createEmployee(AuthenticatedUser user, EmployeeUpsertRequest request) {
        requireAdmin(user);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String employeeCode = request.employeeCode().trim().toUpperCase(Locale.ROOT);
        if (employeeRepository.existsByEmailIgnoreCase(email) || userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee email is already registered.");
        }
        if (employeeRepository.existsByEmployeeCodeIgnoreCaseAndVendor_Id(employeeCode, user.vendorId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee code is already in use.");
        }

        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        EmployeeEntity employee = new EmployeeEntity();
        populateEmployee(employee, branch, request, employeeCode, email);
        employee.setStatus("ACTIVE");
        employee = employeeRepository.save(employee);

        UserEntity employeeUser = new UserEntity();
        employeeUser.setVendor(branch.getVendor());
        employeeUser.setEmployee(employee);
        employeeUser.setName(employee.getName());
        employeeUser.setEmail(employee.getEmail());
        employeeUser.setPasswordHash(passwordEncoder.encode("password"));
        employeeUser.setRole(UserRole.EMPLOYEE);
        employeeUser.setActive(true);
        userRepository.save(employeeUser);
        return mapper.toEmployeeResponse(employee);
    }

    @Transactional
    public EmployeeResponse updateEmployee(AuthenticatedUser user, String employeeId, EmployeeUpsertRequest request) {
        requireAdmin(user);
        EmployeeEntity employee = loadEmployee(user.vendorId(), employeeId);
        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String employeeCode = request.employeeCode().trim().toUpperCase(Locale.ROOT);

        if (!employee.getEmail().equalsIgnoreCase(email)
                && (employeeRepository.existsByEmailIgnoreCase(email) || userRepository.existsByEmailIgnoreCase(email))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee email is already registered.");
        }
        if (!employee.getEmployeeCode().equalsIgnoreCase(employeeCode)
                && employeeRepository.existsByEmployeeCodeIgnoreCaseAndVendor_Id(employeeCode, user.vendorId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee code is already in use.");
        }

        populateEmployee(employee, branch, request, employeeCode, email);
        EmployeeEntity savedEmployee = employeeRepository.save(employee);
        userRepository.findByEmployee_Id(savedEmployee.getId()).ifPresent(employeeUser -> {
            employeeUser.setName(savedEmployee.getName());
            employeeUser.setEmail(savedEmployee.getEmail());
            employeeUser.setActive("ACTIVE".equalsIgnoreCase(savedEmployee.getStatus()));
            userRepository.save(employeeUser);
        });
        return mapper.toEmployeeResponse(savedEmployee);
    }

    @Transactional
    public EmployeeResponse updateEmployeeStatus(AuthenticatedUser user, String employeeId, EmployeeStatusRequest request) {
        requireAdmin(user);
        EmployeeEntity employee = loadEmployee(user.vendorId(), employeeId);
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACTIVE", "INACTIVE").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee status must be ACTIVE or INACTIVE.");
        }
        employee.setStatus(status);
        EmployeeEntity savedEmployee = employeeRepository.save(employee);
        userRepository.findByEmployee_Id(savedEmployee.getId()).ifPresent(employeeUser -> {
            employeeUser.setActive("ACTIVE".equals(status));
            userRepository.save(employeeUser);
        });
        return mapper.toEmployeeResponse(savedEmployee);
    }

    @Transactional
    public void removeEmployee(AuthenticatedUser user, String employeeId) {
        requireAdmin(user);
        EmployeeEntity employee = loadEmployee(user.vendorId(), employeeId);
        employee.setStatus("REMOVED");
        employee.setEmail("removed-" + employee.getId() + "@archived.local");
        employeeRepository.save(employee);
        userRepository.findByEmployee_Id(employee.getId()).ifPresent(employeeUser -> {
            employeeUser.setActive(false);
            employeeUser.setEmail("removed-user-" + employee.getId() + "@archived.local");
            userRepository.save(employeeUser);
        });
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
        if (!trackingProperties.enabled()) {
            return new AdminTrackingResponse(false, trackingDate.toString(), List.of());
        }

        List<AttendanceLocationLogEntity> logs;
        try {
            logs = attendanceLocationLogRepository
                    .findByVendor_IdAndAttendanceRecord_AttendanceDateOrderByEmployee_NameAscCapturedAtAsc(user.vendorId(), trackingDate);
        } catch (DataAccessException exception) {
            return new AdminTrackingResponse(true, trackingDate.toString(), List.of());
        }

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

        return new AdminTrackingResponse(true, trackingDate.toString(), List.copyOf(routeMap.values()));
    }

    @Transactional(readOnly = true)
    public PayrollSummaryResponse payroll(AuthenticatedUser user, String month) {
        requireAdmin(user);
        YearMonth targetMonth = parseMonth(month);
        LocalDate startDate = targetMonth.atDay(1);
        LocalDate endDate = targetMonth.atEndOfMonth();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate completedThrough;
        int daysCounted;
        if (targetMonth.isAfter(YearMonth.from(today))) {
            completedThrough = startDate.minusDays(1);
            daysCounted = 0;
        } else if (targetMonth.equals(YearMonth.from(today))) {
            completedThrough = today.minusDays(1);
            daysCounted = Math.max(Math.min(today.getDayOfMonth() - 1, targetMonth.lengthOfMonth()), 0);
        } else {
            completedThrough = endDate;
            daysCounted = targetMonth.lengthOfMonth();
        }

        List<PayrollSummaryResponse.EmployeePayrollRow> rows = employeeRepository.findByVendor_IdOrderByNameAsc(user.vendorId()).stream()
                .filter(employee -> !"REMOVED".equalsIgnoreCase(employee.getStatus()))
                .map(employee -> buildPayrollRow(employee, startDate, completedThrough, endDate, daysCounted))
                .toList();
        return new PayrollSummaryResponse(targetMonth.toString(), rows);
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

    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return YearMonth.now(ZoneOffset.UTC);
        }

        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payroll month must use YYYY-MM format.");
        }
    }

    private BranchEntity loadBranch(UUID vendorId, String branchId) {
        return branchRepository.findByIdAndVendor_Id(UUID.fromString(branchId), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found."));
    }

    private EmployeeEntity loadEmployee(UUID vendorId, String employeeId) {
        return employeeRepository.findByIdAndVendor_Id(UUID.fromString(employeeId), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found."));
    }

    private void populateEmployee(
            EmployeeEntity employee,
            BranchEntity branch,
            EmployeeUpsertRequest request,
            String employeeCode,
            String email
    ) {
        employee.setVendor(branch.getVendor());
        employee.setBranch(branch);
        employee.setEmployeeCode(employeeCode);
        employee.setName(request.name().trim());
        employee.setDesignation(request.designation().trim());
        employee.setEmail(email);
        employee.setPhone(request.phone().trim());
        employee.setMonthlySalary(scaleMoney(request.monthlySalary()));
        employee.setMonthlyLeaveAllowance(request.monthlyLeaveAllowance());
        employee.setAdvancePaid(scaleMoney(request.advancePaid()));
        if (employee.getStatus() == null || employee.getStatus().isBlank()) {
            employee.setStatus("ACTIVE");
        }
    }

    private PayrollSummaryResponse.EmployeePayrollRow buildPayrollRow(
            EmployeeEntity employee,
            LocalDate startDate,
            LocalDate completedThrough,
            LocalDate endDate,
            int daysCounted
    ) {
        if (daysCounted == 0 || completedThrough.isBefore(startDate)) {
            BigDecimal monthlySalary = safeMoney(employee.getMonthlySalary());
            BigDecimal advancePaid = safeMoney(employee.getAdvancePaid());
            return new PayrollSummaryResponse.EmployeePayrollRow(
                    employee.getId().toString(),
                    employee.getName(),
                    employee.getDesignation(),
                    employee.getStatus(),
                    moneyValue(monthlySalary),
                    0,
                    0,
                    employee.getMonthlyLeaveAllowance() == null ? 0 : employee.getMonthlyLeaveAllowance(),
                    0,
                    0,
                    0,
                    moneyValue(BigDecimal.ZERO),
                    moneyValue(BigDecimal.ZERO),
                    moneyValue(advancePaid),
                    moneyValue(BigDecimal.ZERO)
            );
        }

        Set<LocalDate> workedDates = attendanceRecordRepository
                .findByEmployee_IdAndAttendanceDateBetweenOrderByAttendanceDateAsc(employee.getId(), startDate, completedThrough)
                .stream()
                .map(AttendanceRecordEntity::getAttendanceDate)
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));

        Set<LocalDate> holidayDates = holidayRepository
                .findByVendor_IdAndHolidayDateBetweenOrderByHolidayDateAsc(employee.getVendor().getId(), startDate, completedThrough)
                .stream()
                .map(HolidayEntity::getHolidayDate)
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));

        List<LeaveRequestEntity> approvedLeaves = leaveRequestRepository
                .findByEmployee_IdAndStatusAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
                        employee.getId(),
                        LeaveStatus.APPROVED,
                        startDate,
                        completedThrough
                );

        Set<LocalDate> requestedPaidLeaveDates = new HashSet<>();
        Set<LocalDate> requestedUnpaidLeaveDates = new HashSet<>();
        for (LeaveRequestEntity leaveRequest : approvedLeaves) {
            Set<LocalDate> targetSet = leaveRequest.getLeaveType() == LeaveType.PAID
                    ? requestedPaidLeaveDates
                    : requestedUnpaidLeaveDates;
            expandDates(leaveRequest.getStartDate(), leaveRequest.getEndDate(), startDate, completedThrough).stream()
                    .filter(date -> !holidayDates.contains(date) && !workedDates.contains(date))
                    .forEach(targetSet::add);
        }

        int workedDays = 0;
        int holidayDays = 0;
        int requestedPaidLeaveDays = 0;
        int requestedUnpaidLeaveDays = 0;
        int absenceDays = 0;
        for (LocalDate date = startDate; !date.isAfter(completedThrough); date = date.plusDays(1)) {
            if (holidayDates.contains(date)) {
                holidayDays++;
            } else if (workedDates.contains(date)) {
                workedDays++;
            } else if (requestedPaidLeaveDates.contains(date)) {
                requestedPaidLeaveDays++;
            } else if (requestedUnpaidLeaveDates.contains(date)) {
                requestedUnpaidLeaveDays++;
            } else {
                absenceDays++;
            }
        }

        int allowedLeaves = employee.getMonthlyLeaveAllowance() == null ? 0 : employee.getMonthlyLeaveAllowance();
        int approvedPaidLeavesCounted = Math.min(requestedPaidLeaveDays, allowedLeaves);
        int overflowApprovedPaidLeaves = Math.max(requestedPaidLeaveDays - approvedPaidLeavesCounted, 0);
        int remainingAllowance = Math.max(allowedLeaves - approvedPaidLeavesCounted, 0);
        int autoPaidAbsenceDays = Math.min(absenceDays, remainingAllowance);
        int paidLeaveDays = approvedPaidLeavesCounted + autoPaidAbsenceDays;
        int unpaidLeaveDays = requestedUnpaidLeaveDays + overflowApprovedPaidLeaves + Math.max(absenceDays - autoPaidAbsenceDays, 0);
        int payableDays = workedDays + holidayDays + paidLeaveDays;
        BigDecimal monthlySalary = safeMoney(employee.getMonthlySalary());
        BigDecimal dailyRate = daysCounted == 0
                ? BigDecimal.ZERO
                : monthlySalary.divide(BigDecimal.valueOf(endDate.lengthOfMonth()), 2, RoundingMode.HALF_UP);
        BigDecimal grossPayable = dailyRate.multiply(BigDecimal.valueOf(payableDays)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal advancePaid = safeMoney(employee.getAdvancePaid());
        BigDecimal netPayable = grossPayable.subtract(advancePaid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        return new PayrollSummaryResponse.EmployeePayrollRow(
                employee.getId().toString(),
                employee.getName(),
                employee.getDesignation(),
                employee.getStatus(),
                moneyValue(monthlySalary),
                daysCounted,
                workedDays,
                allowedLeaves,
                paidLeaveDays,
                unpaidLeaveDays,
                payableDays,
                moneyValue(dailyRate),
                moneyValue(grossPayable),
                moneyValue(advancePaid),
                moneyValue(netPayable)
        );
    }

    private PayrollSummaryResponse.BigDecimalValue moneyValue(BigDecimal amount) {
        return new PayrollSummaryResponse.BigDecimalValue(scaleMoney(amount).toPlainString());
    }

    private BigDecimal safeMoney(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : scaleMoney(amount);
    }

    private BigDecimal scaleMoney(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private Set<LocalDate> expandDates(LocalDate startDate, LocalDate endDate, LocalDate clampStart, LocalDate clampEnd) {
        LocalDate effectiveStart = startDate.isAfter(clampStart) ? startDate : clampStart;
        LocalDate effectiveEnd = endDate.isBefore(clampEnd) ? endDate : clampEnd;
        if (effectiveEnd.isBefore(effectiveStart)) {
            return Set.of();
        }
        return effectiveStart.datesUntil(effectiveEnd.plusDays(1))
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));
    }
}
