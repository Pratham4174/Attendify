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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecordEntity {
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

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "check_in_time", nullable = false)
    private OffsetDateTime checkInTime;

    @Column(name = "check_out_time")
    private OffsetDateTime checkOutTime;

    @Column(name = "check_in_latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal checkInLatitude;

    @Column(name = "check_in_longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal checkInLongitude;

    @Column(name = "check_out_latitude", precision = 10, scale = 7)
    private BigDecimal checkOutLatitude;

    @Column(name = "check_out_longitude", precision = 10, scale = 7)
    private BigDecimal checkOutLongitude;

    @Column(name = "check_in_distance_meters", nullable = false, precision = 8, scale = 2)
    private BigDecimal checkInDistanceMeters;

    @Column(name = "check_out_distance_meters", precision = 8, scale = 2)
    private BigDecimal checkOutDistanceMeters;

    @Column(name = "check_in_photo_ref", columnDefinition = "TEXT")
    private String checkInPhotoRef;

    @Column(name = "check_out_photo_ref", columnDefinition = "TEXT")
    private String checkOutPhotoRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

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

    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }

    public void setAttendanceDate(LocalDate attendanceDate) {
        this.attendanceDate = attendanceDate;
    }

    public OffsetDateTime getCheckInTime() {
        return checkInTime;
    }

    public void setCheckInTime(OffsetDateTime checkInTime) {
        this.checkInTime = checkInTime;
    }

    public OffsetDateTime getCheckOutTime() {
        return checkOutTime;
    }

    public void setCheckOutTime(OffsetDateTime checkOutTime) {
        this.checkOutTime = checkOutTime;
    }

    public BigDecimal getCheckInLatitude() {
        return checkInLatitude;
    }

    public void setCheckInLatitude(BigDecimal checkInLatitude) {
        this.checkInLatitude = checkInLatitude;
    }

    public BigDecimal getCheckInLongitude() {
        return checkInLongitude;
    }

    public void setCheckInLongitude(BigDecimal checkInLongitude) {
        this.checkInLongitude = checkInLongitude;
    }

    public BigDecimal getCheckOutLatitude() {
        return checkOutLatitude;
    }

    public void setCheckOutLatitude(BigDecimal checkOutLatitude) {
        this.checkOutLatitude = checkOutLatitude;
    }

    public BigDecimal getCheckOutLongitude() {
        return checkOutLongitude;
    }

    public void setCheckOutLongitude(BigDecimal checkOutLongitude) {
        this.checkOutLongitude = checkOutLongitude;
    }

    public BigDecimal getCheckInDistanceMeters() {
        return checkInDistanceMeters;
    }

    public void setCheckInDistanceMeters(BigDecimal checkInDistanceMeters) {
        this.checkInDistanceMeters = checkInDistanceMeters;
    }

    public BigDecimal getCheckOutDistanceMeters() {
        return checkOutDistanceMeters;
    }

    public void setCheckOutDistanceMeters(BigDecimal checkOutDistanceMeters) {
        this.checkOutDistanceMeters = checkOutDistanceMeters;
    }

    public String getCheckInPhotoRef() {
        return checkInPhotoRef;
    }

    public void setCheckInPhotoRef(String checkInPhotoRef) {
        this.checkInPhotoRef = checkInPhotoRef;
    }

    public String getCheckOutPhotoRef() {
        return checkOutPhotoRef;
    }

    public void setCheckOutPhotoRef(String checkOutPhotoRef) {
        this.checkOutPhotoRef = checkOutPhotoRef;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
    }
}
