package com.attendance.system.service;

import com.attendance.system.config.TrackingProperties;
import com.attendance.system.dto.AttendanceActionResponse;
import com.attendance.system.dto.AttendanceRequest;
import com.attendance.system.dto.EmployeeOverviewResponse;
import com.attendance.system.dto.LocationPingRequest;
import com.attendance.system.dto.LocationPingResponse;
import com.attendance.system.model.AttendanceLocationLogEntity;
import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.AttendanceStatus;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.EmployeeEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.repository.AttendanceRecordRepository;
import com.attendance.system.repository.AttendanceLocationLogRepository;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.util.GeoUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataAccessException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class AttendanceService {
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceLocationLogRepository attendanceLocationLogRepository;
    private final EmployeeRepository employeeRepository;
    private final BranchRepository branchRepository;
    private final AttendanceMapper mapper;
    private final TrackingProperties trackingProperties;

    public AttendanceService(
            AttendanceRecordRepository attendanceRecordRepository,
            AttendanceLocationLogRepository attendanceLocationLogRepository,
            EmployeeRepository employeeRepository,
            BranchRepository branchRepository,
            AttendanceMapper mapper,
            TrackingProperties trackingProperties
    ) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.attendanceLocationLogRepository = attendanceLocationLogRepository;
        this.employeeRepository = employeeRepository;
        this.branchRepository = branchRepository;
        this.mapper = mapper;
        this.trackingProperties = trackingProperties;
    }

    @Transactional
    public AttendanceActionResponse checkIn(AuthenticatedUser user, AttendanceRequest request) {
        EmployeeEntity employee = requireEmployeeUser(user);
        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        validateEmployeeBranch(employee, branch);
        BigDecimal distanceMeters = validateGeofence(branch, request.latitude(), request.longitude());

        attendanceRecordRepository.findFirstByEmployee_IdAndAttendanceDateOrderByCheckInTimeDesc(employee.getId(), LocalDate.now(ZoneOffset.UTC))
                .ifPresent(record -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance already exists for today.");
                });

        AttendanceRecordEntity record = new AttendanceRecordEntity();
        record.setVendor(employee.getVendor());
        record.setEmployee(employee);
        record.setBranch(branch);
        record.setAttendanceDate(LocalDate.now(ZoneOffset.UTC));
        record.setCheckInTime(OffsetDateTime.now(ZoneOffset.UTC));
        record.setCheckInLatitude(scale(request.latitude()));
        record.setCheckInLongitude(scale(request.longitude()));
        record.setCheckInDistanceMeters(distanceMeters);
        record.setCheckInPhotoRef(request.imageDataUrl());
        record.setStatus(AttendanceStatus.CHECKED_IN);

        AttendanceRecordEntity saved = attendanceRecordRepository.save(record);
        if (trackingProperties.enabled()) {
            trySaveLocationPing(saved, employee, request.latitude(), request.longitude(), distanceMeters.doubleValue());
        }
        return new AttendanceActionResponse("Checked in successfully.", distanceMeters.doubleValue(), true, mapper.toAttendanceRow(saved));
    }

    @Transactional
    public AttendanceActionResponse checkOut(AuthenticatedUser user, AttendanceRequest request) {
        EmployeeEntity employee = requireEmployeeUser(user);
        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        validateEmployeeBranch(employee, branch);
        BigDecimal distanceMeters = validateGeofence(branch, request.latitude(), request.longitude());

        AttendanceRecordEntity record = attendanceRecordRepository
                .findFirstByEmployee_IdAndAttendanceDateAndCheckOutTimeIsNull(employee.getId(), LocalDate.now(ZoneOffset.UTC))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active check-in found for today."));

        record.setCheckOutTime(OffsetDateTime.now(ZoneOffset.UTC));
        record.setCheckOutLatitude(scale(request.latitude()));
        record.setCheckOutLongitude(scale(request.longitude()));
        record.setCheckOutDistanceMeters(distanceMeters);
        record.setCheckOutPhotoRef(request.imageDataUrl());
        record.setStatus(AttendanceStatus.COMPLETED);

        AttendanceRecordEntity saved = attendanceRecordRepository.save(record);
        return new AttendanceActionResponse("Checked out successfully.", distanceMeters.doubleValue(), true, mapper.toAttendanceRow(saved));
    }

    @Transactional(readOnly = true)
    public EmployeeOverviewResponse employeeOverview(AuthenticatedUser user) {
        EmployeeEntity employee = requireEmployeeUser(user);
        List<AttendanceRecordEntity> history = attendanceRecordRepository.findByEmployee_IdOrderByAttendanceDateDescCheckInTimeDesc(employee.getId());
        AttendanceRecordEntity latestRecord = history.isEmpty() ? null : history.get(0);
        EmployeeOverviewResponse.TrackingSummary trackingSummary = resolveTrackingSummary(latestRecord);
        return new EmployeeOverviewResponse(
                mapper.toEmployeeSummary(employee),
                mapper.toBranchSummary(employee.getBranch()),
                latestRecord == null ? null : mapper.toAttendanceRow(latestRecord),
                history.stream().limit(7).map(mapper::toAttendanceRow).toList(),
                trackingSummary
        );
    }

    @Transactional
    public LocationPingResponse recordLocationPing(AuthenticatedUser user, LocationPingRequest request) {
        if (!trackingProperties.enabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tracking is not enabled for this ATTENDIFY workspace.");
        }

        EmployeeEntity employee = requireEmployeeUser(user);
        AttendanceRecordEntity record = attendanceRecordRepository
                .findFirstByEmployee_IdAndAttendanceDateAndCheckOutTimeIsNull(employee.getId(), LocalDate.now(ZoneOffset.UTC))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Tracking starts only after check-in and stops after check-out."));

        try {
            OffsetDateTime minWindow = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(9);
            if (attendanceLocationLogRepository.existsByAttendanceRecord_IdAndCapturedAtAfter(record.getId(), minWindow)) {
                return new LocationPingResponse("Tracking already updated recently.", OffsetDateTime.now(ZoneOffset.UTC).toString());
            }

            saveLocationPing(record, employee, request.latitude(), request.longitude(), request.accuracyMeters());
            return new LocationPingResponse("Tracking location saved.", OffsetDateTime.now(ZoneOffset.UTC).toString());
        } catch (DataAccessException | IllegalStateException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Tracking is not available right now. Attendance is still active."
            );
        }
    }

    private EmployeeEntity requireEmployeeUser(AuthenticatedUser user) {
        if (user.role() != UserRole.EMPLOYEE || user.employeeId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Employee access is required.");
        }
        return employeeRepository.findByIdAndVendor_Id(user.employeeId(), user.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found."));
    }

    private BranchEntity loadBranch(UUID vendorId, String branchId) {
        return branchRepository.findByIdAndVendor_Id(UUID.fromString(branchId), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found."));
    }

    private void validateEmployeeBranch(EmployeeEntity employee, BranchEntity branch) {
        if (!employee.getBranch().getId().equals(branch.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee is not assigned to this branch.");
        }
    }

    private BigDecimal validateGeofence(BranchEntity branch, double latitude, double longitude) {
        if (latitude == 0 || longitude == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid location coordinates are required.");
        }
        double distance = GeoUtils.distanceInMeters(
                latitude,
                longitude,
                branch.getLatitude().doubleValue(),
                branch.getLongitude().doubleValue()
        );
        if (distance > branch.getRadiusMeters().doubleValue()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You are outside the allowed branch geofence.");
        }
        return scale(distance);
    }

    private BigDecimal scale(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private EmployeeOverviewResponse.TrackingSummary resolveTrackingSummary(AttendanceRecordEntity latestRecord) {
        if (latestRecord == null) {
            return new EmployeeOverviewResponse.TrackingSummary(trackingProperties.enabled(), false, null, 0);
        }

        if (!trackingProperties.enabled()) {
            return new EmployeeOverviewResponse.TrackingSummary(false, false, null, 0);
        }

        try {
            return new EmployeeOverviewResponse.TrackingSummary(
                    true,
                    latestRecord.getStatus() == AttendanceStatus.CHECKED_IN,
                    attendanceLocationLogRepository.findFirstByAttendanceRecord_IdOrderByCapturedAtDesc(latestRecord.getId())
                            .map(log -> log.getCapturedAt().toString())
                            .orElse(null),
                    (int) attendanceLocationLogRepository.countByAttendanceRecord_Id(latestRecord.getId())
            );
        } catch (DataAccessException | IllegalStateException exception) {
            return new EmployeeOverviewResponse.TrackingSummary(true, false, null, 0);
        }
    }

    private void trySaveLocationPing(
            AttendanceRecordEntity record,
            EmployeeEntity employee,
            double latitude,
            double longitude,
            Double accuracyMeters
    ) {
        try {
            saveLocationPing(record, employee, latitude, longitude, accuracyMeters);
        } catch (DataAccessException | IllegalStateException exception) {
            // Keep attendance operational even if optional tracking storage is unavailable.
        }
    }

    private void saveLocationPing(
            AttendanceRecordEntity record,
            EmployeeEntity employee,
            double latitude,
            double longitude,
            Double accuracyMeters
    ) {
        AttendanceLocationLogEntity locationLog = new AttendanceLocationLogEntity();
        locationLog.setVendor(employee.getVendor());
        locationLog.setEmployee(employee);
        locationLog.setAttendanceRecord(record);
        locationLog.setLatitude(scaleCoordinate(latitude));
        locationLog.setLongitude(scaleCoordinate(longitude));
        locationLog.setAccuracyMeters(accuracyMeters == null ? null : scale(accuracyMeters));
        locationLog.setCapturedAt(OffsetDateTime.now(ZoneOffset.UTC));
        attendanceLocationLogRepository.save(locationLog);
    }

    private BigDecimal scaleCoordinate(double value) {
        return BigDecimal.valueOf(value).setScale(7, RoundingMode.HALF_UP);
    }
}
