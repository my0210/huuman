"use client";

import type { ReactElement } from "react";

interface RenderShareCardOptions {
  element: ReactElement;
  width?: number;
  height?: number;
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (img.complete) return;
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }),
  );
}

export async function renderShareCardToBlob({
  element,
  width = 1080,
  height = 1350,
}: RenderShareCardOptions): Promise<Blob> {
  const [{ createRoot }, { toBlob }] = await Promise.all([
    import("react-dom/client"),
    import("html-to-image"),
  ]);

  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-10000px";
  mount.style.top = "0";
  mount.style.pointerEvents = "none";
  mount.style.zIndex = "-1";
  document.body.appendChild(mount);

  const root = createRoot(mount);
  try {
    root.render(element);
    await waitForPaint();

    if ("fonts" in document) {
      await document.fonts.ready;
    }

    const target = mount.firstElementChild as HTMLElement | null;
    if (!target) {
      throw new Error("Share card did not render");
    }

    await waitForImages(target);

    const blob = await toBlob(target, {
      cacheBust: true,
      canvasWidth: width,
      canvasHeight: height,
      pixelRatio: 1,
      skipFonts: false,
    });

    if (!blob) {
      throw new Error("Could not export share card");
    }

    return blob;
  } finally {
    root.unmount();
    mount.remove();
  }
}
