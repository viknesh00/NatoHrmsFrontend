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
    const root = document.documentElement;
    let supportsWebGL: boolean | undefined;
    const update = () => {
      if (!media.matches) {
        setColors(null);
        return;
      }

      if (supportsWebGL === undefined) {
        try {
          const context = document.createElement("canvas").getContext("webgl2");
          supportsWebGL = Boolean(context && !context.isContextLost());
          context?.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
          supportsWebGL = false;
        }
      }
      if (!supportsWebGL) return;

      const styles = getComputedStyle(root);
      const primary = styles.getPropertyValue("--role-primary").trim() || styles.getPropertyValue("--primary").trim();
      const light = styles.getPropertyValue("--role-accent").trim() || styles.getPropertyValue("--accent").trim();
      if (primary && light) setColors([light, primary, primary, light]);
    };

    update();
    media.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-role"] });
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
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
