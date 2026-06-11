import { useEffect, useState } from "react";
import { SplashScreen } from "./components/SplashScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { EmployeeScreen } from "./screens/EmployeeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import type { Session } from "./types";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState<Session | null>(() => {
    const cached = localStorage.getItem("attendance-session");
    return cached ? (JSON.parse(cached) as Session) : null;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2100);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem("attendance-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("attendance-session");
    }
  }, [session]);

  return (
    <div className="app-shell">
      <SplashScreen visible={showSplash} />
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

export default App;
