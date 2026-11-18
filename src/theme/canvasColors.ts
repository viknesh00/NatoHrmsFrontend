import { useLayoutEffect, useState } from "react";

type ColorTokens = Record<string, string>;

/** Read CSS colors as hex so canvas libraries can use color-mix and light-dark tokens. */
export function readCanvasColors<T extends ColorTokens>(fallbacks: T): T {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallbacks;

  const probe = document.createElement("span");
  probe.hidden = true;
  document.body.append(probe);
  const colors = { ...fallbacks };

  try {
    for (const token in colors) {
      probe.style.color = `var(${token}, ${fallbacks[token]})`;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = fallbacks[token];
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      const rgb = context.getImageData(0, 0, 1, 1).data;
      Object.assign(colors, { [token]: `#${Array.from(rgb.subarray(0, 3), channel => channel.toString(16).padStart(2, "0")).join("")}` });
    }
  } finally {
    probe.remove();
  }

  return colors;
}

export function useCanvasColors<T extends ColorTokens>(tokens: T) {
  const [colors, setColors] = useState(tokens);

  useLayoutEffect(() => {
    const refresh = () => setColors(readCanvasColors(tokens));
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-role"],
    });
    refresh();
    return () => observer.disconnect();
  }, [tokens]);

  return colors;
}
