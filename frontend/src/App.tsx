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

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span className="required-mark">*</span>
    </>
  );
}

const demoAccounts = [
  { label: "Hotel One Admin", email: "admin@hotelone.test", password: "password" },
  { label: "Hotel One Employee", email: "ravi@hotelone.test", password: "password" },
  { label: "Hotel Two Admin", email: "admin@hoteltwo.test", password: "password" },
  { label: "Hotel Two Employee", email: "neha@hoteltwo.test", password: "password" }
];

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
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("");
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

      setRegistrationStatus(
        `${data.message} Admin login: ${data.adminEmail}. Starter employee accounts created: ${data.employeesCreated}. Employee password defaults to "password".`
      );
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
        <h1>Simple attendance tracking for teams that work across properties and branches.</h1>
        <p>
          ATTENDIFY helps you mark attendance quickly, keep staff records organized,
          and review check-ins with confidence from one easy dashboard.
        </p>
        <div className="feature-list">
          <div>
            <strong>Easy daily tracking</strong>
            <span>See who checked in, who checked out, and who still needs attention.</span>
          </div>
          <div>
            <strong>Clear staff records</strong>
            <span>Keep employee details, branch locations, and attendance history in one place.</span>
          </div>
          <div>
            <strong>Reliable proof</strong>
            <span>Use location and live selfie capture to make attendance more trustworthy.</span>
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
            <form onSubmit={handleLogin}>
              <label>
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@property.com"
                />
              </label>
              <label>
                Password
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="password"
                />
              </label>
              {error ? <p className="error-text">{error}</p> : null}
              {registrationStatus ? <p className="status-text">{registrationStatus}</p> : null}
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Access workspace"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Register your property</h2>
            <p className="muted">
              Set up your property, add your main branch, and create your first employee accounts in one go.
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
                          type="email"
                          required
                          placeholder="employee@property.com"
                        />
                      </label>
                      <label>
                        <RequiredLabel>Phone</RequiredLabel>
                        <input
                          value={employee.phone}
                          onChange={(event) => updateEmployee(index, "phone", event.target.value)}
                          required
                          placeholder="+91-98xxxxxxx"
                        />
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
          setStatus("Location locked.");
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
    setStatus("Selfie captured.");
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
    return <div className="center-message">Loading employee workspace...</div>;
  }

  const canCheckOut = overview.todayAttendance?.status === "CHECKED_IN";
  const hasCheckedIn = !!overview.todayAttendance;

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">Employee workspace</span>
          <h2>{overview.employee.name}</h2>
          <p className="muted">
            {overview.employee.designation} at {overview.branch.name} for {session.user.vendorName}
          </p>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="grid two-column">
        <article className="panel">
          <h3>Today's status</h3>
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
          <p className="muted">
            Branch target coordinate: {overview.branch.latitude.toFixed(5)},{" "}
            {overview.branch.longitude.toFixed(5)}
          </p>
        </article>

        <article className="panel">
          <h3>Verify before marking</h3>
          <div className="action-row">
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
            {selfie ? <img alt="Captured selfie" src={selfie} /> : null}
          </div>
          <p className="muted">
            Current GPS:{" "}
            {coords
              ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
              : "Not locked yet"}
          </p>
          {status ? <p className="status-text">{status}</p> : null}
          <div className="action-row">
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
        <AttendanceTable records={overview.recentAttendance} />
      </section>
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      const [dashboardData, employeeData, branchData, attendanceData] = await Promise.all([
        apiFetch<Dashboard>(session, "/admin/dashboard"),
        apiFetch<Employee[]>(session, "/admin/employees"),
        apiFetch<Branch[]>(session, "/admin/branches"),
        apiFetch<AttendanceRow[]>(session, "/admin/attendance")
      ]);

      setDashboard(dashboardData);
      setEmployees(employeeData);
      setBranches(branchData);
      setAttendance(attendanceData);
    }

    void loadAdminData();
  }, []);

  if (!dashboard) {
    return <div className="center-message">Loading admin dashboard...</div>;
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">Vendor admin dashboard</span>
          <h2>{session.user.name}</h2>
          <p className="muted">
            {session.user.vendorName} attendance operations with server-enforced tenant isolation
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
          <div className="branch-list">
            {dashboard.branchSnapshots.map((branch) => (
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
            ))}
          </div>
        </article>

        <article className="panel">
          <h3>Configured branches</h3>
          <div className="branch-list">
            {branches.map((branch) => (
              <div className="branch-item" key={branch.id}>
                <div>
                  <strong>{branch.name}</strong>
                  <span>{branch.address}</span>
                </div>
                <span className="pill">{branch.radiusMeters}m</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <h3>Employees</h3>
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
      </section>

      <section className="panel">
        <h3>Attendance evidence report</h3>
        <AttendanceTable records={attendance} onPreviewImage={setPreviewImage} />
      </section>
      {previewImage ? (
        <div className="image-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="ghost-button image-modal-close" onClick={() => setPreviewImage(null)}>
              Close
            </button>
            <img alt="Attendance evidence preview" src={previewImage} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AttendanceTable({
  records,
  onPreviewImage
}: {
  records: AttendanceRow[];
  onPreviewImage?: (image: string) => void;
}) {
  return (
    <table className="data-table">
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
            <td>
              <div className="evidence-stack evidence-thumbnail-stack">
                {record.checkInPhotoRef ? (
                  <button
                    className="evidence-thumb-button"
                    type="button"
                    onClick={() => onPreviewImage?.(record.checkInPhotoRef!)}
                  >
                    <img alt="Check-in evidence" src={record.checkInPhotoRef} />
                  </button>
                ) : (
                  <span className="muted">No check-in image</span>
                )}
                {record.checkOutPhotoRef ? (
                  <button
                    className="evidence-thumb-button"
                    type="button"
                    onClick={() => onPreviewImage?.(record.checkOutPhotoRef!)}
                  >
                    <img alt="Check-out evidence" src={record.checkOutPhotoRef} />
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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

export default App;
