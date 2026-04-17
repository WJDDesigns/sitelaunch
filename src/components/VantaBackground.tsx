"use client";

import { useEffect, useRef } from "react";

/**
 * Vanta.js FOG animated background for auth pages.
 * Loads three.js r134 + vanta.fog.min.js from CDN.
 */
export default function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });

    (async () => {
      try {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js"
        );

        if (cancelled || !vantaRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const VANTA = (window as any).VANTA;
        if (!VANTA?.FOG) return;

        effectRef.current = VANTA.FOG({
          el: vantaRef.current,
          THREE: (window as any).THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          highlightColor: 0xc2ff,
          midtoneColor: 0x77ff,
          lowlightColor: 0xf0ff,
          baseColor: 0x3654b6,
          blurFactor: 0.67,
          speed: 2.1,
          zoom: 0.2,
        });
      } catch (err) {
        console.warn("Vanta background failed to load:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (
        effectRef.current &&
        typeof (effectRef.current as any).destroy === "function"
      ) {
        (effectRef.current as any).destroy();
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className="fixed inset-0 -z-10"
      aria-hidden="true"
    />
  );
}
