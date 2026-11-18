import { GrainGradient } from "@paper-design/shaders-react";
import { useEffect, useState, type ReactNode } from "react";
import "./auth-section-1.css";

type AuthSectionOneProps = {
  children: ReactNode;
  headline: string;
  description: string;
};

function AuthGrainGradient() {
  const [colors, setColors] = useState<string[] | null>(null);

  useEffect(() => {
    if (typeof WebGL2RenderingContext === "undefined") return;

    const media = window.matchMedia("(min-width: 900px)");
    const root = getComputedStyle(document.documentElement);
    const primary = root.getPropertyValue("--role-primary").trim();
    const accent = root.getPropertyValue("--role-dark-accent").trim();
    const update = () => {
      if (!media.matches || !primary || !accent) {
        setColors(null);
        return;
      }

      try {
        const context = document.createElement("canvas").getContext("webgl2");
        if (context && !context.isContextLost()) {
          context.getExtension("WEBGL_lose_context")?.loseContext();
          setColors([accent, primary, primary, accent]);
        }
      } catch {
        // Keep the CSS gradient if WebGL is unavailable.
      }
    };

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!colors) return null;

  return (
    <GrainGradient
      className="auth-section-one-shader"
      colors={colors}
      colorBack="#00000000"
      shape="corners"
      frame={2854.5}
      speed={0}
      minPixelRatio={1}
      maxPixelCount={500_000}
      scale={1.15}
      rotation={0}
      offsetX={0}
      offsetY={0}
      softness={0.65}
      intensity={0.48}
      noise={0.24}
    />
  );
}

export default function AuthSectionOne({ children, headline, description }: AuthSectionOneProps) {
  return (
    <main className="auth-section-one">
      <div className="auth-section-one-content">{children}</div>
      <div className="auth-section-one-visual">
        <div className="auth-section-one-art" aria-hidden="true">
          <AuthGrainGradient />
        </div>
        <div className="auth-section-one-copy">
          <h2>{headline}</h2>
          <p>{description}</p>
        </div>
      </div>
    </main>
  );
}
