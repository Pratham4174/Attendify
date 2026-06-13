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

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "branches")
public class BranchEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private VendorEntity vendor;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(nullable = false, length = 220)
    private String address;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "radius_meters", nullable = false, precision = 8, scale = 2)
    private BigDecimal radiusMeters;

    @Column(name = "shift_start_time", nullable = false)
    private LocalTime shiftStartTime = LocalTime.of(9, 0);

    @Column(name = "shift_end_time", nullable = false)
    private LocalTime shiftEndTime = LocalTime.of(18, 0);

    @Column(name = "grace_minutes", nullable = false)
    private Integer graceMinutes = 15;

    @Column(name = "half_day_minutes", nullable = false)
    private Integer halfDayMinutes = 240;

    @Column(name = "full_day_minutes", nullable = false)
    private Integer fullDayMinutes = 480;

    @Column(name = "weekly_off_mode", nullable = false, length = 30)
    private String weeklyOffMode = "FIXED";

    @Column(name = "weekly_off_days_csv", nullable = false, length = 120)
    private String weeklyOffDaysCsv = "SUNDAY";

    public UUID getId() {
        return id;
    }

    public VendorEntity getVendor() {
        return vendor;
    }

    public void setVendor(VendorEntity vendor) {
        this.vendor = vendor;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public BigDecimal getRadiusMeters() {
        return radiusMeters;
    }

    public void setRadiusMeters(BigDecimal radiusMeters) {
        this.radiusMeters = radiusMeters;
    }

    public LocalTime getShiftStartTime() {
        return shiftStartTime;
    }

    public void setShiftStartTime(LocalTime shiftStartTime) {
        this.shiftStartTime = shiftStartTime;
    }

    public LocalTime getShiftEndTime() {
        return shiftEndTime;
    }

    public void setShiftEndTime(LocalTime shiftEndTime) {
        this.shiftEndTime = shiftEndTime;
    }

    public Integer getGraceMinutes() {
        return graceMinutes;
    }

    public void setGraceMinutes(Integer graceMinutes) {
        this.graceMinutes = graceMinutes;
    }

    public Integer getHalfDayMinutes() {
        return halfDayMinutes;
    }

    public void setHalfDayMinutes(Integer halfDayMinutes) {
        this.halfDayMinutes = halfDayMinutes;
    }

    public Integer getFullDayMinutes() {
        return fullDayMinutes;
    }

    public void setFullDayMinutes(Integer fullDayMinutes) {
        this.fullDayMinutes = fullDayMinutes;
    }

    public String getWeeklyOffMode() {
        return weeklyOffMode;
    }

    public void setWeeklyOffMode(String weeklyOffMode) {
        this.weeklyOffMode = weeklyOffMode;
    }

    public String getWeeklyOffDaysCsv() {
        return weeklyOffDaysCsv;
    }

    public void setWeeklyOffDaysCsv(String weeklyOffDaysCsv) {
        this.weeklyOffDaysCsv = weeklyOffDaysCsv;
    }
}
