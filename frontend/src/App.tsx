import { useEffect, useRef, useState } from "react";

const API_BASE = "/api";

type Role = "SUPER_ADMIN" | "VENDOR_ADMIN" | "EMPLOYEE";

type SessionUser = {
  userId: string;
  vendorId: string;
  vendorName: string;
  employeeId: string | null;
  name: string;
  email: string;
  role: Role;
};

type Session = {
  token: string;
  user: SessionUser;
};

type LoginResponse = Session;

type EmployeeOverview = {
  employee: {
    id: string;
    branchId: string;
    employeeCode: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    designation: string;
  };
  branch: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  todayAttendance: AttendanceRow | null;
  recentAttendance: AttendanceRow[];
  tracking: {
    available: boolean;
    active: boolean;
    lastTrackedAt: string | null;
    pointsCapturedToday: number;
  };
};

type AttendanceRow = {
  recordId: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInDistanceMeters: number;
  checkOutDistanceMeters: number | null;
  checkInPhotoRef: string | null;
  checkOutPhotoRef: string | null;
};

type Dashboard = {
  cards: {
    totalEmployees: number;
    presentToday: number;
    checkedOutToday: number;
    absentToday: number;
  };
  branchSnapshots: Array<{
    branchId: string;
    branchName: string;
    headcount: number;
    present: number;
  }>;
  recentAttendance: AttendanceRow[];
};

type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  status: string;
  branchId: string;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

type AdminTracking = {
  enabled: boolean;
  date: string;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    branchName: string;
    attendanceStatus: string;
    checkInTime: string;
    checkOutTime: string | null;
    trackingActive: boolean;
    totalPings: number;
    points: Array<{
      capturedAt: string;
      latitude: number;
      longitude: number;
      accuracyMeters: number | null;
    }>;
  }>;
};

type ApiError = {
  error?: string;
};

type EmployeeSeedForm = {
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
};

type RegistrationSummary = {
  message: string;
  propertyName: string;
  adminEmail: string;
  employeesCreated: number;
};

type AttendancePreview = {
  image: string;
  label: string;
  time: string | null;
  employeeName: string;
};

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span className="required-mark">*</span>
    </>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const cached = localStorage.getItem("attendance-session");
    return cached ? (JSON.parse(cached) as Session) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem("attendance-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("attendance-session");
    }
  }, [session]);

  return (
    <div className="app-shell">
      <div className="background-orb background-orb-one" />
      <div className="background-orb background-orb-two" />
      {!session ? (
        <LoginScreen onLogin={setSession} />
      ) : session.user.role === "EMPLOYEE" ? (
        <EmployeeScreen session={session} onLogout={() => setSession(null)} />
      ) : (
        <AdminScreen session={session} onLogout={() => setSession(null)} />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [registrationSummary, setRegistrationSummary] = useState<RegistrationSummary | null>(null);
  const [propertyForm, setPropertyForm] = useState({
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
      <section className="hero-panel">
        <span className="eyebrow">ATTENDIFY</span>
        <h1>Attendance that feels simple from the first tap.</h1>
        <p>
          Track daily check-ins, keep staff records tidy, and review every shift from one calm workspace.
        </p>
        <div className="hero-stat-strip">
          <div>
            <strong>Fast check-ins</strong>
            <span>Location, selfie, done.</span>
          </div>
          <div>
            <strong>Clear records</strong>
            <span>Daily activity in one place.</span>
          </div>
        </div>
        <div className="feature-list simple-feature-list">
          <div>
            <strong>For teams with multiple branches</strong>
            <span>Useful for hotels, stores, clinics, and field teams.</span>
          </div>
          <div>
            <strong>Built for daily use</strong>
            <span>Employees can check in quickly without guessing the next step.</span>
          </div>
          <div>
            <strong>Easy to review later</strong>
            <span>Admins can see who is present, late, or still missing.</span>
          </div>
        </div>
      </section>

      <section className="login-card">
        <div className="action-row">
          <button
            className={registrationMode ? "ghost-button" : "primary-button"}
            type="button"
            onClick={() => setRegistrationMode(false)}
          >
            Sign in
          </button>
          <button
            className={registrationMode ? "primary-button" : "ghost-button"}
            type="button"
            onClick={() => setRegistrationMode(true)}
          >
            Register property
          </button>
        </div>
        {!registrationMode ? (
          <>
            <h2>Sign in</h2>
            <p className="muted section-intro">Use your work email to open your ATTENDIFY workspace.</p>
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
                <span className="field-hint">Enter the password linked to your ATTENDIFY account.</span>
              </label>
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
            <h2>Register your property</h2>
            <p className="muted">
              Set up your property, add your main branch, and create your first team in one clean flow.
            </p>
            <p className="muted">Fields marked <span className="required-mark">*</span> are required.</p>
            <form onSubmit={handleRegistration}>
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
                <span className="field-hint">Pick a password you will remember for your first ATTENDIFY admin account.</span>
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
                <span className="muted">You can edit the coordinates after using your current location.</span>
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
              <div className="employee-seed-list">
                <div className="action-row">
                  <strong>Starter employees</strong>
                  <button className="secondary-button" type="button" onClick={addEmployeeRow}>
                    Add employee
                  </button>
                </div>
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

function EmployeeScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [overview, setOverview] = useState<EmployeeOverview | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selfie, setSelfie] = useState<string>("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTutorialStep, setActiveTutorialStep] = useState(0);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [attendanceSummary, setAttendanceSummary] = useState<{
    mode: "check-in" | "check-out";
    branchName: string;
    time: string;
    distanceMeters: number;
    image: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function loadOverview() {
    const data = await apiFetch<EmployeeOverview>(session, "/employee/overview");
    setOverview(data);
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const tutorialKey = `attendify-tutorial-seen-${session.user.userId}`;
    const hasSeenTutorial = localStorage.getItem(tutorialKey);

    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem(tutorialKey, "true");
    }
  }, [session.user.userId]);

  useEffect(() => {
    if (!showTutorial) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveTutorialStep((current) => (current + 1) % 4);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [showTutorial]);

  useEffect(() => {
    if (
      !overview?.tracking.available ||
      !overview.tracking.active ||
      overview.todayAttendance?.status !== "CHECKED_IN"
    ) {
      return;
    }

    let cancelled = false;

    async function sendTrackingPing() {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });

        if (cancelled) {
          return;
        }

        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCoords(nextCoords);

        const response = await apiFetch<{ message: string; capturedAt: string }>(
          session,
          "/attendance/location-ping",
          {
            method: "POST",
            body: JSON.stringify({
              latitude: nextCoords.latitude,
              longitude: nextCoords.longitude,
              accuracyMeters: position.coords.accuracy
            })
          }
        );

        if (cancelled) {
          return;
        }

        setTrackingMessage(`${response.message} Last sync ${formatDateTime(response.capturedAt)}.`);
        await loadOverview();
      } catch (trackingError) {
        if (!cancelled) {
          setTrackingMessage(
            trackingError instanceof Error
              ? trackingError.message
              : "Tracking could not update your current location."
          );
        }
      }
    }

    void sendTrackingPing();
    const interval = window.setInterval(() => {
      void sendTrackingPing();
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [overview?.tracking.available, overview?.tracking.active, overview?.todayAttendance?.status, session]);

  async function requestLocation() {
    setStatus("Fetching your current location...");
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCoords(next);
          setStatus("Location locked. You are ready for the next step.");
          resolve(next);
        },
        () => reject(new Error("Location permission was denied.")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    setCameraReady(true);
    setStatus("Camera is ready. Capture a fresh selfie to continue.");
  }

  function captureSelfie() {
    if (!videoRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setSelfie(canvas.toDataURL("image/jpeg", 0.9));
    setStatus("Selfie captured. You can submit attendance now.");
  }

  async function submitAttendance(mode: "check-in" | "check-out") {
    if (!overview) {
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const location = coords ?? (await requestLocation());
      if (!selfie) {
        throw new Error("Capture a live selfie before submitting attendance.");
      }

      const data = await apiFetch<{ message: string; distanceMeters: number }>(
        session,
        `/attendance/${mode}`,
        {
          method: "POST",
          body: JSON.stringify({
            branchId: overview.branch.id,
            latitude: location.latitude,
            longitude: location.longitude,
            imageDataUrl: selfie
          })
        }
      );

      setStatus(`${data.message} Distance from branch: ${data.distanceMeters.toFixed(1)}m.`);
      setAttendanceSummary({
        mode,
        branchName: overview.branch.name,
        time: new Date().toISOString(),
        distanceMeters: data.distanceMeters,
        image: selfie
      });
      setSelfie("");
      await loadOverview();
    } catch (submitError) {
      setStatus(
        submitError instanceof Error ? submitError.message : "Unable to save attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!overview) {
    return <LoadingWorkspace title="Preparing your workspace" lines={4} />;
  }

  const canCheckOut = overview.todayAttendance?.status === "CHECKED_IN";
  const hasCheckedIn = !!overview.todayAttendance;
  const geofenceDistance =
    coords
      ? getDistanceMeters(
          coords.latitude,
          coords.longitude,
          overview.branch.latitude,
          overview.branch.longitude
        )
      : null;
  const insideGeofence =
    geofenceDistance !== null ? geofenceDistance <= overview.branch.radiusMeters : null;
  const completedThisMonth = overview.recentAttendance.filter((record) => {
    if (!record.checkOutTime) {
      return false;
    }

    const date = new Date(record.checkOutTime);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const lastActionTime =
    overview.todayAttendance?.checkOutTime ?? overview.todayAttendance?.checkInTime ?? null;
  const employeeSteps = [
    {
      title: "Allow location",
      detail: coords ? `Locked at ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "We use your live location to confirm you are at the branch.",
      complete: !!coords
    },
    {
      title: "Start camera",
      detail: cameraReady ? "Camera is ready for a fresh selfie." : "Turn on the front camera before capturing attendance proof.",
      complete: cameraReady
    },
    {
      title: "Capture selfie",
      detail: selfie ? "Selfie captured and ready to attach." : "Take a clear selfie before you check in or check out.",
      complete: !!selfie
    },
    {
      title: canCheckOut ? "Check out" : "Check in",
      detail: canCheckOut ? "Finish your day once your work is complete." : "Submit your attendance once location and selfie are ready.",
      complete: canCheckOut ? overview.todayAttendance?.status === "COMPLETED" : hasCheckedIn
    }
  ];
  const tutorialSteps = [
    {
      title: "Allow location",
      detail: "Tap the location button so ATTENDIFY can check that you are near your branch."
    },
    {
      title: "Start camera",
      detail: "Open the front camera and get ready for a quick selfie."
    },
    {
      title: "Capture selfie",
      detail: "Take a clear selfie so the check-in includes attendance proof."
    },
    {
      title: "Check in",
      detail: "Submit once everything is ready. You will see a confirmation right away."
    }
  ];

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">ATTENDIFY employee view</span>
          <h2>{overview.employee.name}</h2>
          <p className="muted">
            {overview.employee.designation} at {overview.branch.name} for {session.user.vendorName}
          </p>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <div className="action-row tutorial-toolbar">
        <button className="ghost-button tutorial-button" onClick={() => setShowTutorial(true)}>
          How to mark attendance
        </button>
      </div>

      <section className="metric-grid">
        <MetricCard label="Today's status" value={overview.todayAttendance?.status ?? "Not marked"} />
        <MetricCard label="Last activity" value={lastActionTime ? formatTimeOnly(lastActionTime) : "Pending"} />
        <MetricCard label="Completed this month" value={completedThisMonth} />
        <MetricCard label="Assigned branch" value={overview.branch.name} />
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Today's status</h3>
          <p className="muted section-intro">A quick view of your shift so far.</p>
          <div className="stat-row">
            <div>
              <span className="label">Attendance state</span>
              <strong>{overview.todayAttendance?.status ?? "NOT MARKED"}</strong>
            </div>
            <div>
              <span className="label">Geofence</span>
              <strong>{overview.branch.radiusMeters}m radius</strong>
            </div>
          </div>
          <div className="stat-row">
            <div>
              <span className="label">Check-in</span>
              <strong>{formatDateTime(overview.todayAttendance?.checkInTime)}</strong>
            </div>
            <div>
              <span className="label">Check-out</span>
              <strong>{formatDateTime(overview.todayAttendance?.checkOutTime)}</strong>
            </div>
          </div>
          <div className="stat-row">
            {overview.tracking.available ? (
              <>
                <div>
                  <span className="label">Tracking status</span>
                  <strong>{overview.tracking.active ? "Tracking live" : "Tracking off"}</strong>
                </div>
                <div>
                  <span className="label">Location updates today</span>
                  <strong>{overview.tracking.pointsCapturedToday}</strong>
                </div>
              </>
            ) : (
              <div>
                <span className="label">Tracking add-on</span>
                <strong>Not enabled</strong>
              </div>
            )}
          </div>
          <p className="muted">
            Branch target coordinate: {overview.branch.latitude.toFixed(5)},{" "}
            {overview.branch.longitude.toFixed(5)}
          </p>
          {overview.tracking.available && overview.tracking.lastTrackedAt ? (
            <p className="muted">Last tracked location: {formatDateTime(overview.tracking.lastTrackedAt)}</p>
          ) : null}
          {overview.tracking.available ? (
            trackingMessage ? <p className="muted">{trackingMessage}</p> : null
          ) : (
            <p className="muted">
              Live movement tracking is a separate add-on and is currently turned off for this workspace.
            </p>
          )}
          {attendanceSummary ? (
            <div className="info-card success-card">
              <strong>{attendanceSummary.mode === "check-in" ? "Check-in saved" : "Check-out saved"}</strong>
              <span>{attendanceSummary.branchName}</span>
              <span>{formatDateTime(attendanceSummary.time)}</span>
              <span>Distance from branch: {attendanceSummary.distanceMeters.toFixed(1)}m</span>
              <img alt="Latest attendance selfie" className="summary-image" src={attendanceSummary.image} />
            </div>
          ) : null}
        </article>

        <article className="panel">
          <h3>Mark attendance with confidence</h3>
          <p className="muted section-intro">Just follow the steps below. We will guide you through it.</p>
          <div className="step-list">
            {employeeSteps.map((step, index) => (
              <div className={`step-card${step.complete ? " complete" : ""}`} key={step.title}>
                <span className="step-index">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="action-row attendance-action-row">
            <button className="secondary-button" onClick={() => void requestLocation()}>
              Lock GPS
            </button>
            <button className="secondary-button" onClick={() => void startCamera()}>
              Start camera
            </button>
            <button className="secondary-button" onClick={captureSelfie}>
              Capture selfie
            </button>
          </div>
          <div className="camera-panel">
            <video autoPlay muted playsInline ref={videoRef} />
            {selfie ? <img alt="Captured selfie" src={selfie} /> : <div className="empty-media">Selfie preview will appear here.</div>}
          </div>
          <div className="status-card-row">
            <div className={`status-chip${insideGeofence === false ? " warning" : insideGeofence ? " success" : ""}`}>
              {insideGeofence === null
                ? "Lock your location to check branch distance."
                : insideGeofence
                  ? `Inside branch area by ${geofenceDistance?.toFixed(1)}m`
                  : `Outside branch area by ${geofenceDistance?.toFixed(1)}m`}
            </div>
            <div className="status-chip">
              Current GPS:{" "}
              {coords
                ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                : "Not locked yet"}
            </div>
          </div>
          {status ? <p className="status-text">{status}</p> : null}
          <div className="action-row attendance-action-row">
            <button
              className="primary-button"
              disabled={loading || hasCheckedIn}
              onClick={() => void submitAttendance("check-in")}
            >
              {loading ? "Saving..." : "Check in"}
            </button>
            <button
              className="ghost-button"
              disabled={loading || !canCheckOut}
              onClick={() => void submitAttendance("check-out")}
            >
              {loading ? "Saving..." : "Check out"}
            </button>
          </div>
        </article>
      </section>

      <section className="panel">
        <h3>Recent attendance</h3>
        <p className="muted section-intro">Your latest attendance activity appears here.</p>
        <AttendanceTable
          records={overview.recentAttendance}
          emptyMessage="No attendance has been marked yet. Your latest check-ins will appear here."
        />
      </section>
      {showTutorial ? (
        <div className="tutorial-backdrop" onClick={() => setShowTutorial(false)}>
          <div className="tutorial-modal" onClick={(event) => event.stopPropagation()}>
            <span className="eyebrow">How it works</span>
            <h3>Mark attendance in 4 simple steps</h3>
            <p className="muted">
              This short guide shows the usual flow your team should follow every day.
            </p>
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div
                  className={`tutorial-step${activeTutorialStep === index ? " active" : ""}`}
                  key={step.title}
                >
                  <span className="tutorial-step-number">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="tutorial-actions">
              <button className="ghost-button" onClick={() => setShowTutorial(false)}>
                Skip
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  setActiveTutorialStep((current) => (current + 1) % tutorialSteps.length)
                }
              >
                Next step
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AdminScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [tracking, setTracking] = useState<AdminTracking | null>(null);
  const [trackingDate, setTrackingDate] = useState(() => formatLocalDateKey(new Date()));
  const [previewImage, setPreviewImage] = useState<AttendancePreview | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      const [dashboardData, employeeData, branchData, attendanceData, trackingData] = await Promise.all([
        apiFetch<Dashboard>(session, "/admin/dashboard"),
        apiFetch<Employee[]>(session, "/admin/employees"),
        apiFetch<Branch[]>(session, "/admin/branches"),
        apiFetch<AttendanceRow[]>(session, "/admin/attendance"),
        apiFetch<AdminTracking>(session, `/admin/tracking?date=${trackingDate}`)
      ]);

      setDashboard(dashboardData);
      setEmployees(employeeData);
      setBranches(branchData);
      setAttendance(attendanceData);
      setTracking(trackingData);
    }

    void loadAdminData();
  }, [session, trackingDate]);

  if (!dashboard) {
    return <LoadingWorkspace title="Loading your dashboard" lines={5} />;
  }

  const todayKey = formatLocalDateKey(new Date());
  const todayAttendance = attendance.filter((record) => record.date === todayKey);
  const todayAttendanceIds = new Set(todayAttendance.map((record) => record.employeeId));
  const absentEmployees = employees.filter((employee) => !todayAttendanceIds.has(employee.id));
  const checkedInEmployees = todayAttendance.filter((record) => record.status === "CHECKED_IN");
  const checkedOutEmployees = todayAttendance.filter((record) => record.status === "COMPLETED");
  const lateArrivals = todayAttendance.filter((record) => isLateCheckIn(record.checkInTime));

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">ATTENDIFY admin view</span>
          <h2>{session.user.name}</h2>
          <p className="muted">
            Track today&apos;s attendance, review proof, and focus on what needs attention first.
          </p>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="metric-grid">
        <MetricCard label="Total employees" value={dashboard.cards.totalEmployees} />
        <MetricCard label="Present today" value={dashboard.cards.presentToday} />
        <MetricCard label="Checked out" value={dashboard.cards.checkedOutToday} />
        <MetricCard label="Absent today" value={dashboard.cards.absentToday} />
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Branch coverage</h3>
          <p className="muted section-intro">A simple branch-by-branch view of today&apos;s presence.</p>
          <div className="branch-list">
            {dashboard.branchSnapshots.length ? (
              dashboard.branchSnapshots.map((branch) => (
                <div className="branch-item" key={branch.branchId}>
                  <div>
                    <strong>{branch.branchName}</strong>
                    <span>
                      {branch.present} present / {branch.headcount} assigned
                    </span>
                  </div>
                  <span className="pill">
                    {Math.round((branch.present / Math.max(branch.headcount, 1)) * 100)}%
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No branch activity yet"
                message="Branch coverage will appear here after your first staff records and attendance entries are added."
              />
            )}
          </div>
        </article>

        <article className="panel">
          <h3>Configured branches</h3>
          <p className="muted section-intro">Your attendance zones and branch details.</p>
          <div className="branch-list">
            {branches.length ? (
              branches.map((branch) => (
                <div className="branch-item" key={branch.id}>
                  <div>
                    <strong>{branch.name}</strong>
                    <span>{branch.address}</span>
                  </div>
                  <span className="pill">{branch.radiusMeters}m</span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No branches yet"
                message="Add your first branch to start assigning employees and accepting attendance nearby."
              />
            )}
          </div>
        </article>
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Needs attention today</h3>
          <p className="muted section-intro">Start here to follow up with missing staff.</p>
          <ActionList
            items={absentEmployees.map((employee) => `${employee.name} · ${employee.designation}`)}
            emptyMessage="Everyone assigned today has already marked attendance."
          />
        </article>
        <article className="panel">
          <h3>Late arrivals</h3>
          <p className="muted section-intro">Quick reminders for check-ins that happened later than usual.</p>
          <ActionList
            items={lateArrivals.map(
              (record) => `${record.employeeName} · checked in at ${formatTimeOnly(record.checkInTime)}`
            )}
            emptyMessage="No late arrivals so far today."
          />
        </article>
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Currently checked in</h3>
          <p className="muted section-intro">People who are still marked as on shift.</p>
          <ActionList
            items={checkedInEmployees.map(
              (record) => `${record.employeeName} · ${record.branchName} · ${formatTimeOnly(record.checkInTime)}`
            )}
            emptyMessage="No one is currently marked as checked in."
          />
        </article>
        <article className="panel">
          <h3>Completed today</h3>
          <p className="muted section-intro">Finished shifts with their worked hours.</p>
          <ActionList
            items={checkedOutEmployees.map(
              (record) => `${record.employeeName} · ${formatWorkedHours(record.checkInTime, record.checkOutTime)}`
            )}
            emptyMessage="Completed shifts will appear here after check-out."
          />
        </article>
      </section>

      <section className="panel">
        <h3>Employees</h3>
        <p className="muted section-intro">A simple staff directory for this property.</p>
        {employees.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Designation</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.name}</td>
                  <td>{employee.employeeCode}</td>
                  <td>{employee.designation}</td>
                  <td>{employee.email}</td>
                  <td>{employee.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No employees added yet"
            message="Employee records will show up here after you add your first team members."
          />
        )}
      </section>

      <section className="panel">
        <h3>Attendance evidence report</h3>
        <p className="muted section-intro">Review check-in and check-out proof with timestamps.</p>
        <AttendanceTable
          records={attendance}
          onPreviewImage={setPreviewImage}
          emptyMessage="Attendance evidence will appear here once your staff start checking in and out."
        />
      </section>

      <section className="panel">
        <div className="topbar">
          <div>
            <h3>On-duty location tracking</h3>
            <p className="muted section-intro">
              View the places employees visited after check-in and before checkout.
            </p>
          </div>
          {tracking?.enabled ? (
            <label className="date-filter">
              Tracking date
              <input
                type="date"
                value={trackingDate}
                onChange={(event) => setTrackingDate(event.target.value)}
              />
            </label>
          ) : null}
        </div>
        {tracking?.enabled ? (
          tracking.employees.length ? (
            <div className="tracking-card-list">
              {tracking.employees.map((employeeRoute) => (
                <article className="tracking-card" key={employeeRoute.employeeId}>
                  <div className="tracking-card-header">
                    <div>
                      <strong>{employeeRoute.employeeName}</strong>
                      <span className="muted">
                        {employeeRoute.branchName} · {employeeRoute.attendanceStatus}
                      </span>
                    </div>
                    <span className="pill">{employeeRoute.totalPings} updates</span>
                  </div>
                  <div className="tracking-card-summary">
                    <span>Check-in: {formatDateTime(employeeRoute.checkInTime)}</span>
                    <span>
                      {employeeRoute.checkOutTime
                        ? `Check-out: ${formatDateTime(employeeRoute.checkOutTime)}`
                        : "Still on duty"}
                    </span>
                  </div>
                  <div className="tracking-point-list">
                    {employeeRoute.points.map((point, index) => (
                      <a
                        className="tracking-point"
                        href={buildMapsUrl(point.latitude, point.longitude)}
                        key={`${employeeRoute.employeeId}-${point.capturedAt}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="tracking-point-order">{index + 1}</span>
                        <div>
                          <strong>{formatDateTime(point.capturedAt)}</strong>
                          <span>
                            {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                          </span>
                          <span>
                            {point.accuracyMeters !== null
                              ? `Accuracy ${point.accuracyMeters.toFixed(0)}m`
                              : "Accuracy unavailable"}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tracked routes for this date"
              message="Location updates will appear here after employees check in and keep the portal open during their shift."
            />
          )
        ) : (
          <EmptyState
            title="Tracking add-on is off"
            message="This is a separate optional feature. Turn on TRACKING_FEATURE_ENABLED in the backend when you want to offer on-duty live movement tracking."
          />
        )}
      </section>
      {previewImage ? (
        <div className="image-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="ghost-button image-modal-close" onClick={() => setPreviewImage(null)}>
              Close
            </button>
            <strong>{previewImage.label}</strong>
            <span className="muted">{previewImage.employeeName}</span>
            <span className="muted">{formatDateTime(previewImage.time)}</span>
            <img alt="Attendance evidence preview" src={previewImage.image} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AttendanceTable({
  records,
  onPreviewImage,
  emptyMessage
}: {
  records: AttendanceRow[];
  onPreviewImage?: (preview: AttendancePreview) => void;
  emptyMessage?: string;
}) {
  if (!records.length) {
    return (
      <EmptyState
        title="Nothing to show yet"
        message={emptyMessage ?? "Attendance records will appear here once your team starts using ATTENDIFY."}
      />
    );
  }

  return (
    <>
      <table className="data-table desktop-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Hours worked</th>
            <th>Status</th>
            <th>Branch</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.recordId}>
              <td>{record.employeeName}</td>
              <td>{record.date}</td>
              <td>{formatDateTime(record.checkInTime)}</td>
              <td>{formatDateTime(record.checkOutTime)}</td>
              <td>{formatWorkedHours(record.checkInTime, record.checkOutTime)}</td>
              <td>{record.status}</td>
              <td>{record.branchName}</td>
              <td>{renderEvidence(record, onPreviewImage)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="attendance-card-list">
        {records.map((record) => (
          <article className="attendance-card" key={record.recordId}>
            <div className="attendance-card-header">
              <strong>{record.employeeName}</strong>
              <span className="pill">{record.status}</span>
            </div>
            <div className="attendance-card-grid">
              <span>Date</span>
              <strong>{record.date}</strong>
              <span>Branch</span>
              <strong>{record.branchName}</strong>
              <span>Check-in</span>
              <strong>{formatDateTime(record.checkInTime)}</strong>
              <span>Check-out</span>
              <strong>{formatDateTime(record.checkOutTime)}</strong>
              <span>Hours worked</span>
              <strong>{formatWorkedHours(record.checkInTime, record.checkOutTime)}</strong>
            </div>
            <div className="attendance-card-evidence">{renderEvidence(record, onPreviewImage)}</div>
          </article>
        ))}
      </div>
    </>
  );
}

function renderEvidence(
  record: AttendanceRow,
  onPreviewImage?: (preview: AttendancePreview) => void
) {
  return (
    <div className="evidence-stack evidence-thumbnail-stack">
      {record.checkInPhotoRef ? (
        <div className="evidence-item">
          <button
            className="evidence-thumb-button"
            type="button"
            onClick={() =>
              onPreviewImage?.({
                image: record.checkInPhotoRef!,
                label: "Check-in proof",
                time: record.checkInTime,
                employeeName: record.employeeName
              })
            }
          >
            <img alt="Check-in evidence" src={record.checkInPhotoRef} />
          </button>
          <span>Check-in · {formatTimeOnly(record.checkInTime)}</span>
        </div>
      ) : (
        <span className="muted">No check-in image</span>
      )}
      {record.checkOutPhotoRef ? (
        <div className="evidence-item">
          <button
            className="evidence-thumb-button"
            type="button"
            onClick={() =>
              onPreviewImage?.({
                image: record.checkOutPhotoRef!,
                label: "Check-out proof",
                time: record.checkOutTime,
                employeeName: record.employeeName
              })
            }
          >
            <img alt="Check-out evidence" src={record.checkOutPhotoRef} />
          </button>
          <span>Check-out · {formatTimeOnly(record.checkOutTime)}</span>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

function ActionList({ items, emptyMessage }: { items: string[]; emptyMessage: string }) {
  if (!items.length) {
    return <EmptyState title="All clear" message={emptyMessage} />;
  }

  return (
    <div className="action-list">
      {items.map((item) => (
        <div className="action-item" key={item}>
          {item}
        </div>
      ))}
    </div>
  );
}

function LoadingWorkspace({ title, lines }: { title: string; lines: number }) {
  return (
    <main className="workspace">
      <section className="panel">
        <span className="eyebrow">ATTENDIFY</span>
        <h2>{title}</h2>
        <div className="loading-stack">
          {Array.from({ length: lines }, (_, index) => (
            <div className="loading-skeleton" key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}

async function apiFetch<T>(session: Session, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return (await response.json()) as T;
}

async function extractError(response: Response) {
  try {
    const body = (await response.json()) as ApiError;
    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleString();
}

function formatTimeOnly(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function formatWorkedHours(checkInTime: string | null | undefined, checkOutTime: string | null | undefined) {
  if (!checkInTime || !checkOutTime) {
    return "In progress";
  }

  const checkIn = new Date(checkInTime).getTime();
  const checkOut = new Date(checkOutTime).getTime();
  const diffMs = checkOut - checkIn;

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return "Unavailable";
  }

  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function getDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(latitudeB - latitudeA);
  const lonDiff = toRadians(longitudeB - longitudeA);
  const startLat = toRadians(latitudeA);
  const endLat = toRadians(latitudeB);

  const haversine =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDiff / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isLateCheckIn(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return totalMinutes > 9 * 60 + 15;
}

export default App;
