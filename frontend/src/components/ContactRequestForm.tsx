import { useState } from "react";
import { API_BASE, extractError } from "../lib/api";

type ContactFormState = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  employeeCount: string;
  message: string;
};

export function ContactRequestForm({
  heading,
  intro,
  submitLabel,
  initialValues
}: {
  heading: string;
  intro: string;
  submitLabel: string;
  initialValues?: Partial<ContactFormState>;
}) {
  const [form, setForm] = useState<ContactFormState>({
    contactName: initialValues?.contactName ?? "",
    contactEmail: initialValues?.contactEmail ?? "",
    contactPhone: initialValues?.contactPhone ?? "",
    companyName: initialValues?.companyName ?? "",
    employeeCount: initialValues?.employeeCount ?? "10",
    message: initialValues?.message ?? ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  function update(key: keyof ContactFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch(`${API_BASE}/public/sales-inquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
          companyName: form.companyName.trim(),
          employeeCount: Number(form.employeeCount || "1"),
          message: form.message.trim()
        })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const body = (await response.json()) as { message?: string; emailDelivered?: boolean };
      setStatus(
        body.message ??
          (body.emailDelivered === false
            ? "Your request was saved, but the email could not be delivered right now."
            : "Thanks. We will contact you shortly.")
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send your request right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-section">
      <div className="auth-section-title">
        <strong>{heading}</strong>
        <span className="muted">{intro}</span>
      </div>
      <form className="admin-form-grid" onSubmit={submitForm}>
        <div className="grid two-column compact-grid">
          <label>
            Name
            <input onChange={(event) => update("contactName", event.target.value)} required value={form.contactName} />
          </label>
          <label>
            Work email
            <input onChange={(event) => update("contactEmail", event.target.value)} required type="email" value={form.contactEmail} />
          </label>
        </div>
        <div className="grid three-column compact-grid">
          <label>
            Phone
            <input onChange={(event) => update("contactPhone", event.target.value)} required value={form.contactPhone} />
          </label>
          <label>
            Company
            <input onChange={(event) => update("companyName", event.target.value)} required value={form.companyName} />
          </label>
          <label>
            Employees
            <input min="1" onChange={(event) => update("employeeCount", event.target.value)} required type="number" value={form.employeeCount} />
          </label>
        </div>
        <label>
          Message
          <textarea
            onChange={(event) => update("message", event.target.value)}
            placeholder="Tell us whether you need a demo, onboarding help, rollout support, or pricing guidance."
            rows={4}
            value={form.message}
          />
        </label>
        <div className="action-row">
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Sending..." : submitLabel}
          </button>
        </div>
        {status ? (
          <p
            className={
              status.toLowerCase().includes("saved, but the email could not be delivered") ||
              status.toLowerCase().includes("saved, but email delivery is not configured")
                ? "error-text"
                : status.toLowerCase().includes("thanks") || status.toLowerCase().includes("successfully")
                  ? "status-text"
                  : "error-text"
            }
          >
            {status}
          </p>
        ) : null}
      </form>
    </section>
  );
}
