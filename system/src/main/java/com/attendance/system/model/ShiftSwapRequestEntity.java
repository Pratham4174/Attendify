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
@Table(name = "shift_swap_requests")
public class ShiftSwapRequestEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private VendorEntity vendor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private BranchEntity branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_employee_id", nullable = false)
    private EmployeeEntity requesterEmployee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_employee_id", nullable = false)
    private EmployeeEntity targetEmployee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_assignment_id", nullable = false)
    private RosterAssignmentEntity requesterAssignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_assignment_id", nullable = false)
    private RosterAssignmentEntity targetAssignment;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_user_id")
    private UserEntity reviewedByUser;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    public UUID getId() { return id; }
    public VendorEntity getVendor() { return vendor; }
    public void setVendor(VendorEntity vendor) { this.vendor = vendor; }
    public BranchEntity getBranch() { return branch; }
    public void setBranch(BranchEntity branch) { this.branch = branch; }
    public EmployeeEntity getRequesterEmployee() { return requesterEmployee; }
    public void setRequesterEmployee(EmployeeEntity requesterEmployee) { this.requesterEmployee = requesterEmployee; }
    public EmployeeEntity getTargetEmployee() { return targetEmployee; }
    public void setTargetEmployee(EmployeeEntity targetEmployee) { this.targetEmployee = targetEmployee; }
    public RosterAssignmentEntity getRequesterAssignment() { return requesterAssignment; }
    public void setRequesterAssignment(RosterAssignmentEntity requesterAssignment) { this.requesterAssignment = requesterAssignment; }
    public RosterAssignmentEntity getTargetAssignment() { return targetAssignment; }
    public void setTargetAssignment(RosterAssignmentEntity targetAssignment) { this.targetAssignment = targetAssignment; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String reviewNote) { this.reviewNote = reviewNote; }
    public UserEntity getReviewedByUser() { return reviewedByUser; }
    public void setReviewedByUser(UserEntity reviewedByUser) { this.reviewedByUser = reviewedByUser; }
    public OffsetDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(OffsetDateTime requestedAt) { this.requestedAt = requestedAt; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
