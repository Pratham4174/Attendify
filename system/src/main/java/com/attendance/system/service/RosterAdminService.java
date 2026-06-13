package com.attendance.system.service;

import com.attendance.system.dto.RosterShiftResponse;
import com.attendance.system.dto.RosterShiftUpsertRequest;
import com.attendance.system.dto.RosterTemplateResponse;
import com.attendance.system.dto.RosterTemplateUpsertRequest;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.RosterShiftEntity;
import com.attendance.system.model.RosterTemplateEntity;
import com.attendance.system.model.VendorEntity;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.RosterShiftRepository;
import com.attendance.system.repository.RosterTemplateRepository;
import com.attendance.system.repository.VendorRepository;
import com.attendance.system.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RosterAdminService {
    private final VendorRepository vendorRepository;
    private final BranchRepository branchRepository;
    private final RosterShiftRepository rosterShiftRepository;
    private final RosterTemplateRepository rosterTemplateRepository;

    public RosterAdminService(
            VendorRepository vendorRepository,
            BranchRepository branchRepository,
            RosterShiftRepository rosterShiftRepository,
            RosterTemplateRepository rosterTemplateRepository
    ) {
        this.vendorRepository = vendorRepository;
        this.branchRepository = branchRepository;
        this.rosterShiftRepository = rosterShiftRepository;
        this.rosterTemplateRepository = rosterTemplateRepository;
    }

    @Transactional(readOnly = true)
    public List<RosterShiftResponse> shifts(AuthenticatedUser user, String branchId) {
        requireAdmin(user);
        List<RosterShiftEntity> shiftEntities = branchId == null || branchId.isBlank()
                ? rosterShiftRepository.findByVendor_IdOrderByBranch_NameAscNameAsc(user.vendorId())
                : rosterShiftRepository.findByVendor_IdAndBranch_IdOrderByNameAsc(user.vendorId(), parseUuid(branchId, "branch"));
        return shiftEntities.stream().map(this::toShiftResponse).toList();
    }

    @Transactional
    public RosterShiftResponse createShift(AuthenticatedUser user, RosterShiftUpsertRequest request) {
        requireAdmin(user);
        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (rosterShiftRepository.existsByVendor_IdAndBranch_IdAndCodeIgnoreCase(user.vendorId(), branch.getId(), code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Shift code already exists for this branch.");
        }
        RosterShiftEntity entity = new RosterShiftEntity();
        entity.setVendor(loadVendor(user.vendorId()));
        entity.setBranch(branch);
        populateShift(entity, request, code);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return toShiftResponse(rosterShiftRepository.save(entity));
    }

    @Transactional
    public RosterShiftResponse updateShift(AuthenticatedUser user, String shiftId, RosterShiftUpsertRequest request) {
        requireAdmin(user);
        RosterShiftEntity entity = loadShift(user.vendorId(), shiftId);
        BranchEntity branch = loadBranch(user.vendorId(), request.branchId());
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (rosterShiftRepository.existsByVendor_IdAndBranch_IdAndCodeIgnoreCaseAndIdNot(user.vendorId(), branch.getId(), code, entity.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Shift code already exists for this branch.");
        }
        entity.setBranch(branch);
        populateShift(entity, request, code);
        entity.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return toShiftResponse(rosterShiftRepository.save(entity));
    }

    @Transactional
    public void deleteShift(AuthenticatedUser user, String shiftId) {
        requireAdmin(user);
        rosterShiftRepository.delete(loadShift(user.vendorId(), shiftId));
    }

    @Transactional(readOnly = true)
    public List<RosterTemplateResponse> templates(AuthenticatedUser user) {
        requireAdmin(user);
        return rosterTemplateRepository.findByVendor_IdOrderByNameAsc(user.vendorId()).stream()
                .map(this::toTemplateResponse)
                .toList();
    }

    @Transactional
    public RosterTemplateResponse createTemplate(AuthenticatedUser user, RosterTemplateUpsertRequest request) {
        requireAdmin(user);
        RosterTemplateEntity entity = new RosterTemplateEntity();
        entity.setVendor(loadVendor(user.vendorId()));
        populateTemplate(user.vendorId(), entity, request);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return toTemplateResponse(rosterTemplateRepository.save(entity));
    }

    @Transactional
    public RosterTemplateResponse updateTemplate(AuthenticatedUser user, String templateId, RosterTemplateUpsertRequest request) {
        requireAdmin(user);
        RosterTemplateEntity entity = loadTemplate(user.vendorId(), templateId);
        populateTemplate(user.vendorId(), entity, request);
        entity.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return toTemplateResponse(rosterTemplateRepository.save(entity));
    }

    @Transactional
    public void deleteTemplate(AuthenticatedUser user, String templateId) {
        requireAdmin(user);
        rosterTemplateRepository.delete(loadTemplate(user.vendorId(), templateId));
    }

    private void populateShift(RosterShiftEntity entity, RosterShiftUpsertRequest request, String code) {
        LocalTime startTime = parseTime(request.startTime(), "Shift start");
        LocalTime endTime = parseTime(request.endTime(), "Shift end");
        entity.setCode(code);
        entity.setName(request.name().trim());
        entity.setDescription(blankToNull(request.description()));
        entity.setStartTime(startTime);
        entity.setEndTime(endTime);
        entity.setCrossesMidnight(endTime.isBefore(startTime));
        entity.setWorkMinutes(request.workMinutes());
        entity.setBreakMinutes(request.breakMinutes());
        entity.setRequiredHeadcount(request.requiredHeadcount());
        entity.setColorHex(request.colorHex().trim().toUpperCase(Locale.ROOT));
        entity.setActive(Boolean.TRUE.equals(request.active()));
    }

    private void populateTemplate(UUID vendorId, RosterTemplateEntity entity, RosterTemplateUpsertRequest request) {
        BranchEntity branch = request.branchId() == null || request.branchId().isBlank() ? null : loadBranch(vendorId, request.branchId());
        List<String> weeklyOffDays = sanitizeWeeklyOffDays(request.weeklyOffDays());
        List<UUID> shiftIds = request.shiftIds().stream().map(id -> parseUuid(id, "shift")).toList();
        Map<UUID, RosterShiftEntity> validShifts = rosterShiftRepository.findAllById(shiftIds).stream()
                .filter(shift -> shift.getVendor().getId().equals(vendorId))
                .collect(Collectors.toMap(RosterShiftEntity::getId, Function.identity()));
        if (validShifts.size() != shiftIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more selected shifts are invalid.");
        }
        entity.setBranch(branch);
        entity.setName(request.name().trim());
        entity.setIndustryType(request.industryType().trim().toUpperCase(Locale.ROOT));
        entity.setRotationType(request.rotationType().trim().toUpperCase(Locale.ROOT));
        entity.setWeeklyOffMode(request.weeklyOffMode().trim().toUpperCase(Locale.ROOT));
        entity.setWeeklyOffDaysCsv(String.join(",", weeklyOffDays));
        entity.setShiftIdsCsv(shiftIds.stream().map(UUID::toString).collect(Collectors.joining(",")));
        entity.setMaxConsecutiveNightShifts(request.maxConsecutiveNightShifts());
        entity.setMinRestHours(request.minRestHours());
        entity.setHolidayPolicy(request.holidayPolicy().trim().toUpperCase(Locale.ROOT));
        entity.setDescription(blankToNull(request.description()));
        entity.setActive(Boolean.TRUE.equals(request.active()));
    }

    private RosterShiftResponse toShiftResponse(RosterShiftEntity entity) {
        return new RosterShiftResponse(
                entity.getId().toString(),
                entity.getBranch().getId().toString(),
                entity.getBranch().getName(),
                entity.getCode(),
                entity.getName(),
                entity.getDescription(),
                entity.getStartTime().toString(),
                entity.getEndTime().toString(),
                entity.isCrossesMidnight(),
                entity.getWorkMinutes(),
                entity.getBreakMinutes(),
                entity.getRequiredHeadcount(),
                entity.getColorHex(),
                entity.isActive()
        );
    }

    private RosterTemplateResponse toTemplateResponse(RosterTemplateEntity entity) {
        List<UUID> shiftIds = parseUuidCsv(entity.getShiftIdsCsv());
        Map<UUID, RosterShiftEntity> shiftsById = rosterShiftRepository.findAllById(shiftIds).stream()
                .collect(Collectors.toMap(RosterShiftEntity::getId, Function.identity()));
        List<String> shiftLabels = shiftIds.stream()
                .map(shiftsById::get)
                .filter(shift -> shift != null)
                .map(shift -> shift.getCode() + " · " + shift.getName() + " · " + shift.getBranch().getName())
                .toList();
        return new RosterTemplateResponse(
                entity.getId().toString(),
                entity.getBranch() == null ? null : entity.getBranch().getId().toString(),
                entity.getBranch() == null ? "All branches" : entity.getBranch().getName(),
                entity.getName(),
                entity.getIndustryType(),
                entity.getRotationType(),
                entity.getWeeklyOffMode(),
                splitCsv(entity.getWeeklyOffDaysCsv()),
                shiftIds.stream().map(UUID::toString).toList(),
                shiftLabels,
                entity.getMaxConsecutiveNightShifts(),
                entity.getMinRestHours(),
                entity.getHolidayPolicy(),
                entity.getDescription(),
                entity.isActive()
        );
    }

    private VendorEntity loadVendor(UUID vendorId) {
        return vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor not found."));
    }

    private BranchEntity loadBranch(UUID vendorId, String branchId) {
        return branchRepository.findByIdAndVendor_Id(parseUuid(branchId, "branch"), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found."));
    }

    private RosterShiftEntity loadShift(UUID vendorId, String shiftId) {
        return rosterShiftRepository.findByIdAndVendor_Id(parseUuid(shiftId, "shift"), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roster shift not found."));
    }

    private RosterTemplateEntity loadTemplate(UUID vendorId, String templateId) {
        return rosterTemplateRepository.findByIdAndVendor_Id(parseUuid(templateId, "template"), vendorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roster template not found."));
    }

    private void requireAdmin(AuthenticatedUser user) {
        if (!"VENDOR_ADMIN".equals(user.role().name())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can manage rosters.");
        }
    }

    private UUID parseUuid(String value, String label) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + label + " id.");
        }
    }

    private LocalTime parseTime(String value, String label) {
        try {
            return LocalTime.parse(value);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " must use HH:mm format.");
        }
    }

    private List<String> sanitizeWeeklyOffDays(List<String> days) {
        List<String> validDays = List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY");
        List<String> normalized = days.stream()
                .map(day -> day.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        if (normalized.isEmpty() || normalized.stream().anyMatch(day -> !validDays.contains(day))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Weekly off days must use valid day names.");
        }
        return normalized;
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private List<UUID> parseUuidCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(UUID::fromString)
                .toList();
    }

    private List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }
}
