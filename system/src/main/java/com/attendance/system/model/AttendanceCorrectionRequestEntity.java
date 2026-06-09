package com.attendance.system.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_correction_requests")
public class AttendanceCorrectionRequestEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private VendorEntity vendor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private BranchEntity branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_record_id")
    private AttendanceRecordEntity attendanceRecord;

    @Enumerated(EnumType.STRING)
    @Column(name = "correction_type", nullable = false, length = 30)
    private AttendanceCorrectionType correctionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceCorrectionStatus status;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "requested_time", nullable = false)
    private OffsetDateTime requestedTime;

    @Column(name = "applied_time")
    private OffsetDateTime appliedTime;

    @Column(nullable = false, length = 400)
    private String reason;

    @Column(name = "review_note", length = 400)
    private String reviewNote;

    @Column(name = "reviewed_by_name", length = 140)
    private String reviewedByName;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    public UUID getId() {
        return id;
    }

    public VendorEntity getVendor() {
        return vendor;
    }

    public void setVendor(VendorEntity vendor) {
        this.vendor = vendor;
    }

    public EmployeeEntity getEmployee() {
        return employee;
    }

    public void setEmployee(EmployeeEntity employee) {
        this.employee = employee;
    }

    public BranchEntity getBranch() {
        return branch;
    }

    public void setBranch(BranchEntity branch) {
        this.branch = branch;
    }

    public AttendanceRecordEntity getAttendanceRecord() {
        return attendanceRecord;
    }

    public void setAttendanceRecord(AttendanceRecordEntity attendanceRecord) {
        this.attendanceRecord = attendanceRecord;
    }

    public AttendanceCorrectionType getCorrectionType() {
        return correctionType;
    }

    public void setCorrectionType(AttendanceCorrectionType correctionType) {
        this.correctionType = correctionType;
    }

    public AttendanceCorrectionStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceCorrectionStatus status) {
        this.status = status;
    }

    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }

    public void setAttendanceDate(LocalDate attendanceDate) {
        this.attendanceDate = attendanceDate;
    }

    public OffsetDateTime getRequestedTime() {
        return requestedTime;
    }

    public void setRequestedTime(OffsetDateTime requestedTime) {
        this.requestedTime = requestedTime;
    }

    public OffsetDateTime getAppliedTime() {
        return appliedTime;
    }

    public void setAppliedTime(OffsetDateTime appliedTime) {
        this.appliedTime = appliedTime;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public String getReviewedByName() {
        return reviewedByName;
    }

    public void setReviewedByName(String reviewedByName) {
        this.reviewedByName = reviewedByName;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(OffsetDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
