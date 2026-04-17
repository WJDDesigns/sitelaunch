"use client";

import { useEffect, useRef } from "react";

/**
 * Vanta.js TRUNK animated background for auth pages.
 * Loads p5.js + vanta.trunk.min.js from CDN.
 */
export default function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<ReturnType<typeof Object> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        // Skip if already loaded
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
          "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.1.9/p5.min.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.trunk.min.js"
        );

        if (cancelled || !vantaRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const VANTA = (window as any).VANTA;
        if (!VANTA?.TRUNK) return;

        effectRef.current = VANTA.TRUNK({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0x83ff,
          backgroundColor: 0x0b1326,
          chaos: 6.5,
        });
      } catch (err) {
        console.warn("Vanta background failed to load:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (effectRef.current && typeof (effectRef.current as any).destroy === "function") {
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
