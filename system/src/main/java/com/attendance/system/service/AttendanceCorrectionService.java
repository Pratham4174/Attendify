package com.attendance.system.service;

import com.attendance.system.dto.AttendanceCorrectionAuditResponse;
import com.attendance.system.dto.AttendanceCorrectionCreateRequest;
import com.attendance.system.dto.AttendanceCorrectionDecisionRequest;
import com.attendance.system.dto.AttendanceCorrectionResponse;
import com.attendance.system.model.AttendanceCorrectionAuditEntity;
import com.attendance.system.model.AttendanceCorrectionRequestEntity;
import com.attendance.system.model.AttendanceCorrectionStatus;
import com.attendance.system.model.AttendanceCorrectionType;
import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.AttendanceStatus;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.EmployeeEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.repository.AttendanceCorrectionAuditRepository;
import com.attendance.system.repository.AttendanceCorrectionRequestRepository;
import com.attendance.system.repository.AttendanceRecordRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AttendanceCorrectionService {
    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceCorrectionRequestRepository correctionRequestRepository;
    private final AttendanceCorrectionAuditRepository correctionAuditRepository;

    public AttendanceCorrectionService(
            EmployeeRepository employeeRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            AttendanceCorrectionRequestRepository correctionRequestRepository,
            AttendanceCorrectionAuditRepository correctionAuditRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.correctionRequestRepository = correctionRequestRepository;
        this.correctionAuditRepository = correctionAuditRepository;
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> employeeCorrections(AuthenticatedUser user) {
        EmployeeEntity employee = requireEmployee(user);
        return correctionRequestRepository.findByEmployee_IdOrderByCreatedAtDesc(employee.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AttendanceCorrectionResponse createCorrection(AuthenticatedUser user, AttendanceCorrectionCreateRequest request) {
        EmployeeEntity employee = requireEmployee(user);
        LocalDate attendanceDate = parseDate(request.attendanceDate());
        AttendanceCorrectionType correctionType = parseType(request.correctionType());
        LocalTime requestedTime = parseTime(request.requestedTime());

        if (correctionRequestRepository.existsByEmployee_IdAndAttendanceDateAndStatus(
                employee.getId(),
                attendanceDate,
                AttendanceCorrectionStatus.PENDING
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A pending correction request already exists for this date.");
        }

        AttendanceRecordEntity existingRecord = attendanceRecordRepository
                .findFirstByEmployee_IdAndAttendanceDateOrderByCheckInTimeDesc(employee.getId(), attendanceDate)
                .orElse(null);
        validateCorrectionTarget(correctionType, existingRecord);

        AttendanceCorrectionRequestEntity correction = new AttendanceCorrectionRequestEntity();
        correction.setVendor(employee.getVendor());
        correction.setEmployee(employee);
        correction.setBranch(employee.getBranch());
        correction.setAttendanceRecord(existingRecord);
        correction.setCorrectionType(correctionType);
        correction.setStatus(AttendanceCorrectionStatus.PENDING);
        correction.setAttendanceDate(attendanceDate);
        correction.setRequestedTime(OffsetDateTime.of(attendanceDate, requestedTime, ZoneOffset.UTC));
        correction.setReason(request.reason().trim());
        correction.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        AttendanceCorrectionRequestEntity saved = correctionRequestRepository.save(correction);

        saveAudit(
                saved,
                user.name(),
                "REQUESTED",
                request.reason().trim(),
                existingRecord == null ? null : existingRecord.getCheckInTime(),
                existingRecord == null ? null : existingRecord.getCheckOutTime(),
                existingRecord == null ? null : existingRecord.getCheckInTime(),
                existingRecord == null ? null : existingRecord.getCheckOutTime()
        );
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> adminCorrections(AuthenticatedUser user) {
        requireAdmin(user);
        return correctionRequestRepository.findByVendor_IdOrderByCreatedAtDesc(user.vendorId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AttendanceCorrectionResponse decideCorrection(
            AuthenticatedUser user,
            String correctionId,
            AttendanceCorrectionDecisionRequest request
    ) {
        requireAdmin(user);
        AttendanceCorrectionRequestEntity correction = correctionRequestRepository
                .findByIdAndVendor_Id(UUID.fromString(correctionId), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Correction request not found."));
        if (correction.getStatus() != AttendanceCorrectionStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending correction requests can be updated.");
        }

        AttendanceCorrectionStatus decision = parseDecisionStatus(request.status());
        AttendanceRecordEntity beforeRecord = correction.getAttendanceRecord();
        OffsetDateTime beforeCheckInTime = beforeRecord == null ? null : beforeRecord.getCheckInTime();
        OffsetDateTime beforeCheckOutTime = beforeRecord == null ? null : beforeRecord.getCheckOutTime();
        AttendanceRecordEntity afterRecord = beforeRecord;
        OffsetDateTime appliedTime = null;

        correction.setStatus(decision);
        correction.setReviewNote(request.reviewNote().trim());
        correction.setReviewedByName(user.name());
        correction.setReviewedAt(OffsetDateTime.now(ZoneOffset.UTC));

        if (decision == AttendanceCorrectionStatus.APPROVED) {
            LocalTime approvedTime = request.approvedTime() == null || request.approvedTime().isBlank()
                    ? correction.getRequestedTime().toLocalTime()
                    : parseTime(request.approvedTime());
            appliedTime = OffsetDateTime.of(correction.getAttendanceDate(), approvedTime, ZoneOffset.UTC);
            afterRecord = applyCorrection(correction, appliedTime);
            correction.setAttendanceRecord(afterRecord);
            correction.setAppliedTime(appliedTime);
        }

        AttendanceCorrectionRequestEntity saved = correctionRequestRepository.save(correction);
        saveAudit(
                saved,
                user.name(),
                decision.name(),
                request.reviewNote().trim(),
                beforeCheckInTime,
                beforeCheckOutTime,
                afterRecord == null ? null : afterRecord.getCheckInTime(),
                afterRecord == null ? null : afterRecord.getCheckOutTime()
        );
        return toResponse(saved);
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

    private void validateCorrectionTarget(AttendanceCorrectionType type, AttendanceRecordEntity existingRecord) {
        if (type == AttendanceCorrectionType.MISSED_CHECK_IN && existingRecord != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attendance already exists for this date. Use a check-out correction if needed.");
        }
        if (type == AttendanceCorrectionType.MISSED_CHECK_OUT) {
            if (existingRecord == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A missed check-out correction needs an existing check-in record.");
            }
            if (existingRecord.getCheckOutTime() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This attendance record already has a check-out time.");
            }
        }
    }

    private AttendanceRecordEntity applyCorrection(AttendanceCorrectionRequestEntity correction, OffsetDateTime appliedTime) {
        AttendanceRecordEntity record = correction.getAttendanceRecord();
        BranchEntity branch = correction.getBranch();
        EmployeeEntity employee = correction.getEmployee();
        if (correction.getCorrectionType() == AttendanceCorrectionType.MISSED_CHECK_IN) {
            record = new AttendanceRecordEntity();
            record.setVendor(employee.getVendor());
            record.setEmployee(employee);
            record.setBranch(branch);
            record.setAttendanceDate(correction.getAttendanceDate());
            record.setCheckInTime(appliedTime);
            record.setCheckInLatitude(branch.getLatitude().setScale(7, RoundingMode.HALF_UP));
            record.setCheckInLongitude(branch.getLongitude().setScale(7, RoundingMode.HALF_UP));
            record.setCheckInDistanceMeters(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            record.setStatus(AttendanceStatus.CHECKED_IN);
        } else {
            record.setCheckOutTime(appliedTime);
            record.setCheckOutLatitude(branch.getLatitude().setScale(7, RoundingMode.HALF_UP));
            record.setCheckOutLongitude(branch.getLongitude().setScale(7, RoundingMode.HALF_UP));
            record.setCheckOutDistanceMeters(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            record.setStatus(AttendanceStatus.COMPLETED);
        }
        return attendanceRecordRepository.save(record);
    }

    private void saveAudit(
            AttendanceCorrectionRequestEntity correction,
            String actorName,
            String actionType,
            String note,
            OffsetDateTime beforeCheckInTime,
            OffsetDateTime beforeCheckOutTime,
            OffsetDateTime afterCheckInTime,
            OffsetDateTime afterCheckOutTime
    ) {
        AttendanceCorrectionAuditEntity audit = new AttendanceCorrectionAuditEntity();
        audit.setVendor(correction.getVendor());
        audit.setCorrectionRequest(correction);
        audit.setActorName(actorName);
        audit.setActionType(actionType);
        audit.setNote(note);
        audit.setBeforeCheckInTime(beforeCheckInTime);
        audit.setBeforeCheckOutTime(beforeCheckOutTime);
        audit.setAfterCheckInTime(afterCheckInTime);
        audit.setAfterCheckOutTime(afterCheckOutTime);
        audit.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        correctionAuditRepository.save(audit);
    }

    private AttendanceCorrectionType parseType(String value) {
        try {
            return AttendanceCorrectionType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Correction type must be MISSED_CHECK_IN or MISSED_CHECK_OUT.");
        }
    }

    private AttendanceCorrectionStatus parseDecisionStatus(String value) {
        try {
            AttendanceCorrectionStatus status = AttendanceCorrectionStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
            if (status == AttendanceCorrectionStatus.PENDING) {
                throw new IllegalArgumentException();
            }
            return status;
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decision status must be APPROVED or REJECTED.");
        }
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Correction date must use YYYY-MM-DD format.");
        }
    }

    private LocalTime parseTime(String value) {
        try {
            return LocalTime.parse(value);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Correction time must use HH:MM format.");
        }
    }

    private AttendanceCorrectionResponse toResponse(AttendanceCorrectionRequestEntity correction) {
        return new AttendanceCorrectionResponse(
                correction.getId().toString(),
                correction.getEmployee().getId().toString(),
                correction.getEmployee().getName(),
                correction.getBranch().getName(),
                correction.getCorrectionType().name(),
                correction.getStatus().name(),
                correction.getAttendanceDate().toString(),
                correction.getRequestedTime().toString(),
                correction.getAppliedTime() == null ? null : correction.getAppliedTime().toString(),
                correction.getReason(),
                correction.getReviewNote(),
                correction.getReviewedByName(),
                correction.getCreatedAt().toString(),
                correction.getReviewedAt() == null ? null : correction.getReviewedAt().toString(),
                correctionAuditRepository.findByCorrectionRequest_IdOrderByCreatedAtAsc(correction.getId()).stream()
                        .map(this::toAuditResponse)
                        .toList()
        );
    }

    private AttendanceCorrectionAuditResponse toAuditResponse(AttendanceCorrectionAuditEntity audit) {
        return new AttendanceCorrectionAuditResponse(
                audit.getActionType(),
                audit.getActorName(),
                audit.getNote(),
                audit.getBeforeCheckInTime() == null ? null : audit.getBeforeCheckInTime().toString(),
                audit.getBeforeCheckOutTime() == null ? null : audit.getBeforeCheckOutTime().toString(),
                audit.getAfterCheckInTime() == null ? null : audit.getAfterCheckInTime().toString(),
                audit.getAfterCheckOutTime() == null ? null : audit.getAfterCheckOutTime().toString(),
                audit.getCreatedAt().toString()
        );
    }
}
