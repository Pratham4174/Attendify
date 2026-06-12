package com.attendance.system.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vendors")
public class VendorEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @Column(nullable = false, unique = true, length = 80)
    private String code;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "subscription_plan_code", length = 40)
    private String subscriptionPlanCode;

    @Column(name = "subscription_billing_cycle", length = 20)
    private String subscriptionBillingCycle;

    @Column(name = "subscription_status", length = 20)
    private String subscriptionStatus;

    @Column(name = "max_employees")
    private Integer maxEmployees;

    @Column(name = "max_branches")
    private Integer maxBranches;

    @Column(name = "trial_ends_at")
    private OffsetDateTime trialEndsAt;

    @Column(name = "access_expires_at")
    private OffsetDateTime accessExpiresAt;

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSubscriptionPlanCode() {
        return subscriptionPlanCode;
    }

    public void setSubscriptionPlanCode(String subscriptionPlanCode) {
        this.subscriptionPlanCode = subscriptionPlanCode;
    }

    public String getSubscriptionBillingCycle() {
        return subscriptionBillingCycle;
    }

    public void setSubscriptionBillingCycle(String subscriptionBillingCycle) {
        this.subscriptionBillingCycle = subscriptionBillingCycle;
    }

    public String getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public void setSubscriptionStatus(String subscriptionStatus) {
        this.subscriptionStatus = subscriptionStatus;
    }

    public Integer getMaxEmployees() {
        return maxEmployees;
    }

    public void setMaxEmployees(Integer maxEmployees) {
        this.maxEmployees = maxEmployees;
    }

    public Integer getMaxBranches() {
        return maxBranches;
    }

    public void setMaxBranches(Integer maxBranches) {
        this.maxBranches = maxBranches;
    }

    public OffsetDateTime getTrialEndsAt() {
        return trialEndsAt;
    }

    public void setTrialEndsAt(OffsetDateTime trialEndsAt) {
        this.trialEndsAt = trialEndsAt;
    }

    public OffsetDateTime getAccessExpiresAt() {
        return accessExpiresAt;
    }

    public void setAccessExpiresAt(OffsetDateTime accessExpiresAt) {
        this.accessExpiresAt = accessExpiresAt;
    }
}
