import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiRequestError } from "../lib/api";
import { buildAttendanceStatusRecords } from "../lib/attendanceStatus";
import {
  formatDateTime,
  formatMonthKey,
  formatTimeOnly,
  formatWorkedHours,
  getDistanceMeters
} from "../lib/format";
import { AttendanceTable } from "../components/AttendanceTable";
import { AttendanceCorrectionTable } from "../components/AttendanceCorrections";
import { DockIcon, FloatingTabDock } from "../components/FloatingTabDock";
import { HolidayList, LeaveRequestTable } from "../components/LeaveManagement";
import { BrandLogo, LoadingWorkspace, MetricCard, ProfileAvatar } from "../components/shared";
import type { AttendanceCorrection, EmployeeLeaveWorkspace, EmployeeOverview, Session } from "../types";

type EmployeeTab = "mark" | "today" | "history" | "corrections" | "leaves" | "help";

export function EmployeeScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const locationSampleTarget = 4;
  const [overview, setOverview] = useState<EmployeeOverview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [leaveWorkspace, setLeaveWorkspace] = useState<EmployeeLeaveWorkspace | null>(null);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationSampleCount, setLocationSampleCount] = useState(0);
  const [selfie, setSelfie] = useState<string>("");
  const [profileSelfie, setProfileSelfie] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTutorialStep, setActiveTutorialStep] = useState(0);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [activeTab, setActiveTab] = useState<EmployeeTab>("mark");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => formatMonthKey(new Date()));
  const [leaveStatus, setLeaveStatus] = useState("");
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState("");
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "PAID",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [correctionForm, setCorrectionForm] = useState({
    correctionType: "MISSED_CHECK_IN",
    attendanceDate: "",
    requestedTime: "",
    reason: ""
  });
  const [attendanceSummary, setAttendanceSummary] = useState<{
    mode: "check-in" | "check-out";
    branchName: string;
    time: string;
    distanceMeters: number;
    image: string;
  } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const historyMonthStart = `${historyMonth}-01`;
  const historyMonthEnd = `${historyMonth}-${new Date(Number(historyMonth.slice(0, 4)), Number(historyMonth.slice(5, 7)), 0).getDate().toString().padStart(2, "0")}`;

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }

  const monthlyHistoryRecords =
    overview && leaveWorkspace
      ? buildAttendanceStatusRecords({
          employees: [
            {
              id: overview.employee.id,
              name: overview.employee.name,
              branchId: overview.branch.id,
              branchName: overview.branch.name,
              monthlyLeaveAllowance: leaveWorkspace.balance.monthlyAllowance,
              createdAt: overview.employee.createdAt
            }
          ],
          attendance: overview.recentAttendance,
          leaveRequests: leaveWorkspace.requests,
          holidays: leaveWorkspace.holidays,
          fromDate: historyMonthStart,
          toDate: historyMonthEnd
        }).sort((first, second) => {
          if (second.date === first.date) {
            return 0;
          }
          return second.date < first.date ? -1 : 1;
        })
      : [];

  async function loadOverview() {
    try {
      setLoadError("");
      const [overviewData, leaveData, correctionData] = await Promise.all([
        apiFetch<EmployeeOverview>(session, "/employee/overview"),
        apiFetch<EmployeeLeaveWorkspace>(session, "/employee/leaves"),
        apiFetch<AttendanceCorrection[]>(session, "/employee/corrections")
      ]);
      setOverview(overviewData);
      setLeaveWorkspace(leaveData);
      setCorrections(correctionData);
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        onLogout();
        return;
      }

      setLoadError(error instanceof Error ? error.message : "Unable to load your workspace.");
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    if (!overview || overview.employee.profileImageRef || cameraReady) {
      return;
    }

    void startCamera().catch((error) => {
      setProfileStatus(error instanceof Error ? error.message : "Unable to open the camera.");
    });
  }, [overview, cameraReady]);

  useEffect(() => {
    if (!cameraReady || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      // The stream is already attached; some browsers may reject play() until the frame is ready.
    });
  }, [cameraReady, selfie]);

  useEffect(() => {
    const tutorialKey = `peeplify-tutorial-seen-${session.user.userId}`;
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

  function getGeofenceLimit(radiusMeters: number, accuracyMeters: number | null) {
    if (accuracyMeters === null || !Number.isFinite(accuracyMeters) || accuracyMeters <= 0) {
      return radiusMeters;
    }
    return radiusMeters + Math.min(accuracyMeters, 20);
  }

  function getAccuracyLabel(accuracyMeters: number | null) {
    if (accuracyMeters === null) {
      return "Waiting for live GPS accuracy";
    }
    if (accuracyMeters <= 15) {
      return `Strong GPS accuracy · ±${accuracyMeters.toFixed(0)}m`;
    }
    if (accuracyMeters <= 30) {
      return `Usable GPS accuracy · ±${accuracyMeters.toFixed(0)}m`;
    }
    return `Weak GPS accuracy · ±${accuracyMeters.toFixed(0)}m`;
  }

  async function captureLocationSample() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async function requestLocation() {
    if (!navigator.geolocation) {
      throw new Error("Location services are not available on this device.");
    }

    setStatus("Checking GPS accuracy and locking your branch location...");
    const samples: Array<{ latitude: number; longitude: number; accuracy: number }> = [];

    for (let index = 0; index < locationSampleTarget; index += 1) {
      try {
        const position = await captureLocationSample();
        samples.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setStatus(`Improving GPS lock... ${samples.length}/${locationSampleTarget} sample${samples.length > 1 ? "s" : ""} captured.`);
      } catch (error) {
        if (samples.length === 0) {
          throw new Error("Location permission was denied.");
        }
        break;
      }
    }

    if (!samples.length) {
      throw new Error("Unable to capture your live location right now.");
    }

    const rankedSamples = [...samples].sort((left, right) => left.accuracy - right.accuracy);
    const selectedSamples = rankedSamples.slice(0, Math.min(3, rankedSamples.length));
    const averagedLatitude = selectedSamples.reduce((total, sample) => total + sample.latitude, 0) / selectedSamples.length;
    const averagedLongitude = selectedSamples.reduce((total, sample) => total + sample.longitude, 0) / selectedSamples.length;
    const bestAccuracy = rankedSamples[0]?.accuracy ?? null;
    const next = {
      latitude: averagedLatitude,
      longitude: averagedLongitude
    };

    setCoords(next);
    setLocationAccuracy(bestAccuracy);
    setLocationSampleCount(samples.length);
    const nextDistance = overview
      ? getDistanceMeters(
          next.latitude,
          next.longitude,
          overview.branch.latitude,
          overview.branch.longitude
        )
      : null;
    const nextLimit = overview ? getGeofenceLimit(overview.branch.radiusMeters, bestAccuracy) : null;
    const isInsideBranch = nextDistance !== null && nextLimit !== null ? nextDistance <= nextLimit : false;
    setStatus(
      bestAccuracy !== null
        ? isInsideBranch
          ? `Inside branch area with ±${bestAccuracy.toFixed(0)}m accuracy. Opening camera now.`
          : `Location locked with ±${bestAccuracy.toFixed(0)}m accuracy. You are still outside the branch area.`
        : isInsideBranch
          ? "Inside branch area. Opening camera now."
          : "Location locked. You are still outside the branch area."
    );
    if (isInsideBranch) {
      await startCamera();
    }
    return next;
  }

  async function startCamera() {
    stopCameraStream();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {
        // Fallback handled by the cameraReady effect after render.
      });
    }
    setCameraReady(true);
    setStatus("Camera is ready. Capture a fresh selfie to continue.");
  }

  function captureImage(onCapture: (value: string) => void) {
    if (!videoRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    const sourceWidth = videoRef.current.videoWidth || 640;
    const sourceHeight = videoRef.current.videoHeight || 480;
    const targetWidth = Math.min(sourceWidth, 480);
    const scaleRatio = targetWidth / sourceWidth;
    const targetHeight = Math.max(Math.round(sourceHeight * scaleRatio), 360);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.72));
  }

  function captureSelfie() {
    captureImage((value) => {
      setSelfie(value);
      setStatus("Selfie captured. You can submit attendance now.");
    });
  }

  function retakeSelfie() {
    setSelfie("");
    setStatus("Camera is ready. Capture a fresh selfie to continue.");
  }

  function captureProfileSelfie() {
    captureImage((value) => {
      setProfileSelfie(value);
      setProfileStatus("Profile image captured. Save it to continue.");
    });
  }

  async function saveProfileImage() {
    if (!profileSelfie) {
      return;
    }

    setProfileSaving(true);
    setProfileStatus("");
    try {
      const updatedOverview = await apiFetch<EmployeeOverview>(session, "/employee/profile-image", {
        method: "POST",
        body: JSON.stringify({
          imageDataUrl: profileSelfie
        })
      });
      setOverview(updatedOverview);
      setProfileSelfie("");
      setProfileStatus("Profile image saved successfully.");
      stopCameraStream();
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : "Unable to save profile image.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function submitAttendance(mode: "check-in" | "check-out", imageOverride?: string) {
    if (!overview) {
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const location = coords ?? (await requestLocation());
      const attendanceImage = imageOverride ?? selfie;
      if (!attendanceImage) {
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
              accuracyMeters: locationAccuracy,
              imageDataUrl: attendanceImage
            })
          }
        );

      setStatus(`${data.message} Distance from branch: ${data.distanceMeters.toFixed(1)}m.`);
      setAttendanceSummary({
        mode,
        branchName: overview.branch.name,
        time: new Date().toISOString(),
        distanceMeters: data.distanceMeters,
        image: attendanceImage
      });
      stopCameraStream();
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

  function updateLeaveForm(key: "leaveType" | "startDate" | "endDate" | "reason", value: string) {
    setLeaveForm((current) => ({ ...current, [key]: value }));
  }

  async function submitLeaveRequest(event: React.FormEvent) {
    event.preventDefault();
    setLeaveSaving(true);
    setLeaveStatus("");
    try {
      await apiFetch(session, "/employee/leaves", {
        method: "POST",
        body: JSON.stringify(leaveForm)
      });
      setLeaveStatus("Leave request submitted successfully.");
      setLeaveForm({
        leaveType: "PAID",
        startDate: "",
        endDate: "",
        reason: ""
      });
      await loadOverview();
      setActiveTab("leaves");
    } catch (error) {
      setLeaveStatus(error instanceof Error ? error.message : "Unable to submit leave request.");
    } finally {
      setLeaveSaving(false);
    }
  }

  function updateCorrectionForm(
    key: "correctionType" | "attendanceDate" | "requestedTime" | "reason",
    value: string
  ) {
    setCorrectionForm((current) => ({ ...current, [key]: value }));
  }

  async function submitCorrectionRequest(event: React.FormEvent) {
    event.preventDefault();
    setCorrectionSaving(true);
    setCorrectionStatus("");
    try {
      await apiFetch(session, "/employee/corrections", {
        method: "POST",
        body: JSON.stringify(correctionForm)
      });
      setCorrectionStatus("Correction request submitted successfully.");
      setCorrectionForm({
        correctionType: "MISSED_CHECK_IN",
        attendanceDate: "",
        requestedTime: "",
        reason: ""
      });
      await loadOverview();
      setActiveTab("corrections");
    } catch (error) {
      setCorrectionStatus(error instanceof Error ? error.message : "Unable to submit correction request.");
    } finally {
      setCorrectionSaving(false);
    }
  }

  if (!overview) {
    if (loadError) {
      return (
        <main className="workspace">
          <section className="panel">
            <span className="eyebrow">PEEPLIFY</span>
            <h2>Unable to open your workspace</h2>
            <p className="error-text">{loadError}</p>
            <div className="action-row">
              <button className="primary-button" onClick={() => void loadOverview()}>
                Try again
              </button>
              <button className="ghost-button" onClick={onLogout}>
                Back to sign in
              </button>
            </div>
          </section>
        </main>
      );
    }

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
  const effectiveGeofenceLimit = getGeofenceLimit(overview.branch.radiusMeters, locationAccuracy);
  const insideGeofence =
    geofenceDistance !== null ? geofenceDistance <= effectiveGeofenceLimit : null;
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
  const employeeTabs: Array<{ id: EmployeeTab; label: string; compactLabel: string; icon: ReactNode }> = [
    {
      id: "mark",
      label: "Mark attendance",
      compactLabel: "Mark",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "today",
      label: "Today's status",
      compactLabel: "Today",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M12 7v5l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "history",
      label: "Attendance history",
      compactLabel: "History",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M8 6h10M8 12h10M8 18h10M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "corrections",
      label: "Corrections",
      compactLabel: "Fix",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="m4 20 4.5-1 9-9a2.12 2.12 0 1 0-3-3l-9 9L4 20Zm10-12 3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "leaves",
      label: "Leaves",
      compactLabel: "Leave",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M7 4v4M17 4v4M4 10h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    },
    {
      id: "help",
      label: "How it works",
      compactLabel: "Help",
      icon: <DockIcon><svg fill="none" viewBox="0 0 24 24"><path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></DockIcon>
    }
  ];
  const tutorialSteps = [
    {
      title: "Allow location",
      detail: "Tap the location button so PEEPLIFY can check that you are near your branch."
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
    <main className="workspace workspace-with-dock">
      <header className="topbar">
        <div className="workspace-brand-lockup">
          <BrandLogo className="brand-logo-compact" />
          <div>
            <span className="eyebrow">PEEPLIFY employee view</span>
            <h2>{overview.employee.name}</h2>
            <p className="muted">
              {overview.employee.designation} at {overview.branch.name} for {session.user.vendorName}
            </p>
          </div>
        </div>
        <div className="employee-header-actions">
          <button
            className="ghost-button employee-drawer-button"
            onClick={() => setDrawerOpen((current) => !current)}
            type="button"
          >
            Menu
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      {!overview.employee.profileImageRef ? (
        <div className="tutorial-backdrop profile-setup-backdrop">
          <section className="tutorial-modal profile-setup-modal">
            <div className="profile-setup-header">
              <ProfileAvatar image={profileSelfie || overview.employee.profileImageRef} name={overview.employee.name} />
              <div>
                <span className="eyebrow">Profile setup</span>
                <h3>Add your profile image</h3>
                <p className="muted">
                  Capture a live profile image before using your PEEPLIFY portal. The owner will see this in the employee directory.
                </p>
              </div>
            </div>

            <div className="camera-panel single-camera-panel profile-setup-camera">
              {profileSelfie ? (
                <img alt="Captured profile" src={profileSelfie} />
              ) : cameraReady ? (
                <video autoPlay muted playsInline ref={videoRef} />
              ) : (
                <div className="empty-media">Opening the front camera in this popup...</div>
              )}
            </div>

            <div className="prep-card-grid profile-setup-actions">
              <div className="prep-card">
                <button className="secondary-button prep-button" disabled={cameraReady && !profileSelfie} onClick={() => void startCamera()} type="button">
                  {cameraReady && !profileSelfie ? "Camera live" : "Restart camera"}
                </button>
                <span className="prep-value">Use the front camera and keep your face centered.</span>
              </div>
              <div className="prep-card">
                <button className="secondary-button prep-button" onClick={captureProfileSelfie} type="button">
                  Capture profile
                </button>
                <span className="prep-value">Take a clear image with proper lighting.</span>
              </div>
              <div className="prep-card">
                <button className="primary-button prep-button" disabled={profileSaving || !profileSelfie} onClick={() => void saveProfileImage()} type="button">
                  {profileSaving ? "Saving..." : "Save and continue"}
                </button>
                <span className="prep-value">This is required before you can use the employee portal.</span>
              </div>
            </div>

            {profileStatus ? (
              <p className={profileStatus.includes("successfully") ? "status-text" : "error-text"}>
                {profileStatus}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}

      {drawerOpen ? (
        <button
          aria-label="Close menu"
          className="workspace-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      ) : null}

      <div className="employee-shell">
        <aside className={`employee-sidebar${drawerOpen ? " open" : ""}`}>
          <div className="employee-sidebar-header">
            <span className="eyebrow">My workspace</span>
            <strong>{overview.branch.name}</strong>
            <span className="muted">{overview.branch.radiusMeters}m attendance zone</span>
          </div>
          <nav className="employee-nav">
            {employeeTabs.map((tab) => (
              <button
                key={tab.id}
                className={`employee-nav-button${activeTab === tab.id ? " active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setDrawerOpen(false);
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="employee-content">
          {activeTab === "mark" ? (
            <>
              <section className="metric-grid employee-metric-grid">
                <MetricCard label="Today's status" value={overview.todayAttendance?.status ?? "Not marked"} />
                <MetricCard label="Last activity" value={lastActionTime ? formatTimeOnly(lastActionTime) : "Pending"} />
                <MetricCard label="Completed this month" value={completedThisMonth} />
                <MetricCard label="Branch" value={overview.branch.name} />
              </section>

              <section className="panel mark-attendance-panel">
                <div className="mark-attendance-header">
                  <div>
                    <h3>Mark attendance</h3>
                  </div>
                  <button className="ghost-button tutorial-button" onClick={() => setShowTutorial(true)} type="button">
                    How it works
                  </button>
                </div>

                <div className="prep-card-grid">
                  <div className="prep-card">
                    <span
                      className={`gps-badge${
                        insideGeofence === true
                          ? " inside"
                          : insideGeofence === false
                            ? " outside"
                            : ""
                      }`}
                    >
                      {insideGeofence === null
                        ? "Check branch distance"
                        : insideGeofence
                          ? "Inside branch area"
                          : "Outside branch area"}
                    </span>
                    <button
                      className={`prep-button gps-lock-button${
                        insideGeofence === true
                          ? " inside"
                          : insideGeofence === false
                            ? " outside"
                            : ""
                      }`}
                      onClick={() => void requestLocation()}
                      type="button"
                    >
                      Lock GPS
                    </button>
                    <span className="prep-value">
                      {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "Current coordinates will appear here"}
                    </span>
                    <span className="prep-subvalue">
                      {coords
                        ? `${getAccuracyLabel(locationAccuracy)}${locationSampleCount ? ` · ${locationSampleCount} samples` : ""}`
                        : "We take a few readings to avoid random inside/outside results."}
                    </span>
                  </div>
                </div>

                <div className="camera-panel single-camera-panel">
                  {selfie ? (
                    <img alt="Captured selfie" src={selfie} />
                  ) : cameraReady ? (
                    <video autoPlay muted playsInline ref={videoRef} />
                  ) : (
                    <div className="empty-media">Lock GPS inside the branch area to open the live camera here.</div>
                  )}
                </div>

                <div className="status-card-row attendance-insight-row">
                  <div className={`status-chip highlight-chip${insideGeofence === false ? " warning" : insideGeofence ? " success" : ""}`}>
                    {insideGeofence === null
                      ? "Lock your location to check branch distance"
                      : insideGeofence
                        ? `Inside branch area · ${geofenceDistance?.toFixed(1)}m`
                        : `Outside branch area · ${geofenceDistance?.toFixed(1)}m`}
                  </div>
                  <div className="status-chip">
                    Allowed range · {effectiveGeofenceLimit.toFixed(1)}m including GPS tolerance
                  </div>
                </div>

                {status ? <p className="status-text">{status}</p> : null}

                <div className="submit-attendance-card">
                  <div>
                    <strong>{canCheckOut ? "Ready to check out?" : "Ready to check in?"}</strong>
                    <span className="muted">
                      {insideGeofence
                        ? canCheckOut
                          ? "Capture and save your check-out directly from here."
                          : "Capture and save your check-in directly from here."
                        : "Lock GPS inside the branch area to continue."}
                    </span>
                  </div>
                  <div className="action-row attendance-action-row">
                    <button
                      className="primary-button"
                      disabled={loading || insideGeofence !== true || !cameraReady || !!selfie}
                      onClick={captureSelfie}
                      type="button"
                    >
                      Capture selfie
                    </button>
                    <button
                      className="secondary-button"
                      disabled={loading || insideGeofence !== true || !selfie}
                      onClick={() => void submitAttendance(canCheckOut ? "check-out" : "check-in")}
                      type="button"
                    >
                      {loading ? "Saving..." : canCheckOut ? "Check out" : "Check in"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={loading || !selfie}
                      onClick={retakeSelfie}
                      type="button"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "today" ? (
            <section className="grid two-column">
              <article className="panel">
                <h3>Today's status</h3>
                <p className="muted section-intro">A compact view of your shift today.</p>
                <div className="stat-row">
                  <div>
                    <span className="label">Attendance</span>
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
                        <span className="label">Tracking</span>
                        <strong>{overview.tracking.active ? "Live" : "Off"}</strong>
                      </div>
                      <div>
                        <span className="label">Updates today</span>
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
                {overview.tracking.available && overview.tracking.lastTrackedAt ? (
                  <p className="muted">Last tracked location: {formatDateTime(overview.tracking.lastTrackedAt)}</p>
                ) : null}
                {overview.tracking.available ? trackingMessage ? <p className="muted">{trackingMessage}</p> : null : (
                  <p className="muted">Live movement tracking is an optional add-on for this workspace.</p>
                )}
              </article>

              <article className="panel">
                <h3>Latest confirmation</h3>
                <p className="muted section-intro">See the latest saved attendance proof and distance.</p>
                {attendanceSummary ? (
                  <div className="info-card success-card">
                    <strong>{attendanceSummary.mode === "check-in" ? "Check-in saved" : "Check-out saved"}</strong>
                    <span>{attendanceSummary.branchName}</span>
                    <span>{formatDateTime(attendanceSummary.time)}</span>
                    <span>Distance from branch: {attendanceSummary.distanceMeters.toFixed(1)}m</span>
                    <img alt="Latest attendance selfie" className="summary-image" src={attendanceSummary.image} />
                  </div>
                ) : (
                  <div className="info-card">
                    <strong>No new attendance saved in this session</strong>
                    <span className="muted">Your latest successful check-in or check-out will appear here.</span>
                  </div>
                )}
              </article>
            </section>
          ) : null}

          {activeTab === "history" ? (
            <section className="panel">
              <div className="topbar">
                <div>
                  <h3>Monthly attendance</h3>
                  <p className="muted section-intro">See every day in the selected month, including missed days, paid leave used, and holidays.</p>
                </div>
                <label className="date-filter">
                  Month
                  <input type="month" value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)} />
                </label>
              </div>
              <AttendanceTable
                records={monthlyHistoryRecords}
                emptyMessage="No attendance activity appears for this month yet."
              />
            </section>
          ) : null}

          {activeTab === "help" ? (
            <section className="panel">
              <div className="mark-attendance-header">
                <div>
                  <h3>How attendance works</h3>
                  <p className="muted section-intro">Reopen the guided animation or review the daily flow below.</p>
                </div>
                <button className="primary-button" onClick={() => setShowTutorial(true)} type="button">
                  Play walkthrough
                </button>
              </div>
              <div className="tutorial-steps employee-help-steps">
                {tutorialSteps.map((step, index) => (
                  <div className="tutorial-step" key={step.title}>
                    <span className="tutorial-step-number">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <span>{step.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "leaves" ? (
            <>
              <section className="grid two-column">
                <article className="panel">
                  <h3>Apply for leave</h3>
                  <p className="muted section-intro">Choose paid or unpaid leave, select your dates, and send it for approval.</p>
                  <form className="leave-form-grid" onSubmit={submitLeaveRequest}>
                    <div className="grid two-column compact-grid">
                      <label>
                        Leave type
                        <select value={leaveForm.leaveType} onChange={(event) => updateLeaveForm("leaveType", event.target.value)}>
                          <option value="PAID">Paid leave</option>
                          <option value="UNPAID">Unpaid leave</option>
                        </select>
                      </label>
                      <label>
                        Start date
                        <input required type="date" value={leaveForm.startDate} onChange={(event) => updateLeaveForm("startDate", event.target.value)} />
                      </label>
                    </div>
                    <div className="grid two-column compact-grid">
                      <label>
                        End date
                        <input required type="date" value={leaveForm.endDate} onChange={(event) => updateLeaveForm("endDate", event.target.value)} />
                      </label>
                      <label>
                        Reason
                        <input required value={leaveForm.reason} onChange={(event) => updateLeaveForm("reason", event.target.value)} placeholder="Medical, personal work, travel..." />
                      </label>
                    </div>
                    <div className="action-row">
                      <button className="primary-button" disabled={leaveSaving} type="submit">
                        {leaveSaving ? "Sending..." : "Apply leave"}
                      </button>
                    </div>
                    {leaveStatus ? (
                      <p className={leaveStatus.includes("successfully") ? "status-text" : "error-text"}>{leaveStatus}</p>
                    ) : null}
                  </form>
                </article>

                <article className="panel">
                  <h3>Leave balance</h3>
                  <p className="muted section-intro">Your monthly paid leave allowance updates here after approvals.</p>
                  {leaveWorkspace ? (
                    <div className="leave-balance-grid">
                      <MetricCard label="Allowed / month" value={leaveWorkspace.balance.monthlyAllowance} />
                      <MetricCard label="Approved paid leaves" value={leaveWorkspace.balance.approvedPaidLeaves} />
                      <MetricCard label="Auto-used paid leaves" value={leaveWorkspace.balance.autoAppliedPaidLeaves} />
                      <MetricCard label="Total paid leaves used" value={leaveWorkspace.balance.usedPaidLeaves} />
                      <MetricCard label="Remaining paid leaves" value={leaveWorkspace.balance.remainingPaidLeaves} />
                    </div>
                  ) : null}
                </article>
              </section>

              <section className="panel">
                <h3>My leave requests</h3>
                <p className="muted section-intro">Track whether your requests are pending, approved, or rejected.</p>
                <LeaveRequestTable
                  requests={leaveWorkspace?.requests ?? []}
                  emptyTitle="No leave requests yet"
                  emptyMessage="Your leave requests will appear here after you submit one."
                />
              </section>

              <section className="panel">
                <h3>Holiday calendar</h3>
                <p className="muted section-intro">See the dates your property has marked as holidays.</p>
                <HolidayList holidays={leaveWorkspace?.holidays ?? []} />
              </section>
            </>
          ) : null}

          {activeTab === "corrections" ? (
            <>
              <section className="grid two-column">
                <article className="panel">
                  <h3>Request correction</h3>
                  <p className="muted section-intro">Use this if you missed a check-in or check-out and need owner approval.</p>
                  <form className="leave-form-grid" onSubmit={submitCorrectionRequest}>
                    <div className="grid two-column compact-grid">
                      <label>
                        Correction type
                        <select value={correctionForm.correctionType} onChange={(event) => updateCorrectionForm("correctionType", event.target.value)}>
                          <option value="MISSED_CHECK_IN">Missed check-in</option>
                          <option value="MISSED_CHECK_OUT">Missed check-out</option>
                        </select>
                      </label>
                      <label>
                        Attendance date
                        <input required type="date" value={correctionForm.attendanceDate} onChange={(event) => updateCorrectionForm("attendanceDate", event.target.value)} />
                      </label>
                    </div>
                    <div className="grid two-column compact-grid">
                      <label>
                        Time you meant to mark
                        <input required type="time" value={correctionForm.requestedTime} onChange={(event) => updateCorrectionForm("requestedTime", event.target.value)} />
                      </label>
                      <label>
                        Reason
                        <input required value={correctionForm.reason} onChange={(event) => updateCorrectionForm("reason", event.target.value)} placeholder="Network issue, app closed, forgot to check out..." />
                      </label>
                    </div>
                    <div className="action-row">
                      <button className="primary-button" disabled={correctionSaving} type="submit">
                        {correctionSaving ? "Sending..." : "Request correction"}
                      </button>
                    </div>
                    {correctionStatus ? (
                      <p className={correctionStatus.includes("successfully") ? "status-text" : "error-text"}>{correctionStatus}</p>
                    ) : null}
                  </form>
                </article>

                <article className="panel">
                  <h3>How review works</h3>
                  <p className="muted section-intro">Owners can approve or reject with a note, and every action stays in the audit trail.</p>
                  <div className="info-card">
                    <strong>Audit trail included</strong>
                    <span className="muted">Every request, approval, rejection, and applied change is stored with time and actor details.</span>
                  </div>
                </article>
              </section>

              <section className="panel">
                <h3>My correction requests</h3>
                <p className="muted section-intro">Track pending requests and review the full change history.</p>
                <AttendanceCorrectionTable
                  corrections={corrections}
                  emptyTitle="No correction requests yet"
                  emptyMessage="Your correction requests will appear here after you submit one."
                />
              </section>
            </>
          ) : null}
        </section>
      </div>

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
              <button className="ghost-button" onClick={() => setShowTutorial(false)} type="button">
                Skip
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  setActiveTutorialStep((current) => (current + 1) % tutorialSteps.length)
                }
                type="button"
              >
                Next step
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FloatingTabDock
        activeTab={activeTab}
        ariaLabel="Employee workspace tabs"
        items={employeeTabs}
        onSelect={(tab) => {
          setActiveTab(tab);
          setDrawerOpen(false);
        }}
      />
    </main>
  );
}
