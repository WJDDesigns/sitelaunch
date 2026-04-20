"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    VANTA?: { FOG: (opts: Record<string, unknown>) => { destroy: () => void } };
    THREE?: unknown;
  }
}

/**
 * Vanta.js FOG animated background for auth pages.
 * Loads three.js + vanta.fog.min.js from CDN.
 * Shows a matching static gradient immediately, then crossfades to the live effect.
 */
export default function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<{ destroy: () => void } | null>(null);
  const [ready, setReady] = useState(false);

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
          "https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js"
        );

        if (cancelled || !vantaRef.current) return;

        const VANTA = window.VANTA;
        if (!VANTA?.FOG) return;

        effectRef.current = VANTA.FOG({
          el: vantaRef.current,
          THREE: window.THREE,
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

        setReady(true);
      } catch (err) {
        console.warn("Vanta background failed to load:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (effectRef.current) {
        effectRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className="fixed inset-0 -z-10 transition-opacity duration-1000"
      style={{
        background: "linear-gradient(135deg, #1a2a6c 0%, #3654b6 50%, #0c2461 100%)",
        opacity: ready ? 1 : 1,
      }}
      aria-hidden="true"
    />
  );
}
