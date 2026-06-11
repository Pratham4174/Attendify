import { useState } from "react";
import { API_BASE, extractError } from "../lib/api";
import type { EmployeeSeedForm, LoginResponse, RegistrationSummary, Session } from "../types";
import { BrandLogo, RequiredLabel } from "../components/shared";

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

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState("");
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: "",
    phone: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [registrationMode, setRegistrationMode] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [registrationSummary, setRegistrationSummary] = useState<RegistrationSummary | null>(null);
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>({
    propertyCode: "",
    propertyName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
    branchName: "",
    branchAddress: "",
    latitude: "12.975673",
    longitude: "77.606415",
    radiusMeters: "50"
  });
  const [employees, setEmployees] = useState<EmployeeSeedForm[]>([
    {
      employeeCode: "",
      name: "",
      email: "",
      phone: "",
      designation: ""
    }
  ]);

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
        throw new Error(await extractError(response));
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

  function updateEmployee(index: number, key: keyof EmployeeSeedForm, value: string) {
    setEmployees((current) =>
      current.map((employee, employeeIndex) =>
        employeeIndex === index ? { ...employee, [key]: value } : employee
      )
    );
  }

  function addEmployeeRow() {
    setEmployees((current) => [
      ...current,
      { employeeCode: "", name: "", email: "", phone: "", designation: "" }
    ]);
  }

  function removeEmployeeRow(index: number) {
    setEmployees((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  async function handleRegistration(event: React.FormEvent) {
    event.preventDefault();
    setRegistrationLoading(true);
    setRegistrationStatus("");
    setRegistrationSummary(null);

    try {
      const payload = {
        ...propertyForm,
        latitude: Number(propertyForm.latitude),
        longitude: Number(propertyForm.longitude),
        radiusMeters: Number(propertyForm.radiusMeters),
        employees: employees.filter(
          (employee) =>
            employee.employeeCode ||
            employee.name ||
            employee.email ||
            employee.phone ||
            employee.designation
        )
      };

      const response = await fetch(`${API_BASE}/public/property-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const data = (await response.json()) as {
        message: string;
        employeesCreated: number;
        adminEmail: string;
      };

      setRegistrationSummary({
        message: data.message,
        propertyName: propertyForm.propertyName,
        adminEmail: data.adminEmail,
        employeesCreated: data.employeesCreated
      });
      setRegistrationStatus("");
      setRegistrationMode(false);
      setEmail(propertyForm.adminEmail);
      setPassword(propertyForm.adminPassword);
    } catch (registrationError) {
      setRegistrationStatus(
        registrationError instanceof Error
          ? registrationError.message
          : "Unable to register property."
      );
    } finally {
      setRegistrationLoading(false);
    }
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
      setRegistrationStatus("Current location added. You can still edit the coordinates if needed.");
    } catch (locationError) {
      setRegistrationStatus(
        locationError instanceof Error
          ? locationError.message
          : "Unable to fetch current location."
      );
    }
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
            <strong>Check in</strong>
            <span>Fast mobile flow</span>
          </div>
          <div className="auth-feature-card">
            <strong>Proof</strong>
            <span>GPS and selfie</span>
          </div>
          <div className="auth-feature-card">
            <strong>Review</strong>
            <span>Clear owner view</span>
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
              Register property
            </button>
          </div>
        </div>
        {!registrationMode ? (
          <>
            {!forgotPasswordMode ? (
              <>
                <h2>Sign in</h2>
                <p className="muted section-intro auth-section-intro">Use your work email to open your PEEPLIFY workspace.</p>
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
              Set up your property, add your main branch, and create your first team in one clean flow.
            </p>
            <p className="muted auth-form-note">Fields marked <span className="required-mark">*</span> are required.</p>
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
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, propertyCode: event.target.value }))
                  }
                  required
                  placeholder="sunrise-hotel"
                />
                <span className="field-hint">Use a short code for your property. You can use letters, numbers, and hyphens.</span>
              </label>
              <label>
                <RequiredLabel>Property name</RequiredLabel>
                <input
                  value={propertyForm.propertyName}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, propertyName: event.target.value }))
                  }
                  required
                  placeholder="Sunrise Hotel"
                />
                <span className="field-hint">This is the business name your team will see across the workspace.</span>
              </label>
              <label>
                <RequiredLabel>Admin name</RequiredLabel>
                <input
                  value={propertyForm.adminName}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, adminName: event.target.value }))
                  }
                  required
                  placeholder="Owner / HR manager"
                />
                <span className="field-hint">Choose the person who will manage attendance, staff, and branch records.</span>
              </label>
              <label>
                <RequiredLabel>Admin email</RequiredLabel>
                <input
                  value={propertyForm.adminEmail}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, adminEmail: event.target.value }))
                  }
                  type="email"
                  required
                  placeholder="admin@sunrisehotel.com"
                />
                <span className="field-hint">This email will be used to sign in as the main property admin.</span>
              </label>
              <label>
                <RequiredLabel>Admin password</RequiredLabel>
                <input
                  value={propertyForm.adminPassword}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, adminPassword: event.target.value }))
                  }
                  type="password"
                  required
                  placeholder="Create a password"
                />
                <span className="field-hint">Pick a password you will remember for your first PEEPLIFY admin account.</span>
              </label>
              <label>
                <RequiredLabel>Admin phone</RequiredLabel>
                <input
                  value={propertyForm.adminPhone}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, adminPhone: event.target.value }))
                  }
                  required
                  placeholder="+91-98xxxxxxx"
                />
                <span className="field-hint">Used for quick contact if your team needs help with account setup.</span>
              </label>
              </div>

              <div className="auth-section">
                <div className="auth-section-title">
                  <strong>Main branch</strong>
                  <span className="muted">Add the place where your team will mark attendance first.</span>
                </div>
              <label>
                <RequiredLabel>Branch name</RequiredLabel>
                <input
                  value={propertyForm.branchName}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, branchName: event.target.value }))
                  }
                  required
                  placeholder="Main Property"
                />
                <span className="field-hint">Add the branch or site where staff will start marking attendance.</span>
              </label>
              <label>
                <RequiredLabel>Branch address</RequiredLabel>
                <input
                  value={propertyForm.branchAddress}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, branchAddress: event.target.value }))
                  }
                  required
                  placeholder="Full business address"
                />
                <span className="field-hint">Use the real address so your team can identify the correct workplace easily.</span>
              </label>
              <div className="grid two-column compact-grid">
                <label>
                  <RequiredLabel>Latitude</RequiredLabel>
                  <input
                    value={propertyForm.latitude}
                    onChange={(event) =>
                      setPropertyForm((current) => ({ ...current, latitude: event.target.value }))
                    }
                    required
                  />
                  <span className="field-hint">Use your current location or paste the branch pin value here.</span>
                </label>
                <label>
                  <RequiredLabel>Longitude</RequiredLabel>
                  <input
                    value={propertyForm.longitude}
                    onChange={(event) =>
                      setPropertyForm((current) => ({ ...current, longitude: event.target.value }))
                    }
                    required
                  />
                  <span className="field-hint">Keep this editable in case you want to fine-tune the attendance point.</span>
                </label>
              </div>
              <div className="action-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void useCurrentBranchLocation()}
                >
                  Use current location
                </button>
                <span className="muted auth-inline-note">You can edit the coordinates after using your current location.</span>
              </div>
              <label>
                <RequiredLabel>Attendance radius (meters)</RequiredLabel>
                <input
                  value={propertyForm.radiusMeters}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, radiusMeters: event.target.value }))
                  }
                  required
                />
                <span className="field-hint">A smaller radius works best when staff should mark attendance close to the property gate or desk.</span>
              </label>
              </div>

              <div className="auth-section">
                <div className="action-row auth-section-heading">
                  <div className="auth-section-title">
                    <strong>Starter employees</strong>
                    <span className="muted">Add your first team members now. You can add more later.</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={addEmployeeRow}>
                    Add employee
                  </button>
                </div>
              <div className="employee-seed-list">
                {employees.map((employee, index) => (
                  <div className="employee-seed-card" key={`${employee.email}-${index}`}>
                    <div className="grid two-column compact-grid">
                      <label>
                        <RequiredLabel>Employee code</RequiredLabel>
                        <input
                          value={employee.employeeCode}
                          onChange={(event) => updateEmployee(index, "employeeCode", event.target.value)}
                          required
                          placeholder="EMP-001"
                        />
                        <span className="field-hint">Add a short code your team already uses internally.</span>
                      </label>
                      <label>
                        <RequiredLabel>Name</RequiredLabel>
                        <input
                          value={employee.name}
                          onChange={(event) => updateEmployee(index, "name", event.target.value)}
                          required
                          placeholder="Employee name"
                        />
                        <span className="field-hint">Use the staff member&apos;s display name as they should appear in records.</span>
                      </label>
                    </div>
                    <div className="grid two-column compact-grid">
                      <label>
                        <RequiredLabel>Email</RequiredLabel>
                        <input
                          value={employee.email}
                          onChange={(event) => updateEmployee(index, "email", event.target.value)}
                          type="email"
                          required
                          placeholder="employee@property.com"
                        />
                        <span className="field-hint">Employees use this email to sign in and mark attendance.</span>
                      </label>
                      <label>
                        <RequiredLabel>Phone</RequiredLabel>
                        <input
                          value={employee.phone}
                          onChange={(event) => updateEmployee(index, "phone", event.target.value)}
                          required
                          placeholder="+91-98xxxxxxx"
                        />
                        <span className="field-hint">Helpful for staff contact and attendance follow-up.</span>
                      </label>
                    </div>
                    <label>
                      <RequiredLabel>Designation</RequiredLabel>
                      <input
                        value={employee.designation}
                        onChange={(event) => updateEmployee(index, "designation", event.target.value)}
                        required
                        placeholder="Front desk / Manager / Housekeeping"
                      />
                      <span className="field-hint">Mention the team role so attendance reports are easier to review later.</span>
                    </label>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => removeEmployeeRow(index)}
                    >
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
                {registrationLoading ? "Registering..." : "Register property"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
