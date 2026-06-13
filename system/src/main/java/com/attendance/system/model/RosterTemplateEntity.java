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
@Table(name = "roster_templates")
public class RosterTemplateEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private VendorEntity vendor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private BranchEntity branch;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(name = "industry_type", nullable = false, length = 60)
    private String industryType;

    @Column(name = "rotation_type", nullable = false, length = 40)
    private String rotationType;

    @Column(name = "weekly_off_mode", nullable = false, length = 30)
    private String weeklyOffMode;

    @Column(name = "weekly_off_days_csv", nullable = false, length = 120)
    private String weeklyOffDaysCsv;

    @Column(name = "shift_ids_csv", nullable = false, length = 1000)
    private String shiftIdsCsv;

    @Column(name = "max_consecutive_night_shifts", nullable = false)
    private Integer maxConsecutiveNightShifts = 2;

    @Column(name = "min_rest_hours", nullable = false)
    private Integer minRestHours = 10;

    @Column(name = "holiday_policy", nullable = false, length = 40)
    private String holidayPolicy = "COMP_OFF_OR_PREMIUM";

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() { return id; }
    public VendorEntity getVendor() { return vendor; }
    public void setVendor(VendorEntity vendor) { this.vendor = vendor; }
    public BranchEntity getBranch() { return branch; }
    public void setBranch(BranchEntity branch) { this.branch = branch; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIndustryType() { return industryType; }
    public void setIndustryType(String industryType) { this.industryType = industryType; }
    public String getRotationType() { return rotationType; }
    public void setRotationType(String rotationType) { this.rotationType = rotationType; }
    public String getWeeklyOffMode() { return weeklyOffMode; }
    public void setWeeklyOffMode(String weeklyOffMode) { this.weeklyOffMode = weeklyOffMode; }
    public String getWeeklyOffDaysCsv() { return weeklyOffDaysCsv; }
    public void setWeeklyOffDaysCsv(String weeklyOffDaysCsv) { this.weeklyOffDaysCsv = weeklyOffDaysCsv; }
    public String getShiftIdsCsv() { return shiftIdsCsv; }
    public void setShiftIdsCsv(String shiftIdsCsv) { this.shiftIdsCsv = shiftIdsCsv; }
    public Integer getMaxConsecutiveNightShifts() { return maxConsecutiveNightShifts; }
    public void setMaxConsecutiveNightShifts(Integer maxConsecutiveNightShifts) { this.maxConsecutiveNightShifts = maxConsecutiveNightShifts; }
    public Integer getMinRestHours() { return minRestHours; }
    public void setMinRestHours(Integer minRestHours) { this.minRestHours = minRestHours; }
    public String getHolidayPolicy() { return holidayPolicy; }
    public void setHolidayPolicy(String holidayPolicy) { this.holidayPolicy = holidayPolicy; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
