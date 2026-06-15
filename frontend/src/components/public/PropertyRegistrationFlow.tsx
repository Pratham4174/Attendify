import { useEffect, useMemo, useState } from "react";
import { RequiredLabel } from "../../components/shared";
import { API_BASE, extractError } from "../../lib/api";
import { openCashfreeCheckout } from "../../lib/cashfree";
import type {
  EmployeeSeedForm,
  PricingCatalog,
  PricingOption,
  PricingPlan,
  PublicCheckoutSessionResponse,
  PublicCheckoutSessionVerificationResponse,
  RegistrationSummary
} from "../../types";

type PropertyFormState = {
  propertyCode: string;
  propertyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone: string;
  branchName: string;
  branchAddress: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
};

type ContactFormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
};

type PendingCheckoutContext = ContactFormState & {
  planCode: string;
  billingCycle: string;
  accessMode: "TRIAL" | "PAID";
  employeeCount: number;
};

type UnlockedAccess = PendingCheckoutContext & {
  checkoutSessionId: string;
  planLabel: string;
  maxBranches: number;
  trialEndsAt: string | null;
  accessExpiresAt: string | null;
  message: string;
};

type CustomPlanFormState = ContactFormState & {
  employeeCount: string;
  message: string;
};

const PENDING_CHECKOUT_STORAGE_KEY = "peeplify-pending-checkout";

const defaultPropertyForm = (contact?: ContactFormState): PropertyFormState => ({
  propertyCode: "",
  propertyName: contact?.companyName ?? "",
  adminName: contact?.customerName ?? "",
  adminEmail: contact?.customerEmail ?? "",
  adminPassword: "",
  adminPhone: contact?.customerPhone ?? "",
  branchName: "Main Branch",
  branchAddress: "",
  latitude: "12.975673",
  longitude: "77.606415",
  radiusMeters: "50"
});

const defaultContactForm: ContactFormState = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  companyName: ""
};

const defaultCustomPlanForm: CustomPlanFormState = {
  ...defaultContactForm,
  employeeCount: "60",
  message: ""
};

const defaultEmployee = (): EmployeeSeedForm => ({
  localId: crypto.randomUUID(),
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  designation: ""
});

function formatAmount(amount: string, currency = "INR") {
  const numericAmount = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function savePendingCheckout(context: PendingCheckoutContext) {
  window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(context));
}

function readPendingCheckout(): PendingCheckoutContext | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingCheckoutContext) : null;
  } catch {
    return null;
  }
}

function clearPendingCheckout() {
  window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
}

function normalizePlanLabel(plan?: PricingPlan | null) {
  if (!plan) {
    return "Selected plan";
  }
  return plan.label;
}

function cycleDescription(option: PricingOption) {
  if (option.discountPercent <= 0) {
    return option.displayLabel;
  }
  return `${option.displayLabel} · ${option.discountPercent}% off`;
}

export function PropertyRegistrationFlow({
  onRegistrationComplete
}: {
  onRegistrationComplete: (summary: RegistrationSummary, adminPassword: string) => void;
}) {
  const [pricing, setPricing] = useState<PricingCatalog | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState("MONTHLY");
  const [contactForm, setContactForm] = useState<ContactFormState>(defaultContactForm);
  const [customPlanForm, setCustomPlanForm] = useState<CustomPlanFormState>(defaultCustomPlanForm);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [customPlanSubmitting, setCustomPlanSubmitting] = useState(false);
  const [customPlanStatus, setCustomPlanStatus] = useState("");
  const [unlockedAccess, setUnlockedAccess] = useState<UnlockedAccess | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(defaultPropertyForm());
  const [employees, setEmployees] = useState<EmployeeSeedForm[]>([defaultEmployee()]);

  const selectedPlan = useMemo(
    () => pricing?.plans.find((plan) => plan.code === selectedPlanCode) ?? null,
    [pricing, selectedPlanCode]
  );

  const selectedBillingOption = useMemo(
    () =>
      selectedPlan?.billingOptions.find((option) => option.billingCycle === selectedBillingCycle) ??
      selectedPlan?.billingOptions[0] ??
      null,
    [selectedBillingCycle, selectedPlan]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      setPricingLoading(true);
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

        setPricing(data);
        const defaultPlan = data.plans.find((plan) => !plan.customPlan) ?? data.plans[0];
        setSelectedPlanCode(defaultPlan?.code ?? "");
        setSelectedBillingCycle(defaultPlan?.billingOptions[0]?.billingCycle ?? "MONTHLY");
      } catch (error) {
        if (!cancelled) {
          setPricingError(error instanceof Error ? error.message : "Unable to load packages.");
        }
      } finally {
        if (!cancelled) {
          setPricingLoading(false);
        }
      }
    }

    void loadPricing();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlan) {
      return;
    }

    if (!selectedPlan.billingOptions.some((option) => option.billingCycle === selectedBillingCycle)) {
      setSelectedBillingCycle(selectedPlan.billingOptions[0]?.billingCycle ?? "MONTHLY");
    }
  }, [selectedBillingCycle, selectedPlan]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const cashfreeOrderId = query.get("checkout_session_id");
    if (!cashfreeOrderId) {
      return;
    }

    let cancelled = false;

    async function verifyCheckout() {
      setCheckoutLoading(true);
      setCheckoutStatus("Verifying your payment and unlocking property setup...");
      setCheckoutError("");

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

        const pendingContext = readPendingCheckout();
        if (!data.unlocked) {
          setCheckoutError(data.message);
          return;
        }

        const restoredPlan =
          pricing?.plans.find((plan) => plan.code === data.planCode) ??
          null;
        const unlocked: UnlockedAccess = {
          planCode: data.planCode,
          billingCycle: data.billingCycle,
          accessMode: data.accessMode.toUpperCase() === "TRIAL" ? "TRIAL" : "PAID",
          checkoutSessionId: data.checkoutSessionId,
          employeeCount: data.employeeCount ?? pendingContext?.employeeCount ?? restoredPlan?.employeeLimit ?? 1,
          maxBranches: data.maxBranches ?? restoredPlan?.maxBranches ?? 1,
          trialEndsAt: data.trialEndsAt,
          accessExpiresAt: data.accessExpiresAt,
          planLabel: normalizePlanLabel(restoredPlan),
          message: data.message,
          customerName: pendingContext?.customerName ?? contactForm.customerName,
          customerEmail: pendingContext?.customerEmail ?? contactForm.customerEmail,
          customerPhone: pendingContext?.customerPhone ?? contactForm.customerPhone,
          companyName: pendingContext?.companyName ?? contactForm.companyName
        };

        setUnlockedAccess(unlocked);
        setSelectedPlanCode(data.planCode);
        setSelectedBillingCycle(data.billingCycle);
        setContactForm({
          customerName: unlocked.customerName,
          customerEmail: unlocked.customerEmail,
          customerPhone: unlocked.customerPhone,
          companyName: unlocked.companyName
        });
        setPropertyForm((current) => ({
          ...defaultPropertyForm({
            customerName: unlocked.customerName,
            customerEmail: unlocked.customerEmail,
            customerPhone: unlocked.customerPhone,
            companyName: unlocked.companyName
          }),
          adminPassword: current.adminPassword
        }));
        setCheckoutStatus(data.message);
        clearPendingCheckout();
      } catch (error) {
        if (!cancelled) {
          setCheckoutError(error instanceof Error ? error.message : "Unable to verify your payment.");
        }
      } finally {
        if (!cancelled) {
          setCheckoutLoading(false);
          const nextUrl = `${window.location.pathname}${window.location.hash}`;
          window.history.replaceState({}, document.title, nextUrl);
        }
      }
    }

    void verifyCheckout();
    return () => {
      cancelled = true;
    };
  }, [pricing]);

  useEffect(() => {
    if (!unlockedAccess) {
      return;
    }

    setPropertyForm((current) => ({
      ...current,
      propertyName: current.propertyName || unlockedAccess.companyName,
      adminName: current.adminName || unlockedAccess.customerName,
      adminEmail: current.adminEmail || unlockedAccess.customerEmail,
      adminPhone: current.adminPhone || unlockedAccess.customerPhone
    }));
  }, [unlockedAccess]);

  function updateContactForm(key: keyof ContactFormState, value: string) {
    setContactForm((current) => ({ ...current, [key]: value }));
  }

  function updateCustomPlanForm(key: keyof CustomPlanFormState, value: string) {
    setCustomPlanForm((current) => ({ ...current, [key]: value }));
  }

  function updatePropertyForm(key: keyof PropertyFormState, value: string) {
    setPropertyForm((current) => ({ ...current, [key]: value }));
  }

  function updateEmployee(index: number, key: keyof EmployeeSeedForm, value: string) {
    setEmployees((current) =>
      current.map((employee, employeeIndex) =>
        employeeIndex === index ? { ...employee, [key]: value } : employee
      )
    );
  }

  function addEmployeeRow() {
    const employeeLimit = unlockedAccess?.employeeCount ?? selectedPlan?.employeeLimit ?? 1;
    if (employees.length >= employeeLimit) {
      return;
    }

    setEmployees((current) => [...current, defaultEmployee()]);
  }

  function removeEmployeeRow(index: number) {
    setEmployees((current) => (current.length === 1 ? current : current.filter((_, employeeIndex) => employeeIndex !== index)));
  }

  async function useCurrentBranchLocation() {
    setRegistrationStatus("");

    try {
      const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }),
          () => reject(new Error("Location permission was denied.")),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      setPropertyForm((current) => ({
        ...current,
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6)
      }));
      setRegistrationStatus("Current location added. You can still fine-tune the branch pin.");
    } catch (error) {
      setRegistrationStatus(
        error instanceof Error ? error.message : "Unable to fetch current location."
      );
    }
  }

  async function startCheckout(accessMode: "TRIAL" | "PAID") {
    if (!selectedPlan || selectedPlan.customPlan || !selectedPlan.employeeLimit) {
      return;
    }

    if (!contactForm.customerName || !contactForm.customerEmail || !contactForm.customerPhone || !contactForm.companyName) {
      setCheckoutError("Please add your business and contact details first.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");
    setCheckoutStatus(accessMode === "TRIAL" ? "Starting your free access..." : "Creating your payment session...");

    try {
      const payload = {
        planCode: selectedPlan.code,
        billingCycle: accessMode === "TRIAL" ? "TRIAL" : selectedBillingCycle,
        accessMode,
        customerName: contactForm.customerName,
        customerEmail: contactForm.customerEmail,
        customerPhone: contactForm.customerPhone,
        companyName: contactForm.companyName,
        employeeCount: selectedPlan.employeeLimit
      };

      const response = await fetch(`${API_BASE}/public/checkout-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const data = (await response.json()) as PublicCheckoutSessionResponse;
      const pendingContext: PendingCheckoutContext = {
        ...contactForm,
        planCode: selectedPlan.code,
        billingCycle: accessMode === "TRIAL" ? "TRIAL" : selectedBillingCycle,
        accessMode,
        employeeCount: selectedPlan.employeeLimit
      };
      savePendingCheckout(pendingContext);

      if (!data.paymentRequired) {
        const unlocked: UnlockedAccess = {
          ...pendingContext,
          checkoutSessionId: data.checkoutSessionId,
          planLabel: selectedPlan.label,
          maxBranches: selectedPlan.maxBranches,
          trialEndsAt: data.trialEndsAt,
          accessExpiresAt: data.accessExpiresAt,
          message: data.message
        };
        setUnlockedAccess(unlocked);
        setCheckoutStatus(data.message);
        clearPendingCheckout();
        return;
      }

      if (!data.paymentSessionId) {
        throw new Error("Cashfree did not return a payment session.");
      }

      await openCashfreeCheckout(data.paymentSessionId, data.cashfreeEnvironment);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to continue right now.");
      setCheckoutStatus("");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function submitCustomPlanInquiry(event: React.FormEvent) {
    event.preventDefault();
    setCustomPlanSubmitting(true);
    setCustomPlanStatus("");

    try {
      const response = await fetch(`${API_BASE}/public/sales-inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: customPlanForm.customerName,
          contactEmail: customPlanForm.customerEmail,
          contactPhone: customPlanForm.customerPhone,
          companyName: customPlanForm.companyName,
          employeeCount: Number(customPlanForm.employeeCount),
          message: customPlanForm.message
        })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const data = (await response.json()) as { message: string };
      setCustomPlanStatus(data.message);
      setCustomPlanForm(defaultCustomPlanForm);
    } catch (error) {
      setCustomPlanStatus(error instanceof Error ? error.message : "Unable to submit your request.");
    } finally {
      setCustomPlanSubmitting(false);
    }
  }

  async function handleRegistration(event: React.FormEvent) {
    event.preventDefault();
    if (!unlockedAccess) {
      return;
    }

    setRegistrationLoading(true);
    setRegistrationStatus("");

    try {
      const seededEmployees = employees.filter(
        (employee) =>
          employee.employeeCode ||
          employee.name ||
          employee.email ||
          employee.phone ||
          employee.designation
      );

      if (seededEmployees.length === 0) {
        throw new Error("Add at least one employee to complete the first workspace setup.");
      }

      const response = await fetch(`${API_BASE}/public/property-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSessionId: unlockedAccess.checkoutSessionId,
          ...propertyForm,
          latitude: Number(propertyForm.latitude),
          longitude: Number(propertyForm.longitude),
          radiusMeters: Number(propertyForm.radiusMeters),
          employees: seededEmployees.map(({ localId: _localId, ...employee }) => employee)
        })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const data = (await response.json()) as RegistrationSummary;
      onRegistrationComplete(
        {
          message: data.message,
          propertyName: propertyForm.propertyName,
          adminEmail: data.adminEmail,
          employeesCreated: data.employeesCreated
        },
        propertyForm.adminPassword
      );
    } catch (error) {
      setRegistrationStatus(error instanceof Error ? error.message : "Unable to register your property.");
    } finally {
      setRegistrationLoading(false);
    }
  }

  if (pricingLoading) {
    return (
      <div className="auth-section public-onboarding-loading">
        <strong>Loading plans...</strong>
        <span className="muted">Preparing PEEPLIFY packages and trial access.</span>
      </div>
    );
  }

  if (pricingError) {
    return <p className="error-text">{pricingError}</p>;
  }

  return (
    <div className="public-onboarding-stack">
      {!unlockedAccess ? (
        <>
          <div className="auth-section public-onboarding-intro">
            <div className="auth-section-title">
              <strong>Choose a PEEPLIFY package</strong>
              <span className="muted">
                Every plan includes attendance, leave, payroll snapshots, corrections, employee management, and reporting.
              </span>
            </div>
            <div className="public-trial-banner">
              <strong>{pricing?.freeTrialDays ?? 3}-day free access</strong>
              <span>New customers can unlock the full setup flow before paying.</span>
            </div>
          </div>

          <div className="public-plan-grid">
            {pricing?.plans.map((plan) => {
              const active = selectedPlanCode === plan.code;
              return (
                <article
                  key={plan.code}
                  className={`public-plan-card${active ? " active" : ""}${plan.customPlan ? " custom" : ""}`}
                >
                  <button
                    className="public-plan-toggle"
                    type="button"
                    onClick={() => setSelectedPlanCode(plan.code)}
                  >
                    <div className="public-plan-toggle-main">
                      <strong>{plan.label}</strong>
                      <span>{plan.employeeLimit ? `${plan.employeeLimit} employees` : "50+ employees"}</span>
                    </div>
                    <div className="public-plan-toggle-side">
                      {!plan.customPlan ? (
                        <span className="public-plan-inline-price">
                          {formatAmount(plan.billingOptions[0]?.amount ?? "0")} / month
                        </span>
                      ) : (
                        <span className="plan-badge neutral">Talk to us</span>
                      )}
                      <span className={`public-plan-chevron${active ? " active" : ""}`} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </span>
                    </div>
                  </button>
                  {active ? (
                    <div className="public-plan-body">
                      <p className="public-plan-summary">{plan.description}</p>
                      <div className="public-plan-meta">
                        <span>{plan.multipleBranchesIncluded ? "Multiple branches included" : `${plan.maxBranches} branch included`}</span>
                        <span>All core features included</span>
                      </div>
                      <div className="public-plan-features compact">
                        {plan.features.map((feature) => (
                          <span key={feature}>{feature}</span>
                        ))}
                        {plan.multipleBranchesIncluded ? <span>Multiple branch access included</span> : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {selectedPlan?.customPlan ? (
            <form className="auth-section" onSubmit={submitCustomPlanInquiry}>
              <div className="auth-section-title">
                <strong>Tell us about your team</strong>
                <span className="muted">Share your details and we will help you with a custom rollout for more than 50 employees.</span>
              </div>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Your name</RequiredLabel>
                  <input
                    value={customPlanForm.customerName}
                    onChange={(event) => updateCustomPlanForm("customerName", event.target.value)}
                    required
                    placeholder="Owner / HR lead"
                  />
                </label>
                <label>
                  <RequiredLabel>Business name</RequiredLabel>
                  <input
                    value={customPlanForm.companyName}
                    onChange={(event) => updateCustomPlanForm("companyName", event.target.value)}
                    required
                    placeholder="Your business name"
                  />
                </label>
              </div>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Email</RequiredLabel>
                  <input
                    value={customPlanForm.customerEmail}
                    onChange={(event) => updateCustomPlanForm("customerEmail", event.target.value)}
                    required
                    type="email"
                    placeholder="you@company.com"
                  />
                </label>
                <label>
                  <RequiredLabel>Phone</RequiredLabel>
                  <input
                    value={customPlanForm.customerPhone}
                    onChange={(event) => updateCustomPlanForm("customerPhone", event.target.value)}
                    required
                    placeholder="+91 98xxxxxxx"
                  />
                </label>
              </div>
              <label>
                <RequiredLabel>Team size</RequiredLabel>
                <input
                  min="51"
                  type="number"
                  value={customPlanForm.employeeCount}
                  onChange={(event) => updateCustomPlanForm("employeeCount", event.target.value)}
                  required
                />
              </label>
              <label>
                Message
                <textarea
                  className="public-inquiry-message"
                  value={customPlanForm.message}
                  onChange={(event) => updateCustomPlanForm("message", event.target.value)}
                  placeholder="Tell us about your branches, rollout timeline, or support needs."
                />
              </label>
              {customPlanStatus ? (
                <p className={customPlanStatus.includes("Thanks") ? "status-text" : "error-text"}>{customPlanStatus}</p>
              ) : null}
              <button className="primary-button" disabled={customPlanSubmitting} type="submit">
                {customPlanSubmitting ? "Sending..." : "Request custom pricing"}
              </button>
            </form>
          ) : (
            <div className="auth-section public-package-checkout">
              <div className="auth-section-title">
                <strong>Business and billing details</strong>
                <span className="muted">We use these details for your plan, free access, and payment receipt.</span>
              </div>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Your name</RequiredLabel>
                  <input
                    value={contactForm.customerName}
                    onChange={(event) => updateContactForm("customerName", event.target.value)}
                    required
                    placeholder="Owner / HR lead"
                  />
                </label>
                <label>
                  <RequiredLabel>Business name</RequiredLabel>
                  <input
                    value={contactForm.companyName}
                    onChange={(event) => updateContactForm("companyName", event.target.value)}
                    required
                    placeholder="Business or property name"
                  />
                </label>
              </div>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Email</RequiredLabel>
                  <input
                    value={contactForm.customerEmail}
                    onChange={(event) => updateContactForm("customerEmail", event.target.value)}
                    required
                    type="email"
                    placeholder="you@company.com"
                  />
                </label>
                <label>
                  <RequiredLabel>Phone</RequiredLabel>
                  <input
                    value={contactForm.customerPhone}
                    onChange={(event) => updateContactForm("customerPhone", event.target.value)}
                    required
                    placeholder="+91 98xxxxxxx"
                  />
                </label>
              </div>

              <div className="public-selected-plan-card">
                <div>
                  <strong>{selectedPlan?.label}</strong>
                  <span>{selectedPlan?.description}</span>
                </div>
                <span className="plan-badge">{selectedPlan?.multipleBranchesIncluded ? "Multiple branches included" : "All features included"}</span>
              </div>

              <div className="public-billing-options">
                {selectedPlan?.billingOptions.map((option) => (
                  <button
                    key={option.billingCycle}
                    className={`public-billing-option${selectedBillingCycle === option.billingCycle ? " active" : ""}`}
                    type="button"
                    onClick={() => setSelectedBillingCycle(option.billingCycle)}
                  >
                    <strong>{cycleDescription(option)}</strong>
                    <span>{formatAmount(option.amount)}</span>
                  </button>
                ))}
              </div>

              <div className="public-checkout-actions">
                <button
                  className="secondary-button"
                  disabled={checkoutLoading}
                  type="button"
                  onClick={() => void startCheckout("TRIAL")}
                >
                  {checkoutLoading ? "Please wait..." : `Start ${pricing?.freeTrialDays ?? 3}-day free access`}
                </button>
                <button
                  className="primary-button"
                  disabled={checkoutLoading || !selectedBillingOption}
                  type="button"
                  onClick={() => void startCheckout("PAID")}
                >
                  {checkoutLoading
                    ? "Preparing..."
                    : `Pay ${selectedBillingOption ? formatAmount(selectedBillingOption.amount) : ""}`}
                </button>
              </div>
              {checkoutStatus ? <p className="status-text">{checkoutStatus}</p> : null}
              {checkoutError ? <p className="error-text">{checkoutError}</p> : null}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="auth-section public-registration-ready">
            <div className="auth-section-title">
              <strong>{unlockedAccess.planLabel} unlocked</strong>
              <span className="muted">
                {unlockedAccess.accessMode === "TRIAL"
                  ? "Your free access is active. Complete the setup below."
                  : "Your payment is verified. Complete the setup below."}
              </span>
            </div>
            <div className="public-ready-meta">
              <span className="plan-badge">{unlockedAccess.employeeCount} employee pack</span>
              <span className="plan-badge neutral">
                {unlockedAccess.maxBranches > 1
                  ? `${unlockedAccess.maxBranches} branches available`
                  : "1 branch included"}
              </span>
              {unlockedAccess.trialEndsAt ? (
                <span className="plan-badge neutral">Trial ends {formatDateTime(unlockedAccess.trialEndsAt)}</span>
              ) : null}
              {unlockedAccess.accessExpiresAt && unlockedAccess.accessMode === "PAID" ? (
                <span className="plan-badge neutral">Access valid till {formatDateTime(unlockedAccess.accessExpiresAt)}</span>
              ) : null}
            </div>
            {checkoutStatus ? <p className="status-text">{checkoutStatus}</p> : null}
          </div>

          <form onSubmit={handleRegistration}>
            <div className="auth-section">
              <div className="auth-section-title">
                <strong>Property details</strong>
                <span className="muted">Set up your business and main admin account.</span>
              </div>
              <label>
                <RequiredLabel>Property code</RequiredLabel>
                <input
                  value={propertyForm.propertyCode}
                  onChange={(event) => updatePropertyForm("propertyCode", event.target.value)}
                  required
                  placeholder="peeplify-demo"
                />
              </label>
              <label>
                <RequiredLabel>Property name</RequiredLabel>
                <input
                  value={propertyForm.propertyName}
                  onChange={(event) => updatePropertyForm("propertyName", event.target.value)}
                  required
                  placeholder="Business / property name"
                />
              </label>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Admin name</RequiredLabel>
                  <input
                    value={propertyForm.adminName}
                    onChange={(event) => updatePropertyForm("adminName", event.target.value)}
                    required
                    placeholder="Owner / manager"
                  />
                </label>
                <label>
                  <RequiredLabel>Admin phone</RequiredLabel>
                  <input
                    value={propertyForm.adminPhone}
                    onChange={(event) => updatePropertyForm("adminPhone", event.target.value)}
                    required
                    placeholder="+91 98xxxxxxx"
                  />
                </label>
              </div>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Admin email</RequiredLabel>
                  <input
                    value={propertyForm.adminEmail}
                    onChange={(event) => updatePropertyForm("adminEmail", event.target.value)}
                    required
                    type="email"
                    placeholder="admin@company.com"
                  />
                </label>
                <label>
                  <RequiredLabel>Admin password</RequiredLabel>
                  <input
                    value={propertyForm.adminPassword}
                    onChange={(event) => updatePropertyForm("adminPassword", event.target.value)}
                    required
                    type="password"
                    placeholder="Create a password"
                  />
                </label>
              </div>
            </div>

            <div className="auth-section">
              <div className="auth-section-title">
                <strong>Main branch</strong>
                <span className="muted">Add the first branch where your team will mark attendance.</span>
              </div>
              <label>
                <RequiredLabel>Branch name</RequiredLabel>
                <input
                  value={propertyForm.branchName}
                  onChange={(event) => updatePropertyForm("branchName", event.target.value)}
                  required
                />
              </label>
              <label>
                <RequiredLabel>Branch address</RequiredLabel>
                <input
                  value={propertyForm.branchAddress}
                  onChange={(event) => updatePropertyForm("branchAddress", event.target.value)}
                  required
                  placeholder="Full branch address"
                />
              </label>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Latitude</RequiredLabel>
                  <input
                    value={propertyForm.latitude}
                    onChange={(event) => updatePropertyForm("latitude", event.target.value)}
                    required
                  />
                </label>
                <label>
                  <RequiredLabel>Longitude</RequiredLabel>
                  <input
                    value={propertyForm.longitude}
                    onChange={(event) => updatePropertyForm("longitude", event.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="action-row">
                <button className="secondary-button" type="button" onClick={() => void useCurrentBranchLocation()}>
                  Use current location
                </button>
                <span className="muted auth-inline-note">You can fine-tune the branch pin after loading your current location.</span>
              </div>
              <label>
                <RequiredLabel>Attendance radius (meters)</RequiredLabel>
                <input
                  value={propertyForm.radiusMeters}
                  onChange={(event) => updatePropertyForm("radiusMeters", event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="auth-section">
              <div className="action-row auth-section-heading">
                <div className="auth-section-title">
                  <strong>Starter employees</strong>
                  <span className="muted">
                    Add at least one team member now. You can seed up to {unlockedAccess.employeeCount} employees in this package and add the rest later.
                  </span>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={addEmployeeRow}
                  disabled={employees.length >= unlockedAccess.employeeCount}
                >
                  Add employee
                </button>
              </div>
              <div className="employee-seed-list">
                {employees.map((employee, index) => (
                  <div className="employee-seed-card" key={employee.localId}>
                    <div className="grid two-column compact-grid">
                      <label>
                        <RequiredLabel>Employee code</RequiredLabel>
                        <input
                          value={employee.employeeCode}
                          onChange={(event) => updateEmployee(index, "employeeCode", event.target.value)}
                          required
                          placeholder="EMP-001"
                        />
                      </label>
                      <label>
                        <RequiredLabel>Name</RequiredLabel>
                        <input
                          value={employee.name}
                          onChange={(event) => updateEmployee(index, "name", event.target.value)}
                          required
                          placeholder="Employee name"
                        />
                      </label>
                    </div>
                    <div className="grid two-column compact-grid">
                      <label>
                        <RequiredLabel>Email</RequiredLabel>
                        <input
                          value={employee.email}
                          onChange={(event) => updateEmployee(index, "email", event.target.value)}
                          required
                          type="email"
                          placeholder="employee@company.com"
                        />
                      </label>
                      <label>
                        <RequiredLabel>Phone</RequiredLabel>
                        <input
                          value={employee.phone}
                          onChange={(event) => updateEmployee(index, "phone", event.target.value)}
                          required
                          placeholder="+91 98xxxxxxx"
                        />
                      </label>
                    </div>
                    <label>
                      <RequiredLabel>Designation</RequiredLabel>
                      <input
                        value={employee.designation}
                        onChange={(event) => updateEmployee(index, "designation", event.target.value)}
                        required
                        placeholder="Manager / Front desk / Operations"
                      />
                    </label>
                    <button className="ghost-button" type="button" onClick={() => removeEmployeeRow(index)}>
                      Remove employee
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {registrationStatus ? (
              <p className={registrationStatus.includes("successfully") ? "status-text" : "error-text"}>
                {registrationStatus}
              </p>
            ) : null}

            <button className="primary-button" disabled={registrationLoading} type="submit">
              {registrationLoading ? "Creating workspace..." : "Create workspace"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
