import splashImage from "../assets/peeplify-splash.png";

type SplashScreenProps = {
  visible: boolean;
};

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <div
      className={`splash-screen${visible ? " is-visible" : " is-hidden"}`}
      aria-hidden={!visible}
    >
      <div className="splash-screen__backdrop" />
      <div className="splash-screen__card">
        <img className="splash-screen__image" src={splashImage} alt="PEEPLIFY splash screen" />
      </div>
    </div>
  );
}
