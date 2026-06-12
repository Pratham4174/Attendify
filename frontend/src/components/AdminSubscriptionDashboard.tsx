import { useEffect, useMemo, useState } from "react";
import { EmptyState, MetricCard } from "./shared";
import { API_BASE, apiFetch, extractError } from "../lib/api";
import { formatDateTime, formatMoney } from "../lib/format";
import { openCashfreeCheckout } from "../lib/cashfree";
import { downloadSubscriptionInvoice } from "../lib/subscription";
import type {
  PricingCatalog,
  PricingPlan,
  PublicCheckoutSessionResponse,
  PublicCheckoutSessionVerificationResponse,
  Session,
  SubscriptionDashboard
} from "../types";

type CheckoutFormState = {
  customerPhone: string;
};

type CustomPlanFormState = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  employeeCount: string;
  message: string;
};

function cycleDescription(label: string, discountPercent: number) {
  return discountPercent > 0 ? `${label} · ${discountPercent}% off` : label;
}

export function AdminSubscriptionDashboard({
  session
}: {
  session: Session;
}) {
  const [dashboard, setDashboard] = useState<SubscriptionDashboard | null>(null);
  const [pricing, setPricing] = useState<PricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedPlanCode, setExpandedPlanCode] = useState("");
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState("MONTHLY");
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>({
    customerPhone: ""
  });
  const [customPlanForm, setCustomPlanForm] = useState<CustomPlanFormState>({
    contactName: session.user.name,
    contactEmail: session.user.email,
    contactPhone: "",
    companyName: session.user.vendorName,
    employeeCount: "60",
    message: ""
  });
  const [customPlanSubmitting, setCustomPlanSubmitting] = useState(false);
  const [customPlanStatus, setCustomPlanStatus] = useState("");

  const selectedPlan = useMemo<PricingPlan | null>(
    () => pricing?.plans.find((plan) => plan.code === selectedPlanCode && !plan.customPlan) ?? null,
    [pricing, selectedPlanCode]
  );

  const selectedBilling = useMemo(
    () =>
      selectedPlan?.billingOptions.find((option) => option.billingCycle === selectedBillingCycle) ??
      selectedPlan?.billingOptions[0] ??
      null,
    [selectedBillingCycle, selectedPlan]
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [subscriptionData, pricingResponse] = await Promise.all([
        apiFetch<SubscriptionDashboard>(session, "/admin/subscription"),
        fetch(`${API_BASE}/public/pricing`)
      ]);

      if (!pricingResponse.ok) {
        throw new Error(await extractError(pricingResponse));
      }

      const pricingData = (await pricingResponse.json()) as PricingCatalog;
      const plans = pricingData.plans.filter((plan) => !plan.customPlan);

      setDashboard(subscriptionData);
      setPricing({ ...pricingData, plans });

      const currentPlanCode = subscriptionData.currentPlan.planCode;
      const nextPlan = plans.find((plan) => plan.code === currentPlanCode) ?? plans[0] ?? null;
      if (nextPlan) {
        setSelectedPlanCode(nextPlan.code);
        setExpandedPlanCode(nextPlan.code);
        const matchingCycle = nextPlan.billingOptions.find(
          (option) => option.billingCycle === subscriptionData.currentPlan.billingCycle.toUpperCase().replace(/[^A-Z_]/g, "_")
        );
        setSelectedBillingCycle(matchingCycle?.billingCycle ?? nextPlan.billingOptions[0]?.billingCycle ?? "MONTHLY");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load subscription details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session]);

  useEffect(() => {
    if (selectedPlan) {
      setExpandedPlanCode(selectedPlan.code);
    }
  }, [selectedPlanCode, selectedPlan]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const cashfreeOrderId = query.get("checkout_session_id");
    const isRenew = query.get("renew") === "1";
    if (!cashfreeOrderId || !isRenew) {
      return;
    }

    let cancelled = false;

    async function verifyRenewal() {
      setSubmitting(true);
      setStatus("Verifying your renewal payment...");
      setError("");

      try {
        const response = await fetch(`${API_BASE}/public/checkout-sessions/${cashfreeOrderId}/verify`, {
          method: "POST"
        });
        if (!response.ok) {
          throw new Error(await extractError(response));
        }

        const data = (await response.json()) as PublicCheckoutSessionVerificationResponse;
        if (cancelled) {
          return;
        }

        if (!data.unlocked) {
          throw new Error(data.message);
        }

        setStatus(data.message);
        await loadData();
      } catch (verifyError) {
        if (!cancelled) {
          setError(verifyError instanceof Error ? verifyError.message : "Unable to verify the payment.");
        }
      } finally {
        if (!cancelled) {
          setSubmitting(false);
          const nextUrl = `${window.location.pathname}${window.location.hash}`;
          window.history.replaceState({}, document.title, nextUrl);
        }
      }
    }

    void verifyRenewal();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function startCheckout() {
    if (!selectedPlan || !selectedBilling) {
      return;
    }
    if (!checkoutForm.customerPhone.trim()) {
      setError("Please add a contact phone number before continuing to payment.");
      return;
    }

    setSubmitting(true);
    setStatus("Creating your subscription payment session...");
    setError("");

    try {
      const response = await apiFetch<PublicCheckoutSessionResponse>(session, "/admin/subscription/checkout", {
        method: "POST",
        body: JSON.stringify({
          planCode: selectedPlan.code,
          billingCycle: selectedBilling.billingCycle,
          customerPhone: checkoutForm.customerPhone.trim()
        })
      });

      if (!response.paymentSessionId) {
        throw new Error("Cashfree did not return a payment session.");
      }

      await openCashfreeCheckout(response.paymentSessionId, response.cashfreeEnvironment);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start payment right now.");
      setStatus("");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  async function submitCustomPlanInquiry(event: React.FormEvent) {
    event.preventDefault();
    setCustomPlanSubmitting(true);
    setCustomPlanStatus("");
    setError("");

    try {
      const response = await fetch(`${API_BASE}/public/sales-inquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contactName: customPlanForm.contactName.trim(),
          contactEmail: customPlanForm.contactEmail.trim(),
          contactPhone: customPlanForm.contactPhone.trim(),
          companyName: customPlanForm.companyName.trim(),
          employeeCount: Number(customPlanForm.employeeCount || "0"),
          message: customPlanForm.message.trim()
        })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const body = (await response.json()) as { message?: string };
      setCustomPlanStatus(body.message ?? "Your custom plan request has been sent.");
    } catch (submitError) {
      setCustomPlanStatus(submitError instanceof Error ? submitError.message : "Unable to send your custom plan request.");
    } finally {
      setCustomPlanSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h3>Billing</h3>
        <p className="muted section-intro">Loading your current plan, renewal date, and payment history.</p>
      </section>
    );
  }

  if (!dashboard || !pricing) {
    return (
      <section className="panel">
        <h3>Billing</h3>
        <p className="error-text">{error || "Unable to load subscription details."}</p>
      </section>
    );
  }

  const currentPlan = dashboard.currentPlan;
  const isTrial = currentPlan.subscriptionStatus.toLowerCase().includes("trial");

  return (
    <>
      <section className="panel">
        <div className="topbar">
          <div>
            <h3>Billing</h3>
            <p className="muted section-intro">
              Keep plan details, limits, trial or expiry status, renewals, payment history, and custom-plan contact in one place.
            </p>
          </div>
          <span className="pill">{currentPlan.subscriptionStatus}</span>
        </div>
        <div className="subscription-summary-grid">
          <MetricCard label="Current plan" value={currentPlan.planLabel} />
          <MetricCard
            label={isTrial ? "Trial ends" : "Renewal date"}
            value={formatDateTime(isTrial ? currentPlan.trialEndsAt : currentPlan.renewalDate)}
          />
          <MetricCard
            label="Employee limit used"
            value={`${currentPlan.employeeUsed}/${currentPlan.employeeLimit ?? "Custom"}`}
          />
          <MetricCard
            label="Branch usage"
            value={`${currentPlan.branchUsed}/${currentPlan.branchLimit || 1}`}
          />
        </div>
        <div className="grid two-column compact-grid subscription-meta-grid">
          <div className="info-card">
            <strong>Billing cycle</strong>
            <span className="muted">{currentPlan.billingCycle}</span>
          </div>
          <div className="info-card">
            <strong>Property code</strong>
            <span className="muted">{currentPlan.propertyCode}</span>
          </div>
        </div>
      </section>

      <section className="grid two-column">
        <article className="panel">
          <div className="topbar">
            <div>
              <h3>Upgrade plan</h3>
              <p className="muted section-intro">
                Choose a plan and billing cycle. You can renew the same package or move to a bigger one anytime.
              </p>
            </div>
          </div>
          <div className="subscription-plan-stack">
            {pricing.plans.map((plan) => {
              const expanded = expandedPlanCode === plan.code;
              const selected = selectedPlanCode === plan.code;
              return (
                <article className={`subscription-plan-accordion${selected ? " selected" : ""}`} key={plan.code}>
                  <button
                    className="subscription-plan-header"
                    onClick={() => {
                      setExpandedPlanCode(expanded ? "" : plan.code);
                      setSelectedPlanCode(plan.code);
                      setSelectedBillingCycle(plan.billingOptions[0]?.billingCycle ?? "MONTHLY");
                    }}
                    type="button"
                  >
                    <div>
                      <strong>{plan.label}</strong>
                      <span className="muted">{formatMoney(plan.billingOptions[0]?.amount ?? "0")} starting price</span>
                    </div>
                    <span className="pill">{plan.multipleBranchesIncluded ? "Multi-branch" : "Single branch"}</span>
                  </button>
                  {expanded ? (
                    <div className="subscription-plan-body">
                      <p className="muted">{plan.description}</p>
                      <div className="subscription-feature-line">
                        <span>{plan.employeeLimit ?? "Custom"} employees</span>
                        <span>{plan.maxBranches} branch{plan.maxBranches > 1 ? "es" : ""}</span>
                        <span>All core features</span>
                      </div>
                      <div className="subscription-cycle-grid">
                        {plan.billingOptions.map((option) => (
                          <label className={`subscription-cycle-option${selected && selectedBillingCycle === option.billingCycle ? " active" : ""}`} key={option.billingCycle}>
                            <input
                              checked={selected && selectedBillingCycle === option.billingCycle}
                              name={`subscription-cycle-${plan.code}`}
                              onChange={() => {
                                setSelectedPlanCode(plan.code);
                                setSelectedBillingCycle(option.billingCycle);
                              }}
                              type="radio"
                            />
                            <strong>{cycleDescription(option.displayLabel, option.discountPercent)}</strong>
                            <span>{formatMoney(option.amount)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className="subscription-checkout-box">
            <label>
              Contact phone
              <input
                onChange={(event) => setCheckoutForm({ customerPhone: event.target.value })}
                placeholder="9999999999"
                type="tel"
                value={checkoutForm.customerPhone}
              />
            </label>
            <div className="action-row">
              <button className="primary-button" disabled={submitting || !selectedPlan || !selectedBilling} onClick={() => void startCheckout()} type="button">
                {submitting ? "Preparing..." : selectedPlanCode === currentPlan.planCode ? "Renew current plan" : "Upgrade and pay"}
              </button>
            </div>
            {selectedPlan && selectedBilling ? (
              <p className="muted">
                Selected: {selectedPlan.label} · {selectedBilling.displayLabel} · {formatMoney(selectedBilling.amount)}
              </p>
            ) : null}
            {status ? <p className="status-text">{status}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </article>

        <article className="panel">
          <h3>Payment history</h3>
          <p className="muted section-intro">
            Track every trial, payment attempt, renewal, and paid invoice from one place.
          </p>
          {dashboard.paymentHistory.length ? (
            <>
              <div className="responsive-table-shell subscription-table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Cycle</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.paymentHistory.map((payment) => (
                      <tr key={payment.checkoutSessionId}>
                        <td>
                          <strong>{payment.planLabel}</strong>
                          <div className="table-subtext">{payment.cashfreeOrderId ?? payment.checkoutSessionId}</div>
                        </td>
                        <td>{payment.billingCycle}</td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>
                          <strong>{payment.paymentStatus ?? payment.status}</strong>
                          <div className="table-subtext">
                            {payment.accessExpiresAt ? `Valid till ${formatDateTime(payment.accessExpiresAt)}` : payment.accessMode}
                          </div>
                        </td>
                        <td>{formatDateTime(payment.createdAt)}</td>
                        <td>
                          {payment.invoiceAvailable ? (
                            <button className="ghost-button compact-button" onClick={() => downloadSubscriptionInvoice(dashboard, payment)} type="button">
                              Download
                            </button>
                          ) : (
                            <span className="muted">Not available</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="attendance-card-list subscription-history-cards">
                {dashboard.paymentHistory.map((payment) => (
                  <article className="attendance-card" key={payment.checkoutSessionId}>
                    <div className="attendance-card-header">
                      <strong>{payment.planLabel}</strong>
                      <span className="pill">{payment.paymentStatus ?? payment.status}</span>
                    </div>
                    <div className="attendance-card-grid">
                      <span>Cycle</span>
                      <strong>{payment.billingCycle}</strong>
                      <span>Amount</span>
                      <strong>{formatMoney(payment.amount)}</strong>
                      <span>Created</span>
                      <strong>{formatDateTime(payment.createdAt)}</strong>
                    </div>
                    <div className="action-row">
                      {payment.invoiceAvailable ? (
                        <button className="ghost-button compact-button" onClick={() => downloadSubscriptionInvoice(dashboard, payment)} type="button">
                          Download invoice
                        </button>
                      ) : (
                        <span className="muted">Invoice not available yet</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No payment history yet" message="Your trial and paid subscription records will appear here once checkout sessions are created." />
          )}
        </article>
      </section>

      <section className="panel">
        <div className="topbar">
          <div>
            <h3>Contact sales for a custom plan</h3>
            <p className="muted section-intro">
              Use this when you need more than 50 employees, tailored rollout help, or a custom billing arrangement.
            </p>
          </div>
          <span className="pill">Custom plan</span>
        </div>
        <form className="admin-form-grid" onSubmit={(event) => void submitCustomPlanInquiry(event)}>
          <div className="grid two-column compact-grid">
            <label>
              Contact name
              <input
                onChange={(event) => setCustomPlanForm((current) => ({ ...current, contactName: event.target.value }))}
                required
                value={customPlanForm.contactName}
              />
            </label>
            <label>
              Work email
              <input
                onChange={(event) => setCustomPlanForm((current) => ({ ...current, contactEmail: event.target.value }))}
                required
                type="email"
                value={customPlanForm.contactEmail}
              />
            </label>
          </div>
          <div className="grid three-column compact-grid">
            <label>
              Phone
              <input
                onChange={(event) => setCustomPlanForm((current) => ({ ...current, contactPhone: event.target.value }))}
                required
                value={customPlanForm.contactPhone}
              />
            </label>
            <label>
              Company name
              <input
                onChange={(event) => setCustomPlanForm((current) => ({ ...current, companyName: event.target.value }))}
                required
                value={customPlanForm.companyName}
              />
            </label>
            <label>
              Employees needed
              <input
                min="51"
                onChange={(event) => setCustomPlanForm((current) => ({ ...current, employeeCount: event.target.value }))}
                required
                type="number"
                value={customPlanForm.employeeCount}
              />
            </label>
          </div>
          <label>
            What do you need?
            <textarea
              onChange={(event) => setCustomPlanForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Tell us about branches, rollout timeline, payroll needs, or support expectations."
              rows={4}
              value={customPlanForm.message}
            />
          </label>
          <div className="action-row">
            <button className="primary-button" disabled={customPlanSubmitting} type="submit">
              {customPlanSubmitting ? "Sending..." : "Contact sales"}
            </button>
          </div>
          {customPlanStatus ? (
            <p className={customPlanStatus.toLowerCase().includes("thanks") || customPlanStatus.toLowerCase().includes("sent") ? "status-text" : "error-text"}>
              {customPlanStatus}
            </p>
          ) : null}
        </form>
      </section>
    </>
  );
}
