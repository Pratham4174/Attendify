package com.attendance.system.service;

import com.attendance.system.dto.RosterAssignmentResponse;
import com.attendance.system.dto.RosterAssignmentUpsertRequest;
import com.attendance.system.dto.RosterConflictResponse;
import com.attendance.system.dto.RosterExceptionReportResponse;
import com.attendance.system.dto.RosterGenerateRequest;
import com.attendance.system.dto.RosterMonthlyViewResponse;
import com.attendance.system.dto.RosterPublishRequest;
import com.attendance.system.dto.RosterPublishResponse;
import com.attendance.system.dto.RosterSwapDecisionRequest;
import com.attendance.system.dto.RosterSwapRequestCreateRequest;
import com.attendance.system.dto.RosterSwapRequestResponse;
import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.EmployeeEntity;
import com.attendance.system.model.HolidayEntity;
import com.attendance.system.model.RosterAssignmentEntity;
import com.attendance.system.model.RosterEditAuditLogEntity;
import com.attendance.system.model.RosterShiftEntity;
import com.attendance.system.model.RosterTemplateEntity;
import com.attendance.system.model.ShiftSwapRequestEntity;
import com.attendance.system.model.UserEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.repository.AttendanceRecordRepository;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.repository.HolidayRepository;
import com.attendance.system.repository.RosterAssignmentRepository;
import com.attendance.system.repository.RosterEditAuditLogRepository;
import com.attendance.system.repository.RosterShiftRepository;
import com.attendance.system.repository.RosterTemplateRepository;
import com.attendance.system.repository.ShiftSwapRequestRepository;
import com.attendance.system.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RosterOperationsService {
    private final BranchRepository branchRepository;
    private final EmployeeRepository employeeRepository;
    private final RosterShiftRepository rosterShiftRepository;
    private final RosterTemplateRepository rosterTemplateRepository;
    private final RosterAssignmentRepository rosterAssignmentRepository;
    private final ShiftSwapRequestRepository shiftSwapRequestRepository;
    private final RosterEditAuditLogRepository rosterEditAuditLogRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final HolidayRepository holidayRepository;
    private final UserRepository userRepository;

    public RosterOperationsService(
            BranchRepository branchRepository,
            EmployeeRepository employeeRepository,
            RosterShiftRepository rosterShiftRepository,
            RosterTemplateRepository rosterTemplateRepository,
            RosterAssignmentRepository rosterAssignmentRepository,
            ShiftSwapRequestRepository shiftSwapRequestRepository,
            RosterEditAuditLogRepository rosterEditAuditLogRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            HolidayRepository holidayRepository,
            UserRepository userRepository
    ) {
        this.branchRepository = branchRepository;
        this.employeeRepository = employeeRepository;
        this.rosterShiftRepository = rosterShiftRepository;
        this.rosterTemplateRepository = rosterTemplateRepository;
        this.rosterAssignmentRepository = rosterAssignmentRepository;
        this.shiftSwapRequestRepository = shiftSwapRequestRepository;
        this.rosterEditAuditLogRepository = rosterEditAuditLogRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.holidayRepository = holidayRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RosterMonthlyViewResponse generateMonthlyRoster(AuthenticatedUser user, RosterGenerateRequest request) {
        requireAdmin(user);
        YearMonth targetMonth = parseMonth(request.month());
        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        RosterTemplateEntity template = loadTemplate(user.vendorId(), request.templateId());
        if (template.getBranch() != null && !template.getBranch().getId().equals(branch.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected template does not belong to this branch.");
        }

        List<RosterShiftEntity> templateShifts = loadTemplateShifts(user.vendorId(), template);
        if (templateShifts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template has no active shifts attached.");
        }

        List<EmployeeEntity> employees = employeeRepository.findByVendor_IdAndBranch_IdAndStatusOrderByNameAsc(
                user.vendorId(),
                branch.getId(),
                "ACTIVE"
        );
        if (employees.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active employees found in this branch.");
        }

        LocalDate startDate = targetMonth.atDay(1);
        LocalDate endDate = targetMonth.atEndOfMonth();
        List<RosterAssignmentEntity> existingAssignments = rosterAssignmentRepository
                .findByVendor_IdAndBranch_IdAndAssignmentDateBetweenOrderByEmployee_NameAscAssignmentDateAsc(
                        user.vendorId(),
                        branch.getId(),
                        startDate,
                        endDate
                );
        if (!existingAssignments.isEmpty()) {
            rosterAssignmentRepository.deleteAll(existingAssignments);
        }

        Set<LocalDate> holidayDates = holidayRepository.findByVendor_IdAndHolidayDateBetweenOrderByHolidayDateAsc(
                        user.vendorId(),
                        startDate,
                        endDate
                ).stream()
                .map(HolidayEntity::getHolidayDate)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<String> weeklyOffDays = parseCsv(template.getWeeklyOffDaysCsv());
        String weeklyOffMode = normalizeMode(template.getWeeklyOffMode(), branch.getWeeklyOffMode());
        Map<UUID, List<RosterAssignmentEntity>> assignmentsByEmployee = new HashMap<>();
        List<RosterAssignmentEntity> generatedAssignments = new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            for (int index = 0; index < employees.size(); index++) {
                EmployeeEntity employee = employees.get(index);
                if (isWeeklyOff(date, weeklyOffDays, weeklyOffMode, index)) {
                    continue;
                }
                if (holidayDates.contains(date) && !"WORKING_PREMIUM_PAY".equalsIgnoreCase(template.getHolidayPolicy())) {
                    continue;
                }

                List<RosterShiftEntity> orderedShiftChoices = rotateShifts(templateShifts, index + date.getDayOfMonth() - 1);
                RosterShiftEntity selectedShift = selectShiftForEmployee(
                        employee,
                        date,
                        orderedShiftChoices,
                        assignmentsByEmployee.getOrDefault(employee.getId(), List.of()),
                        template.getMaxConsecutiveNightShifts(),
                        template.getMinRestHours()
                );
                if (selectedShift == null) {
                    continue;
                }

                RosterAssignmentEntity assignment = new RosterAssignmentEntity();
                assignment.setVendor(branch.getVendor());
                assignment.setBranch(branch);
                assignment.setEmployee(employee);
                assignment.setRosterShift(selectedShift);
                assignment.setAssignmentDate(date);
                assignment.setAssignmentType(holidayDates.contains(date) ? "HOLIDAY_WORK" : "WORKING");
                assignment.setStatus("DRAFT");
                assignment.setNotes("Auto-generated from template " + template.getName());
                assignment.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
                assignment.setUpdatedAt(assignment.getCreatedAt());
                generatedAssignments.add(assignment);
                assignmentsByEmployee.computeIfAbsent(employee.getId(), ignored -> new ArrayList<>()).add(assignment);
            }
        }

        rosterAssignmentRepository.saveAll(generatedAssignments);
        writeAuditLog(
                user,
                branch,
                "GENERATE",
                "ROSTER_MONTH",
                branch.getId().toString() + ":" + targetMonth,
                "Generated monthly roster from template " + template.getName(),
                null,
                "{\"template\":\"" + template.getName() + "\",\"month\":\"" + targetMonth + "\",\"assignments\":" + generatedAssignments.size() + "}"
        );
        return getMonthlyView(user, request.branchId(), request.month());
    }

    @Transactional
    public RosterAssignmentResponse saveAssignment(AuthenticatedUser user, String assignmentId, RosterAssignmentUpsertRequest request) {
        requireAdmin(user);
        EmployeeEntity employee = loadEmployee(user.vendorId(), request.employeeId());
        RosterShiftEntity shift = loadShift(user.vendorId(), request.shiftId());
        LocalDate assignmentDate = parseDate(request.assignmentDate(), "Assignment date must use YYYY-MM-DD format.");
        if (!employee.getBranch().getId().equals(shift.getBranch().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee and shift must belong to the same branch.");
        }

        Optional<RosterAssignmentEntity> existingOnDate = rosterAssignmentRepository
                .findByEmployee_IdAndAssignmentDateOrderByCreatedAtAsc(employee.getId(), assignmentDate)
                .stream()
                .filter(candidate -> assignmentId == null || !candidate.getId().toString().equals(assignmentId))
                .findFirst();
        if (existingOnDate.isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This employee already has a roster assignment on the selected date.");
        }

        RosterAssignmentEntity assignment;
        String beforeSnapshot = null;
        if (assignmentId == null) {
            assignment = new RosterAssignmentEntity();
            assignment.setVendor(employee.getVendor());
            assignment.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        } else {
            assignment = rosterAssignmentRepository.findByIdAndVendor_Id(UUID.fromString(assignmentId), user.vendorId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roster assignment not found."));
            beforeSnapshot = assignmentSnapshot(assignment);
        }

        assignment.setBranch(employee.getBranch());
        assignment.setEmployee(employee);
        assignment.setRosterShift(shift);
        assignment.setAssignmentDate(assignmentDate);
        assignment.setAssignmentType(normalizeAssignmentType(request.assignmentType()));
        assignment.setStatus(assignment.getStatus() == null ? "DRAFT" : assignment.getStatus());
        assignment.setNotes(request.notes() == null ? null : request.notes().trim());
        assignment.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        if (hasRestConflict(assignment, user.vendorId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This assignment violates minimum rest gap for the employee.");
        }

        RosterAssignmentEntity saved = rosterAssignmentRepository.save(assignment);
        writeAuditLog(
                user,
                saved.getBranch(),
                assignmentId == null ? "CREATE" : "UPDATE",
                "ROSTER_ASSIGNMENT",
                saved.getId().toString(),
                "Saved roster assignment",
                beforeSnapshot,
                assignmentSnapshot(saved)
        );
        return toAssignmentResponse(saved);
    }

    @Transactional
    public void deleteAssignment(AuthenticatedUser user, String assignmentId) {
        requireAdmin(user);
        RosterAssignmentEntity assignment = rosterAssignmentRepository.findByIdAndVendor_Id(UUID.fromString(assignmentId), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roster assignment not found."));
        String beforeSnapshot = assignmentSnapshot(assignment);
        rosterAssignmentRepository.delete(assignment);
        writeAuditLog(
                user,
                assignment.getBranch(),
                "DELETE",
                "ROSTER_ASSIGNMENT",
                assignment.getId().toString(),
                "Deleted roster assignment",
                beforeSnapshot,
                null
        );
    }

    @Transactional
    public RosterPublishResponse publish(AuthenticatedUser user, RosterPublishRequest request) {
        requireAdmin(user);
        YearMonth targetMonth = parseMonth(request.month());
        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        List<RosterAssignmentEntity> assignments = rosterAssignmentRepository
                .findByVendor_IdAndBranch_IdAndAssignmentDateBetweenOrderByEmployee_NameAscAssignmentDateAsc(
                        user.vendorId(),
                        branch.getId(),
                        targetMonth.atDay(1),
                        targetMonth.atEndOfMonth()
                );
        if (assignments.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No roster assignments found for the selected month.");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        assignments.forEach(assignment -> {
            assignment.setStatus("PUBLISHED");
            assignment.setUpdatedAt(now);
        });
        rosterAssignmentRepository.saveAll(assignments);

        Set<String> notifyChannels = request.notifyChannels() == null ? Set.of() : new LinkedHashSet<>(request.notifyChannels());
        writeAuditLog(
                user,
                branch,
                "PUBLISH",
                "ROSTER_MONTH",
                branch.getId().toString() + ":" + targetMonth,
                "Published monthly roster",
                null,
                "{\"month\":\"" + targetMonth + "\",\"notifyChannels\":\"" + String.join(",", notifyChannels) + "\"}"
        );

        int employeesAffected = (int) assignments.stream().map(item -> item.getEmployee().getId()).distinct().count();
        return new RosterPublishResponse(
                targetMonth.toString(),
                branch.getId().toString(),
                assignments.size(),
                employeesAffected,
                notifyChannels.isEmpty()
                        ? "Roster published. Employees can now view the roster."
                        : "Roster published. Notifications queued for " + String.join(", ", notifyChannels) + "."
        );
    }

    @Transactional
    public RosterSwapRequestResponse createSwapRequest(AuthenticatedUser user, RosterSwapRequestCreateRequest request) {
        requireEmployee(user);
        EmployeeEntity requester = loadEmployee(user.vendorId(), user.employeeId().toString());
        RosterAssignmentEntity requesterAssignment = rosterAssignmentRepository.findByIdAndVendor_Id(UUID.fromString(request.requesterAssignmentId()), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Requester assignment not found."));
        RosterAssignmentEntity targetAssignment = rosterAssignmentRepository.findByIdAndVendor_Id(UUID.fromString(request.targetAssignmentId()), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target assignment not found."));
        if (!requesterAssignment.getEmployee().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can request swaps only for your own roster.");
        }
        if (!requesterAssignment.getBranch().getId().equals(targetAssignment.getBranch().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shift swaps are allowed only within the same branch.");
        }

        ShiftSwapRequestEntity swap = new ShiftSwapRequestEntity();
        swap.setVendor(requester.getVendor());
        swap.setBranch(requesterAssignment.getBranch());
        swap.setRequesterEmployee(requester);
        swap.setTargetEmployee(targetAssignment.getEmployee());
        swap.setRequesterAssignment(requesterAssignment);
        swap.setTargetAssignment(targetAssignment);
        swap.setStatus("PENDING");
        swap.setReason(request.reason() == null || request.reason().isBlank() ? "Requested by employee" : request.reason().trim());
        swap.setRequestedAt(OffsetDateTime.now(ZoneOffset.UTC));
        ShiftSwapRequestEntity saved = shiftSwapRequestRepository.save(swap);
        return toSwapResponse(saved);
    }

    @Transactional
    public RosterSwapRequestResponse decideSwapRequest(AuthenticatedUser user, String swapRequestId, RosterSwapDecisionRequest request) {
        requireAdmin(user);
        ShiftSwapRequestEntity swap = shiftSwapRequestRepository.findByIdAndVendor_Id(UUID.fromString(swapRequestId), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift swap request not found."));
        if (!"PENDING".equalsIgnoreCase(swap.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This shift swap request has already been reviewed.");
        }

        String decision = request.decision().trim().toUpperCase(Locale.ROOT);
        if (!List.of("APPROVED", "REJECTED").contains(decision)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decision must be APPROVED or REJECTED.");
        }

        UserEntity actorUser = userRepository.findById(user.userId()).orElse(null);
        swap.setStatus(decision);
        swap.setReviewNote(request.reviewNote() == null ? null : request.reviewNote().trim());
        swap.setReviewedByUser(actorUser);
        swap.setReviewedAt(OffsetDateTime.now(ZoneOffset.UTC));

        if ("APPROVED".equals(decision)) {
            RosterAssignmentEntity requesterAssignment = swap.getRequesterAssignment();
            RosterAssignmentEntity targetAssignment = swap.getTargetAssignment();
            String beforeRequester = assignmentSnapshot(requesterAssignment);
            String beforeTarget = assignmentSnapshot(targetAssignment);

            RosterShiftEntity requesterShift = requesterAssignment.getRosterShift();
            requesterAssignment.setRosterShift(targetAssignment.getRosterShift());
            targetAssignment.setRosterShift(requesterShift);
            requesterAssignment.setNotes(appendSystemNote(requesterAssignment.getNotes(), "Shift swapped via approved request."));
            targetAssignment.setNotes(appendSystemNote(targetAssignment.getNotes(), "Shift swapped via approved request."));
            requesterAssignment.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
            targetAssignment.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

            if (hasRestConflict(requesterAssignment, user.vendorId()) || hasRestConflict(targetAssignment, user.vendorId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Approving this swap would create a roster rest-gap conflict.");
            }

            rosterAssignmentRepository.save(requesterAssignment);
            rosterAssignmentRepository.save(targetAssignment);

            writeAuditLog(
                    user,
                    requesterAssignment.getBranch(),
                    "SWAP_APPROVE",
                    "ROSTER_ASSIGNMENT",
                    requesterAssignment.getId().toString(),
                    "Approved shift swap request",
                    beforeRequester + " || " + beforeTarget,
                    assignmentSnapshot(requesterAssignment) + " || " + assignmentSnapshot(targetAssignment)
            );
        } else {
            writeAuditLog(
                    user,
                    swap.getBranch(),
                    "SWAP_REJECT",
                    "SHIFT_SWAP_REQUEST",
                    swap.getId().toString(),
                    "Rejected shift swap request",
                    null,
                    "{\"status\":\"REJECTED\"}"
            );
        }

        return toSwapResponse(shiftSwapRequestRepository.save(swap));
    }

    @Transactional
    public List<RosterSwapRequestResponse> listSwapRequestsForAdmin(AuthenticatedUser user) {
        requireAdmin(user);
        return shiftSwapRequestRepository.findByVendor_IdOrderByRequestedAtDesc(user.vendorId()).stream()
                .map(this::toSwapResponse)
                .toList();
    }

    @Transactional
    public List<RosterSwapRequestResponse> listSwapRequestsForEmployee(AuthenticatedUser user) {
        requireEmployee(user);
        return shiftSwapRequestRepository.findByRequesterEmployee_IdOrderByRequestedAtDesc(user.employeeId()).stream()
                .map(this::toSwapResponse)
                .toList();
    }

    @Transactional
    public RosterMonthlyViewResponse getMonthlyView(AuthenticatedUser user, String branchId, String month) {
        requireAdmin(user);
        BranchEntity branch = loadBranch(user.vendorId(), branchId);
        YearMonth targetMonth = parseMonth(month);
        LocalDate startDate = targetMonth.atDay(1);
        LocalDate endDate = targetMonth.atEndOfMonth();
        List<RosterAssignmentEntity> assignments = rosterAssignmentRepository
                .findByVendor_IdAndBranch_IdAndAssignmentDateBetweenOrderByEmployee_NameAscAssignmentDateAsc(
                        user.vendorId(),
                        branch.getId(),
                        startDate,
                        endDate
                );
        List<EmployeeEntity> employees = employeeRepository.findByVendor_IdAndBranch_IdAndStatusOrderByNameAsc(
                user.vendorId(),
                branch.getId(),
                "ACTIVE"
        );
        List<String> dates = startDate.datesUntil(endDate.plusDays(1)).map(LocalDate::toString).toList();

        Map<UUID, List<RosterAssignmentResponse>> assignmentsByEmployee = new LinkedHashMap<>();
        boolean published = false;
        for (RosterAssignmentEntity assignment : assignments) {
            assignmentsByEmployee.computeIfAbsent(assignment.getEmployee().getId(), ignored -> new ArrayList<>()).add(toAssignmentResponse(assignment));
            if ("PUBLISHED".equalsIgnoreCase(assignment.getStatus())) {
                published = true;
            }
        }

        List<RosterMonthlyViewResponse.EmployeeMonthRosterRow> employeeRows = employees.stream()
                .map(employee -> new RosterMonthlyViewResponse.EmployeeMonthRosterRow(
                        employee.getId().toString(),
                        employee.getName(),
                        employee.getDesignation(),
                        assignmentsByEmployee.getOrDefault(employee.getId(), List.of())
                ))
                .toList();

        return new RosterMonthlyViewResponse(
                targetMonth.toString(),
                branch.getId().toString(),
                branch.getName(),
                published,
                dates,
                employeeRows,
                detectConflictsInternal(branch, assignments, startDate, endDate)
        );
    }

    @Transactional
    public RosterExceptionReportResponse getExceptionReport(AuthenticatedUser user, String branchId, String date) {
        requireAdmin(user);
        BranchEntity branch = loadBranch(user.vendorId(), branchId);
        LocalDate targetDate = parseDate(date, "Exception date must use YYYY-MM-DD format.");
        List<EmployeeEntity> employees = employeeRepository.findByVendor_IdAndBranch_IdAndStatusOrderByNameAsc(
                user.vendorId(),
                branch.getId(),
                "ACTIVE"
        );

        List<RosterExceptionReportResponse.RosterExceptionRow> rows = new ArrayList<>();
        for (EmployeeEntity employee : employees) {
            RosterAssignmentEntity assignment = rosterAssignmentRepository.findByEmployee_IdAndAssignmentDateOrderByCreatedAtAsc(employee.getId(), targetDate)
                    .stream()
                    .findFirst()
                    .orElse(null);
            AttendanceRecordEntity attendance = attendanceRecordRepository
                    .findFirstByEmployee_IdAndAttendanceDateOrderByCheckInTimeDesc(employee.getId(), targetDate)
                    .orElse(null);
            rows.add(buildExceptionRow(employee, branch, assignment, attendance));
        }
        return new RosterExceptionReportResponse(targetDate.toString(), rows);
    }

    @Transactional
    public List<RosterConflictResponse> detectConflicts(AuthenticatedUser user, String branchId, String month) {
        requireAdmin(user);
        BranchEntity branch = loadBranch(user.vendorId(), branchId);
        YearMonth targetMonth = parseMonth(month);
        List<RosterAssignmentEntity> assignments = rosterAssignmentRepository
                .findByVendor_IdAndBranch_IdAndAssignmentDateBetweenOrderByEmployee_NameAscAssignmentDateAsc(
                        user.vendorId(),
                        branch.getId(),
                        targetMonth.atDay(1),
                        targetMonth.atEndOfMonth()
                );
        return detectConflictsInternal(branch, assignments, targetMonth.atDay(1), targetMonth.atEndOfMonth());
    }

    @Transactional
    public String exportMonthlyCsv(AuthenticatedUser user, String branchId, String month) {
        RosterMonthlyViewResponse monthlyView = getMonthlyView(user, branchId, month);
        StringBuilder builder = new StringBuilder("Employee,Designation,Date,Shift,Status,Type\n");
        for (RosterMonthlyViewResponse.EmployeeMonthRosterRow employeeRow : monthlyView.employees()) {
            Map<String, RosterAssignmentResponse> byDate = employeeRow.assignments().stream()
                    .collect(Collectors.toMap(RosterAssignmentResponse::assignmentDate, item -> item, (left, right) -> left, LinkedHashMap::new));
            for (String date : monthlyView.dates()) {
                RosterAssignmentResponse assignment = byDate.get(date);
                builder.append(csv(employeeRow.employeeName())).append(',')
                        .append(csv(employeeRow.designation())).append(',')
                        .append(csv(date)).append(',')
                        .append(csv(assignment == null ? "OFF" : assignment.shiftName())).append(',')
                        .append(csv(assignment == null ? "-" : assignment.status())).append(',')
                        .append(csv(assignment == null ? "WEEKLY_OFF" : assignment.assignmentType()))
                        .append('\n');
            }
        }
        return builder.toString();
    }

    private RosterExceptionReportResponse.RosterExceptionRow buildExceptionRow(
            EmployeeEntity employee,
            BranchEntity branch,
            RosterAssignmentEntity assignment,
            AttendanceRecordEntity attendance
    ) {
        if (assignment == null && attendance == null) {
            return new RosterExceptionReportResponse.RosterExceptionRow(
                    employee.getId().toString(),
                    employee.getName(),
                    branch.getName(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    0,
                    0,
                    0,
                    "OFF"
            );
        }
        if (assignment == null) {
            return new RosterExceptionReportResponse.RosterExceptionRow(
                    employee.getId().toString(),
                    employee.getName(),
                    branch.getName(),
                    null,
                    null,
                    null,
                    attendance == null || attendance.getCheckInTime() == null ? null : attendance.getCheckInTime().toString(),
                    attendance == null || attendance.getCheckOutTime() == null ? null : attendance.getCheckOutTime().toString(),
                    0,
                    0,
                    0,
                    "UNSCHEDULED"
            );
        }

        LocalTime scheduledStart = assignment.getRosterShift().getStartTime();
        LocalTime scheduledEnd = assignment.getRosterShift().getEndTime();
        int lateMinutes = 0;
        int earlyDepartureMinutes = 0;
        int overtimeMinutes = 0;
        String status = "ON_TIME";

        if (attendance == null || attendance.getCheckInTime() == null) {
            status = "ABSENT";
        } else {
            LocalTime actualCheckInTime = attendance.getCheckInTime().toLocalTime();
            if (actualCheckInTime.isAfter(scheduledStart.plusMinutes(branch.getGraceMinutes() == null ? 0 : branch.getGraceMinutes()))) {
                lateMinutes = (int) Duration.between(scheduledStart, actualCheckInTime).toMinutes();
                status = "LATE";
            }
            if (attendance.getCheckOutTime() != null) {
                LocalTime actualCheckOutTime = attendance.getCheckOutTime().toLocalTime();
                if (actualCheckOutTime.isBefore(scheduledEnd)) {
                    earlyDepartureMinutes = (int) Duration.between(actualCheckOutTime, scheduledEnd).toMinutes();
                    if (status.equals("ON_TIME")) {
                        status = "EARLY_DEPARTURE";
                    }
                } else if (actualCheckOutTime.isAfter(scheduledEnd)) {
                    overtimeMinutes = (int) Duration.between(scheduledEnd, actualCheckOutTime).toMinutes();
                    if (status.equals("ON_TIME")) {
                        status = "OVERTIME";
                    }
                }
            }
        }

        return new RosterExceptionReportResponse.RosterExceptionRow(
                employee.getId().toString(),
                employee.getName(),
                branch.getName(),
                assignment.getRosterShift().getName(),
                scheduledStart.toString(),
                scheduledEnd.toString(),
                attendance == null || attendance.getCheckInTime() == null ? null : attendance.getCheckInTime().toString(),
                attendance == null || attendance.getCheckOutTime() == null ? null : attendance.getCheckOutTime().toString(),
                Math.max(lateMinutes, 0),
                Math.max(earlyDepartureMinutes, 0),
                Math.max(overtimeMinutes, 0),
                status
        );
    }

    private List<RosterConflictResponse> detectConflictsInternal(
            BranchEntity branch,
            List<RosterAssignmentEntity> assignments,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<RosterConflictResponse> conflicts = new ArrayList<>();
        Map<String, List<RosterAssignmentEntity>> employeeDateMap = assignments.stream()
                .collect(Collectors.groupingBy(item -> item.getEmployee().getId() + ":" + item.getAssignmentDate()));
        for (List<RosterAssignmentEntity> employeeAssignments : employeeDateMap.values()) {
            if (employeeAssignments.size() > 1) {
                RosterAssignmentEntity sample = employeeAssignments.get(0);
                conflicts.add(new RosterConflictResponse(
                        "DOUBLE_BOOKED",
                        "HIGH",
                        sample.getAssignmentDate().toString(),
                        sample.getEmployee().getId().toString(),
                        sample.getEmployee().getName(),
                        sample.getRosterShift().getId().toString(),
                        sample.getRosterShift().getName(),
                        sample.getEmployee().getName() + " has multiple shift assignments on the same day."
                ));
            }
        }

        Map<String, Long> coverage = assignments.stream()
                .collect(Collectors.groupingBy(item -> item.getAssignmentDate() + ":" + item.getRosterShift().getId(), Collectors.counting()));
        Set<UUID> branchShiftIds = assignments.stream()
                .map(item -> item.getRosterShift().getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<RosterShiftEntity> trackedShifts = branchShiftIds.isEmpty()
                ? rosterShiftRepository.findByVendor_IdAndBranch_IdOrderByNameAsc(branch.getVendor().getId(), branch.getId())
                : assignments.stream().map(RosterAssignmentEntity::getRosterShift).distinct().toList();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            for (RosterShiftEntity shift : trackedShifts) {
                long assigned = coverage.getOrDefault(date + ":" + shift.getId(), 0L);
                if (assigned < shift.getRequiredHeadcount()) {
                    conflicts.add(new RosterConflictResponse(
                            "UNDERSTAFFED",
                            "HIGH",
                            date.toString(),
                            null,
                            null,
                            shift.getId().toString(),
                            shift.getName(),
                            shift.getName() + " on " + date + " has " + assigned + " assigned, needs minimum " + shift.getRequiredHeadcount() + "."
                    ));
                }
            }
        }

        Map<UUID, List<RosterAssignmentEntity>> byEmployee = assignments.stream()
                .collect(Collectors.groupingBy(item -> item.getEmployee().getId()));
        for (List<RosterAssignmentEntity> employeeAssignments : byEmployee.values()) {
            List<RosterAssignmentEntity> ordered = employeeAssignments.stream()
                    .sorted(Comparator.comparing(RosterAssignmentEntity::getAssignmentDate))
                    .toList();
            for (int index = 1; index < ordered.size(); index++) {
                RosterAssignmentEntity current = ordered.get(index);
                RosterAssignmentEntity previous = ordered.get(index - 1);
                long restHours = calculateRestHours(previous, current);
                if (restHours >= 0 && restHours < 8) {
                    conflicts.add(new RosterConflictResponse(
                            "REST_GAP",
                            "MEDIUM",
                            current.getAssignmentDate().toString(),
                            current.getEmployee().getId().toString(),
                            current.getEmployee().getName(),
                            current.getRosterShift().getId().toString(),
                            current.getRosterShift().getName(),
                            current.getEmployee().getName() + " has only " + restHours + "h rest before this shift."
                    ));
                }
            }
        }
        return conflicts;
    }

    private RosterShiftEntity selectShiftForEmployee(
            EmployeeEntity employee,
            LocalDate date,
            List<RosterShiftEntity> orderedShiftChoices,
            List<RosterAssignmentEntity> previousAssignments,
            int maxConsecutiveNights,
            int minRestHours
    ) {
        for (RosterShiftEntity shift : orderedShiftChoices) {
            if (wouldViolateNightLimit(previousAssignments, shift, maxConsecutiveNights)) {
                continue;
            }
            RosterAssignmentEntity probe = new RosterAssignmentEntity();
            probe.setEmployee(employee);
            probe.setRosterShift(shift);
            probe.setAssignmentDate(date);
            if (hasRestConflictWithHistory(probe, previousAssignments, minRestHours)) {
                continue;
            }
            return shift;
        }
        return null;
    }

    private boolean hasRestConflict(RosterAssignmentEntity assignment, UUID vendorId) {
        List<RosterAssignmentEntity> nearbyAssignments = rosterAssignmentRepository.findByEmployee_IdAndAssignmentDateBetweenOrderByAssignmentDateAsc(
                        assignment.getEmployee().getId(),
                        assignment.getAssignmentDate().minusDays(2),
                        assignment.getAssignmentDate().plusDays(2)
                ).stream()
                .filter(item -> !item.getId().equals(assignment.getId()))
                .toList();
        RosterTemplateEntity template = rosterTemplateRepository.findByVendor_IdOrderByNameAsc(vendorId).stream()
                .filter(item -> item.getBranch() != null && item.getBranch().getId().equals(assignment.getBranch().getId()))
                .findFirst()
                .orElse(null);
        int minRestHours = template == null ? 8 : template.getMinRestHours();
        return hasRestConflictWithHistory(assignment, nearbyAssignments, minRestHours);
    }

    private boolean hasRestConflictWithHistory(RosterAssignmentEntity assignment, List<RosterAssignmentEntity> previousAssignments, int minRestHours) {
        for (RosterAssignmentEntity previousAssignment : previousAssignments) {
            long restHoursForward = calculateRestHours(previousAssignment, assignment);
            if (restHoursForward >= 0 && restHoursForward < minRestHours) {
                return true;
            }
            long restHoursBackward = calculateRestHours(assignment, previousAssignment);
            if (restHoursBackward >= 0 && restHoursBackward < minRestHours) {
                return true;
            }
        }
        return false;
    }

    private long calculateRestHours(RosterAssignmentEntity earlier, RosterAssignmentEntity later) {
        LocalDateTime earlierEnd = assignmentEnd(earlier);
        LocalDateTime laterStart = assignmentStart(later);
        if (!laterStart.isAfter(earlierEnd)) {
            return -1;
        }
        return Duration.between(earlierEnd, laterStart).toHours();
    }

    private boolean wouldViolateNightLimit(List<RosterAssignmentEntity> history, RosterShiftEntity shift, int maxConsecutiveNights) {
        if (!shift.isCrossesMidnight()) {
            return false;
        }
        int consecutiveNights = 0;
        List<RosterAssignmentEntity> ordered = history.stream()
                .sorted(Comparator.comparing(RosterAssignmentEntity::getAssignmentDate).reversed())
                .toList();
        for (RosterAssignmentEntity assignment : ordered) {
            if (assignment.getRosterShift().isCrossesMidnight()) {
                consecutiveNights++;
            } else {
                break;
            }
        }
        return consecutiveNights >= Math.max(maxConsecutiveNights, 1);
    }

    private LocalDateTime assignmentStart(RosterAssignmentEntity assignment) {
        return LocalDateTime.of(assignment.getAssignmentDate(), assignment.getRosterShift().getStartTime());
    }

    private LocalDateTime assignmentEnd(RosterAssignmentEntity assignment) {
        LocalDate assignmentDate = assignment.getAssignmentDate();
        if (assignment.getRosterShift().isCrossesMidnight()) {
            return LocalDateTime.of(assignmentDate.plusDays(1), assignment.getRosterShift().getEndTime());
        }
        return LocalDateTime.of(assignmentDate, assignment.getRosterShift().getEndTime());
    }

    private List<RosterShiftEntity> rotateShifts(List<RosterShiftEntity> shifts, int offset) {
        if (shifts.isEmpty()) {
            return List.of();
        }
        List<RosterShiftEntity> ordered = new ArrayList<>(shifts);
        java.util.Collections.rotate(ordered, -(offset % ordered.size()));
        return ordered;
    }

    private boolean isWeeklyOff(LocalDate date, List<String> weeklyOffDays, String weeklyOffMode, int employeeIndex) {
        if (weeklyOffDays.isEmpty()) {
            return false;
        }
        String dayName = date.getDayOfWeek().name();
        if ("ROTATIONAL".equalsIgnoreCase(weeklyOffMode)) {
            String assignedWeeklyOff = weeklyOffDays.get(employeeIndex % weeklyOffDays.size());
            return assignedWeeklyOff.equals(dayName);
        }
        return weeklyOffDays.contains(dayName);
    }

    private RosterAssignmentResponse toAssignmentResponse(RosterAssignmentEntity assignment) {
        return new RosterAssignmentResponse(
                assignment.getId().toString(),
                assignment.getEmployee().getId().toString(),
                assignment.getEmployee().getName(),
                assignment.getBranch().getId().toString(),
                assignment.getBranch().getName(),
                assignment.getRosterShift().getId().toString(),
                assignment.getRosterShift().getCode(),
                assignment.getRosterShift().getName(),
                assignment.getAssignmentDate().toString(),
                assignment.getAssignmentType(),
                assignment.getStatus(),
                assignment.getRosterShift().getStartTime().toString(),
                assignment.getRosterShift().getEndTime().toString(),
                assignment.getRosterShift().getColorHex(),
                assignment.getNotes()
        );
    }

    private RosterSwapRequestResponse toSwapResponse(ShiftSwapRequestEntity swap) {
        return new RosterSwapRequestResponse(
                swap.getId().toString(),
                swap.getRequesterEmployee().getName(),
                swap.getTargetEmployee().getName(),
                swap.getRequesterAssignment().getAssignmentDate().toString(),
                swap.getRequesterAssignment().getRosterShift().getName(),
                swap.getTargetAssignment().getAssignmentDate().toString(),
                swap.getTargetAssignment().getRosterShift().getName(),
                swap.getStatus(),
                swap.getReason(),
                swap.getReviewNote(),
                swap.getRequestedAt() == null ? null : swap.getRequestedAt().toString(),
                swap.getReviewedAt() == null ? null : swap.getReviewedAt().toString()
        );
    }

    private String assignmentSnapshot(RosterAssignmentEntity assignment) {
        return "{\"employee\":\"" + assignment.getEmployee().getName()
                + "\",\"date\":\"" + assignment.getAssignmentDate()
                + "\",\"shift\":\"" + assignment.getRosterShift().getName()
                + "\",\"status\":\"" + assignment.getStatus()
                + "\",\"type\":\"" + assignment.getAssignmentType() + "\"}";
    }

    private void writeAuditLog(
            AuthenticatedUser user,
            BranchEntity branch,
            String actionType,
            String targetType,
            String targetId,
            String note,
            String beforeSnapshot,
            String afterSnapshot
    ) {
        RosterEditAuditLogEntity auditLog = new RosterEditAuditLogEntity();
        auditLog.setVendor(branch.getVendor());
        auditLog.setBranch(branch);
        auditLog.setActorUser(userRepository.findById(user.userId()).orElse(null));
        auditLog.setActorRole(user.role().name());
        auditLog.setActionType(actionType);
        auditLog.setTargetType(targetType);
        auditLog.setTargetId(targetId);
        auditLog.setActionNote(note);
        auditLog.setBeforeSnapshot(beforeSnapshot);
        auditLog.setAfterSnapshot(afterSnapshot);
        auditLog.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        rosterEditAuditLogRepository.save(auditLog);
    }

    private List<RosterShiftEntity> loadTemplateShifts(UUID vendorId, RosterTemplateEntity template) {
        List<String> shiftIds = parseCsv(template.getShiftIdsCsv());
        List<RosterShiftEntity> shifts = new ArrayList<>();
        for (String shiftId : shiftIds) {
            rosterShiftRepository.findByIdAndVendor_Id(UUID.fromString(shiftId), vendorId)
                    .filter(RosterShiftEntity::isActive)
                    .ifPresent(shifts::add);
        }
        return shifts;
    }

    private BranchEntity loadBranch(UUID vendorId, String branchId) {
        return branchRepository.findByIdAndVendor_Id(UUID.fromString(branchId), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found."));
    }

    private EmployeeEntity loadEmployee(UUID vendorId, String employeeId) {
        return employeeRepository.findByIdAndVendor_Id(UUID.fromString(employeeId), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found."));
    }

    private RosterShiftEntity loadShift(UUID vendorId, String shiftId) {
        return rosterShiftRepository.findByIdAndVendor_Id(UUID.fromString(shiftId), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roster shift not found."));
    }

    private RosterTemplateEntity loadTemplate(UUID vendorId, String templateId) {
        return rosterTemplateRepository.findByIdAndVendor_Id(UUID.fromString(templateId), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roster template not found."));
    }

    private YearMonth parseMonth(String month) {
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Roster month must use YYYY-MM format.");
        }
    }

    private LocalDate parseDate(String date, String message) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private String normalizeAssignmentType(String assignmentType) {
        if (assignmentType == null || assignmentType.isBlank()) {
            return "WORKING";
        }
        return assignmentType.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeMode(String templateMode, String branchMode) {
        if (templateMode != null && !templateMode.isBlank()) {
            return templateMode.trim().toUpperCase(Locale.ROOT);
        }
        return branchMode == null || branchMode.isBlank() ? "FIXED" : branchMode.trim().toUpperCase(Locale.ROOT);
    }

    private List<String> parseCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .toList();
    }

    private String appendSystemNote(String currentNote, String newNote) {
        if (currentNote == null || currentNote.isBlank()) {
            return newNote;
        }
        return currentNote + " | " + newNote;
    }

    private String csv(String value) {
        String sanitized = value == null ? "" : value.replace("\"", "\"\"");
        return "\"" + sanitized + "\"";
    }

    private void requireAdmin(AuthenticatedUser user) {
        if (user.role() != UserRole.SUPER_ADMIN && user.role() != UserRole.VENDOR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is required.");
        }
    }

    private void requireEmployee(AuthenticatedUser user) {
        if (user.role() != UserRole.EMPLOYEE || user.employeeId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Employee access is required.");
        }
    }
}
