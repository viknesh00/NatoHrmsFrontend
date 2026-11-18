import type { Locator } from "@playwright/test";

export function colorToken(element: Locator, token: string) {
  return element.evaluate((node, name) => {
    const probe = node.ownerDocument.createElement("span");
    probe.hidden = true;
    probe.style.color = `var(${name})`;
    node.ownerDocument.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}
