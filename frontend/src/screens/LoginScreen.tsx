import { useEffect, useState } from "react";
import { PropertyRegistrationFlow } from "../components/public/PropertyRegistrationFlow";
import { SubscriptionRenewalFlow } from "../components/public/SubscriptionRenewalFlow";
import { BrandLogo } from "../components/shared";
import { API_BASE, extractError } from "../lib/api";
import type { LoginResponse, RegistrationSummary, Session } from "../types";

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [renewalMode, setRenewalMode] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState("");
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: "",
    phone: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [registrationMode, setRegistrationMode] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [registrationSummary, setRegistrationSummary] = useState<RegistrationSummary | null>(null);
  const [renewalStatus, setRenewalStatus] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has("checkout_session_id")) {
      if (query.get("renew") === "1") {
        setRenewalMode(true);
      } else {
        setRegistrationMode(true);
      }
      setForgotPasswordMode(false);
    }
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const message = await extractError(response);
        if (response.status === 402) {
          setRenewalMode(true);
          setForgotPasswordMode(false);
          setRegistrationMode(false);
          setRenewalStatus(message);
        }
        throw new Error(message);
      }

      onLogin((await response.json()) as LoginResponse);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  function updateForgotPasswordForm(
    key: "email" | "phone" | "newPassword" | "confirmPassword",
    value: string
  ) {
    setForgotPasswordForm((current) => ({ ...current, [key]: value }));
  }

  async function handleForgotPassword(event: React.FormEvent) {
    event.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordStatus("");
    setError("");

    try {
      if (forgotPasswordForm.newPassword !== forgotPasswordForm.confirmPassword) {
        throw new Error("New password and confirm password must match.");
      }

      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotPasswordForm.email,
          phone: forgotPasswordForm.phone,
          newPassword: forgotPasswordForm.newPassword
        })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const data = (await response.json()) as { message: string };
      setForgotPasswordStatus(data.message);
      setEmail(forgotPasswordForm.email);
      setPassword("");
      setForgotPasswordForm({
        email: "",
        phone: "",
        newPassword: "",
        confirmPassword: ""
      });
      setForgotPasswordMode(false);
    } catch (forgotError) {
      setForgotPasswordStatus(
        forgotError instanceof Error ? forgotError.message : "Unable to reset password."
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  }

  function handleRegistrationComplete(summary: RegistrationSummary, adminPassword: string) {
    setRegistrationSummary(summary);
    setRegistrationStatus("");
    setRegistrationMode(false);
    setEmail(summary.adminEmail);
    setPassword(adminPassword);
  }

  return (
    <main className="login-layout">
      <section className="hero-panel auth-brand-panel">
        <div className="auth-brand-stack">
          <BrandLogo className="auth-brand-logo" />
          <p className="auth-brand-fullform">
            People Entry, Evidence, Payroll, Leave, Insights For You
          </p>
        </div>
        <div className="auth-feature-grid">
          <div className="auth-feature-card">
            <span className="auth-feature-icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </span>
            <strong>Check in</strong>
          </div>
          <div className="auth-feature-card">
            <span className="auth-feature-icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M9 11.5h6" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>
            <strong>Proof</strong>
          </div>
          <div className="auth-feature-card">
            <span className="auth-feature-icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M4 12h16M4 7h10M4 17h12" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>
            <strong>Review</strong>
          </div>
        </div>
      </section>

      <section className="login-card auth-panel">
        <div className="auth-panel-header">
          <span className="eyebrow">Workspace access</span>
          <div className="auth-toggle">
            <button
              className={registrationMode ? "auth-toggle-button" : "auth-toggle-button active"}
              type="button"
              onClick={() => {
                setRegistrationMode(false);
                setForgotPasswordMode(false);
              }}
            >
              Sign in
            </button>
            <button
              className={registrationMode ? "auth-toggle-button active" : "auth-toggle-button"}
              type="button"
              onClick={() => {
                setRegistrationMode(true);
                setForgotPasswordMode(false);
              }}
            >
              Register Property/Business
            </button>
          </div>
        </div>
        {!registrationMode ? (
          <>
            {!forgotPasswordMode ? (
              <>
                <h2>Sign in</h2>
                <p className="muted section-intro auth-section-intro">Use your work email to open your PEEPLIFY workspace.</p>
                {renewalMode ? (
                  <div className="info-card">
                    <strong>Workspace renewal needed</strong>
                    <span>{renewalStatus || "Your current plan has expired. Renew it below to continue using PEEPLIFY."}</span>
                  </div>
                ) : null}
                <form onSubmit={handleLogin}>
                  <label>
                    Email
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      placeholder="you@property.com"
                    />
                    <span className="field-hint">Use your admin or employee email to continue.</span>
                  </label>
                  <label>
                    Password
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      placeholder="password"
                    />
                    <span className="field-hint">Enter the password linked to your PEEPLIFY account.</span>
                  </label>
                  <div className="auth-inline-actions">
                    <button
                      className="auth-text-button"
                      onClick={() => {
                        setForgotPasswordMode(true);
                        setForgotPasswordStatus("");
                        setError("");
                        setForgotPasswordForm((current) => ({
                          ...current,
                          email: email || current.email
                        }));
                      }}
                      type="button"
                    >
                      Forgot password?
                    </button>
                  </div>
                  {error ? <p className="error-text">{error}</p> : null}
                  {registrationStatus ? <p className="status-text">{registrationStatus}</p> : null}
                  {registrationSummary ? (
                    <div className="info-card">
                      <strong>{registrationSummary.propertyName} is ready</strong>
                      <span>{registrationSummary.message}</span>
                      <span>Admin sign-in: {registrationSummary.adminEmail}</span>
                      <span>Starter employees added: {registrationSummary.employeesCreated}</span>
                      <span>Employee starter password: password</span>
                    </div>
                  ) : null}
                  <button className="primary-button" disabled={loading} type="submit">
                    {loading ? "Signing in..." : "Access workspace"}
                  </button>
                </form>
                {renewalMode ? (
                  <SubscriptionRenewalFlow
                    initialEmail={email}
                    onBack={() => {
                      setRenewalMode(false);
                      setRenewalStatus("");
                      setError("");
                    }}
                    onRenewed={(message) => {
                      setRenewalStatus(message);
                      setRenewalMode(false);
                      setError("");
                    }}
                  />
                ) : null}
              </>
            ) : (
              <>
                <h2>Reset employee password</h2>
                <p className="muted section-intro auth-section-intro">
                  Enter your employee email, registered phone number, and a new password.
                </p>
                <form onSubmit={handleForgotPassword}>
                  <label>
                    Employee email
                    <input
                      value={forgotPasswordForm.email}
                      onChange={(event) => updateForgotPasswordForm("email", event.target.value)}
                      type="email"
                      placeholder="employee@property.com"
                    />
                  </label>
                  <label>
                    Registered phone
                    <input
                      value={forgotPasswordForm.phone}
                      onChange={(event) => updateForgotPasswordForm("phone", event.target.value)}
                      placeholder="+91 98xxxxxxx"
                    />
                    <span className="field-hint">Use the same phone number saved in your employee profile.</span>
                  </label>
                  <label>
                    New password
                    <input
                      value={forgotPasswordForm.newPassword}
                      onChange={(event) => updateForgotPasswordForm("newPassword", event.target.value)}
                      type="password"
                      placeholder="Create a new password"
                    />
                  </label>
                  <label>
                    Confirm new password
                    <input
                      value={forgotPasswordForm.confirmPassword}
                      onChange={(event) => updateForgotPasswordForm("confirmPassword", event.target.value)}
                      type="password"
                      placeholder="Repeat the new password"
                    />
                  </label>
                  {forgotPasswordStatus ? (
                    <p className={forgotPasswordStatus.includes("successfully") ? "status-text" : "error-text"}>
                      {forgotPasswordStatus}
                    </p>
                  ) : null}
                  <div className="auth-inline-actions">
                    <button className="primary-button" disabled={forgotPasswordLoading} type="submit">
                      {forgotPasswordLoading ? "Updating..." : "Reset password"}
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setForgotPasswordMode(false);
                        setForgotPasswordStatus("");
                      }}
                      type="button"
                    >
                      Back to sign in
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        ) : (
          <>
            <h2>Register your property</h2>
            <p className="muted auth-section-intro">
              Choose a package, unlock your setup with a 3-day trial or payment, and then create your workspace.
            </p>
            <p className="muted auth-form-note">All plans include the full PEEPLIFY core feature set. The 50-employee plan also unlocks multiple branches.</p>
            {registrationStatus ? <p className="error-text">{registrationStatus}</p> : null}
            <PropertyRegistrationFlow onRegistrationComplete={handleRegistrationComplete} />
          </>
        )}
      </section>
    </main>
  );
}
