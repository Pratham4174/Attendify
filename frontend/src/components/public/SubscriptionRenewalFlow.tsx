import { useEffect, useMemo, useState } from "react";
import { RequiredLabel } from "../../components/shared";
import { API_BASE, extractError } from "../../lib/api";
import { openCashfreeCheckout } from "../../lib/cashfree";
import type {
  PricingCatalog,
  PricingPlan,
  PublicCheckoutSessionResponse,
  PublicCheckoutSessionVerificationResponse
} from "../../types";

type RenewalFormState = {
  propertyCode: string;
  adminEmail: string;
  customerName: string;
  customerPhone: string;
};

type PendingRenewalContext = RenewalFormState & {
  planCode: string;
  billingCycle: string;
};

const PENDING_RENEWAL_STORAGE_KEY = "peeplify-pending-renewal";

function formatAmount(amount: string, currency = "INR") {
  const numericAmount = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

function readPendingRenewal(): PendingRenewalContext | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_RENEWAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingRenewalContext) : null;
  } catch {
    return null;
  }
}

function savePendingRenewal(context: PendingRenewalContext) {
  window.sessionStorage.setItem(PENDING_RENEWAL_STORAGE_KEY, JSON.stringify(context));
}

function clearPendingRenewal() {
  window.sessionStorage.removeItem(PENDING_RENEWAL_STORAGE_KEY);
}

function cycleDescription(billingMonths: number, discountPercent: number, label: string) {
  if (discountPercent <= 0) {
    return label;
  }
  return `${label} · ${discountPercent}% off`;
}

export function SubscriptionRenewalFlow({
  initialEmail,
  onBack,
  onRenewed
}: {
  initialEmail: string;
  onBack: () => void;
  onRenewed: (message: string) => void;
}) {
  const [pricing, setPricing] = useState<PricingCatalog | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState("MONTHLY");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RenewalFormState>({
    propertyCode: "",
    adminEmail: initialEmail,
    customerName: "",
    customerPhone: ""
  });

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

  useEffect(() => {
    setForm((current) => ({ ...current, adminEmail: initialEmail || current.adminEmail }));
  }, [initialEmail]);

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      setLoadingPricing(true);
      setPricingError("");

      try {
        const response = await fetch(`${API_BASE}/public/pricing`);
        if (!response.ok) {
          throw new Error(await extractError(response));
        }

        const data = (await response.json()) as PricingCatalog;
        if (cancelled) {
          return;
        }

        const plans = data.plans.filter((plan) => !plan.customPlan);
        setPricing({ ...data, plans });
        setSelectedPlanCode(plans[0]?.code ?? "");
        setSelectedBillingCycle(plans[0]?.billingOptions[0]?.billingCycle ?? "MONTHLY");
      } catch (loadError) {
        if (!cancelled) {
          setPricingError(loadError instanceof Error ? loadError.message : "Unable to load renewal plans.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPricing(false);
        }
      }
    }

    void loadPricing();
    return () => {
      cancelled = true;
    };
  }, []);

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

        clearPendingRenewal();
        setStatus(data.message);
        onRenewed(data.message);
      } catch (verifyError) {
        if (!cancelled) {
          setError(verifyError instanceof Error ? verifyError.message : "Unable to verify the renewal payment.");
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
  }, [onRenewed]);

  async function startRenewal() {
    if (!selectedPlan || !selectedBilling) {
      return;
    }

    if (!form.propertyCode || !form.adminEmail || !form.customerName || !form.customerPhone) {
      setError("Please fill the renewal details first.");
      return;
    }

    setSubmitting(true);
    setStatus("Creating your renewal payment session...");
    setError("");

    try {
      const payload = {
        propertyCode: form.propertyCode,
        adminEmail: form.adminEmail,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        planCode: selectedPlan.code,
        billingCycle: selectedBilling.billingCycle
      };

      const response = await fetch(`${API_BASE}/public/subscription-renewals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const data = (await response.json()) as PublicCheckoutSessionResponse;
      if (!data.paymentSessionId) {
        throw new Error("Cashfree did not return a payment session.");
      }

      savePendingRenewal({
        ...form,
        planCode: selectedPlan.code,
        billingCycle: selectedBilling.billingCycle
      });
      await openCashfreeCheckout(data.paymentSessionId, data.cashfreeEnvironment);
    } catch (renewError) {
      setError(renewError instanceof Error ? renewError.message : "Unable to start your renewal right now.");
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPricing) {
    return (
      <div className="auth-section public-onboarding-loading">
        <strong>Loading renewal plans...</strong>
        <span className="muted">Preparing your package options.</span>
      </div>
    );
  }

  if (pricingError) {
    return <p className="error-text">{pricingError}</p>;
  }

  return (
    <div className="public-onboarding-stack">
      <div className="auth-section public-package-checkout">
        <div className="auth-section-title">
          <strong>Renew your workspace</strong>
          <span className="muted">Select a new plan, complete payment, and then sign back in.</span>
        </div>
        <div className="grid two-column compact-grid">
          <label>
            <RequiredLabel>Property code</RequiredLabel>
            <input
              value={form.propertyCode}
              onChange={(event) => setForm((current) => ({ ...current, propertyCode: event.target.value }))}
              required
              placeholder="your-property-code"
            />
          </label>
          <label>
            <RequiredLabel>Admin email</RequiredLabel>
            <input
              value={form.adminEmail}
              onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))}
              required
              type="email"
              placeholder="admin@company.com"
            />
          </label>
        </div>
        <div className="grid two-column compact-grid">
          <label>
            <RequiredLabel>Contact name</RequiredLabel>
            <input
              value={form.customerName}
              onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
              required
              placeholder="Owner / admin name"
            />
          </label>
          <label>
            <RequiredLabel>Phone</RequiredLabel>
            <input
              value={form.customerPhone}
              onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
              required
              placeholder="+91 98xxxxxxx"
            />
          </label>
        </div>

        <div className="public-plan-grid">
          {pricing?.plans.map((plan) => (
            <article
              key={plan.code}
              className={`public-plan-card${selectedPlanCode === plan.code ? " active" : ""}`}
            >
              <button
                className="public-plan-toggle"
                type="button"
                onClick={() => setSelectedPlanCode(plan.code)}
              >
                <div className="public-plan-toggle-main">
                  <strong>{plan.label}</strong>
                  <span>{plan.employeeLimit ? `${plan.employeeLimit} employees` : ""}</span>
                </div>
                <div className="public-plan-toggle-side">
                  <span className="public-plan-inline-price">
                    {formatAmount(plan.billingOptions[0]?.amount ?? "0")} / month
                  </span>
                  <span
                    className={`public-plan-chevron${selectedPlanCode === plan.code ? " active" : ""}`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </span>
                </div>
              </button>
              {selectedPlanCode === plan.code ? (
                <div className="public-plan-body">
                  <p className="public-plan-summary">{plan.description}</p>
                  <div className="public-plan-meta">
                    <span>{plan.multipleBranchesIncluded ? "Multiple branches included" : `${plan.maxBranches} branch included`}</span>
                    <span>All core features included</span>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="public-billing-options">
          {selectedPlan?.billingOptions.map((option) => (
            <button
              key={option.billingCycle}
              className={`public-billing-option${selectedBillingCycle === option.billingCycle ? " active" : ""}`}
              type="button"
              onClick={() => setSelectedBillingCycle(option.billingCycle)}
            >
              <strong>{cycleDescription(option.billingMonths, option.discountPercent, option.displayLabel)}</strong>
              <span>{formatAmount(option.amount)}</span>
            </button>
          ))}
        </div>

        {status ? <p className="status-text">{status}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="public-checkout-actions">
          <button className="ghost-button" type="button" onClick={onBack}>
            Back
          </button>
          <button className="primary-button" disabled={submitting} type="button" onClick={() => void startRenewal()}>
            {submitting ? "Please wait..." : `Pay ${selectedBilling ? formatAmount(selectedBilling.amount) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
