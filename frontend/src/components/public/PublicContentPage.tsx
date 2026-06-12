import { useEffect, useState } from "react";
import { BrandLogo } from "../shared";
import { ContactRequestForm } from "../ContactRequestForm";
import { API_BASE, extractError } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { PricingCatalog } from "../../types";

export type PublicPageKey = "pricing" | "features" | "contact" | "privacy" | "terms" | "refund";

export function PublicContentPage({
  page,
  onBack
}: {
  page: PublicPageKey;
  onBack: () => void;
}) {
  const [pricing, setPricing] = useState<PricingCatalog | null>(null);

  useEffect(() => {
    if (page !== "pricing") {
      return;
    }

    let cancelled = false;
    async function loadPricing() {
      try {
        const response = await fetch(`${API_BASE}/public/pricing`);
        if (!response.ok) {
          throw new Error(await extractError(response));
        }
        const data = (await response.json()) as PricingCatalog;
        if (!cancelled) {
          setPricing(data);
        }
      } catch {
        if (!cancelled) {
          setPricing(null);
        }
      }
    }

    void loadPricing();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const titles: Record<PublicPageKey, { eyebrow: string; title: string; intro: string }> = {
    pricing: {
      eyebrow: "Pricing",
      title: "Simple plans for growing teams",
      intro: "Choose a package that fits your employee count and expand when you are ready."
    },
    features: {
      eyebrow: "Features",
      title: "Built for workforce clarity",
      intro: "Peeplify keeps attendance, proof, payroll visibility, leave, and owner control in one place."
    },
    contact: {
      eyebrow: "Contact",
      title: "Book a demo or ask for help",
      intro: "Reach out for a walkthrough, onboarding help, or a custom rollout for your business."
    },
    privacy: {
      eyebrow: "Legal",
      title: "Privacy policy",
      intro: "High-level privacy commitments for how Peeplify handles business and employee information."
    },
    terms: {
      eyebrow: "Legal",
      title: "Terms of service",
      intro: "The basic rules for using Peeplify as a commercial workforce management platform."
    },
    refund: {
      eyebrow: "Legal",
      title: "Refund policy",
      intro: "A simple refund outline so customers know what to expect before paying."
    }
  };

  const meta = titles[page];

  return (
    <main className="public-page-shell">
      <section className="panel public-page-panel">
        <div className="topbar">
          <div className="workspace-brand-lockup">
            <BrandLogo className="brand-logo-compact" />
            <div>
              <span className="eyebrow">{meta.eyebrow}</span>
              <h2>{meta.title}</h2>
              <p className="muted">{meta.intro}</p>
            </div>
          </div>
          <button className="ghost-button" onClick={onBack} type="button">
            Back to sign in
          </button>
        </div>

        {page === "pricing" ? (
          <div className="public-page-grid">
            {pricing?.plans.filter((plan) => !plan.customPlan).map((plan) => (
              <article className="public-page-card" key={plan.code}>
                <strong>{plan.label}</strong>
                <span className="muted">{plan.description}</span>
                <div className="subscription-feature-line">
                  <span>{plan.employeeLimit ?? "Custom"} employees</span>
                  <span>{plan.maxBranches} branch{plan.maxBranches > 1 ? "es" : ""}</span>
                </div>
                <div className="public-page-price-list">
                  {plan.billingOptions.map((option) => (
                    <div className="public-page-price-row" key={option.billingCycle}>
                      <span>{option.displayLabel}</span>
                      <strong>{formatMoney(option.amount)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {page === "features" ? (
          <div className="public-page-grid">
            {[
              "Selfie and GPS-backed attendance",
              "Leave and missed-punch workflow",
              "Owner-first attendance clarity",
              "Payroll visibility and advance tracking",
              "Branch control and policy settings",
              "Billing, renewals, and plan limits"
            ].map((item) => (
              <article className="public-page-card" key={item}>
                <strong>{item}</strong>
                <span className="muted">Designed for businesses that want simple workforce control without enterprise complexity.</span>
              </article>
            ))}
          </div>
        ) : null}

        {page === "contact" ? (
          <ContactRequestForm
            heading="Contact or demo request"
            intro="Send your business details and we will reach out for a demo or onboarding conversation."
            submitLabel="Request demo"
          />
        ) : null}

        {page === "privacy" ? (
          <div className="public-legal-stack">
            <article className="public-page-card">
              <strong>Information we collect</strong>
              <span className="muted">Peeplify may collect account details, employee records, attendance proof, leave records, payroll-related inputs, and support request information needed to operate the service.</span>
            </article>
            <article className="public-page-card">
              <strong>How data is used</strong>
              <span className="muted">We use this information to deliver attendance, payroll visibility, support, billing, product security, and service improvements for our customers.</span>
            </article>
            <article className="public-page-card">
              <strong>Data protection</strong>
              <span className="muted">Peeplify takes reasonable steps to protect account and workforce data, limit unauthorized access, and use third-party infrastructure only as needed to operate the platform.</span>
            </article>
          </div>
        ) : null}

        {page === "terms" ? (
          <div className="public-legal-stack">
            <article className="public-page-card">
              <strong>Service use</strong>
              <span className="muted">Customers are responsible for accurate business, employee, and billing details while using Peeplify for lawful workforce management purposes.</span>
            </article>
            <article className="public-page-card">
              <strong>Access and subscriptions</strong>
              <span className="muted">Workspace access depends on the active plan, employee limits, and billing status. Peeplify may restrict use after expiry or failed renewal.</span>
            </article>
            <article className="public-page-card">
              <strong>Customer responsibility</strong>
              <span className="muted">Customers are responsible for internal policy usage, employee communication, and compliance with local labour or payroll rules applicable to their business.</span>
            </article>
          </div>
        ) : null}

        {page === "refund" ? (
          <div className="public-legal-stack">
            <article className="public-page-card">
              <strong>Trial before payment</strong>
              <span className="muted">Peeplify offers a short free access period so customers can evaluate the platform before paying for a plan.</span>
            </article>
            <article className="public-page-card">
              <strong>Paid subscriptions</strong>
              <span className="muted">Subscription payments are generally treated as non-refundable once access has been provisioned, except where required by law or explicitly approved by Peeplify support.</span>
            </article>
            <article className="public-page-card">
              <strong>Billing issues</strong>
              <span className="muted">If you believe a payment was charged incorrectly, contact Peeplify support promptly with your order reference so the case can be reviewed.</span>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
