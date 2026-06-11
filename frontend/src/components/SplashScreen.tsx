import type { ReactNode } from "react";

type SplashScreenProps = {
  visible: boolean;
};

const splashFeatures: Array<{ label: string; accent: string; icon: ReactNode }> = [
  {
    label: "People Entry",
    accent: "green",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" strokeWidth="2" />
        <path d="M5 19a7 7 0 0 1 14 0" strokeLinecap="round" strokeWidth="2" />
        <path d="M18 10.5 20 12.5l3-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    )
  },
  {
    label: "Evidence",
    accent: "blue",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M9 11.5h6M9.5 8.5h5" strokeLinecap="round" strokeWidth="2" />
      </svg>
    )
  },
  {
    label: "Payroll",
    accent: "violet",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M11 10v7M8.5 12h5" strokeLinecap="round" strokeWidth="2" />
      </svg>
    )
  },
  {
    label: "Leave",
    accent: "orange",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="m10 15 1.5 1.5L15 13" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    )
  },
  {
    label: "Insights",
    accent: "teal",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M5 18V9M12 18V6M19 18v-4" strokeLinecap="round" strokeWidth="2" />
        <path d="m4 19 5-5 4 2 6-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    )
  }
];

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <div className={`splash-screen${visible ? " is-visible" : " is-hidden"}`} aria-hidden={!visible}>
      <div className="splash-screen__backdrop" />
      <div className="splash-screen__card">
        <div className="splash-screen__hero">
          <div className="splash-screen__monogram" aria-hidden="true">
            <span className="splash-screen__monogram-ring" />
            <span className="splash-screen__monogram-stem" />
            <span className="splash-screen__monogram-person splash-screen__monogram-person--center" />
            <span className="splash-screen__monogram-person splash-screen__monogram-person--left" />
            <span className="splash-screen__monogram-person splash-screen__monogram-person--right" />
          </div>
          <h1 className="splash-screen__wordmark">peeplify</h1>
          <div className="splash-screen__tagline">
            <span />
            <p>Workforce Management, Simplified</p>
            <span />
          </div>
        </div>

        <div className="splash-screen__features">
          {splashFeatures.map((feature) => (
            <div className="splash-screen__feature" key={feature.label}>
              <div className={`splash-screen__feature-icon splash-screen__feature-icon--${feature.accent}`}>
                {feature.icon}
              </div>
              <strong>{feature.label}</strong>
            </div>
          ))}
        </div>

        <div className="splash-screen__loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
