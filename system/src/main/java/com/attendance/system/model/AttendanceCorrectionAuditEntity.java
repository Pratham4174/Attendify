package com.attendance.system.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_correction_audit_logs")
public class AttendanceCorrectionAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private VendorEntity vendor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "correction_request_id", nullable = false)
    private AttendanceCorrectionRequestEntity correctionRequest;

    @Column(name = "actor_name", nullable = false, length = 140)
    private String actorName;

    @Column(name = "action_type", nullable = false, length = 40)
    private String actionType;

    @Column(length = 400)
    private String note;

    @Column(name = "before_check_in_time")
    private OffsetDateTime beforeCheckInTime;

    @Column(name = "before_check_out_time")
    private OffsetDateTime beforeCheckOutTime;

    @Column(name = "after_check_in_time")
    private OffsetDateTime afterCheckInTime;

    @Column(name = "after_check_out_time")
    private OffsetDateTime afterCheckOutTime;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public VendorEntity getVendor() {
        return vendor;
    }

    public void setVendor(VendorEntity vendor) {
        this.vendor = vendor;
    }

    public AttendanceCorrectionRequestEntity getCorrectionRequest() {
        return correctionRequest;
    }

    public void setCorrectionRequest(AttendanceCorrectionRequestEntity correctionRequest) {
        this.correctionRequest = correctionRequest;
    }

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public OffsetDateTime getBeforeCheckInTime() {
        return beforeCheckInTime;
    }

    public void setBeforeCheckInTime(OffsetDateTime beforeCheckInTime) {
        this.beforeCheckInTime = beforeCheckInTime;
    }

    public OffsetDateTime getBeforeCheckOutTime() {
        return beforeCheckOutTime;
    }

    public void setBeforeCheckOutTime(OffsetDateTime beforeCheckOutTime) {
        this.beforeCheckOutTime = beforeCheckOutTime;
    }

    public OffsetDateTime getAfterCheckInTime() {
        return afterCheckInTime;
    }

    public void setAfterCheckInTime(OffsetDateTime afterCheckInTime) {
        this.afterCheckInTime = afterCheckInTime;
    }

    public OffsetDateTime getAfterCheckOutTime() {
        return afterCheckOutTime;
    }

    public void setAfterCheckOutTime(OffsetDateTime afterCheckOutTime) {
        this.afterCheckOutTime = afterCheckOutTime;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
