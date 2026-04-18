"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    VANTA?: {
      FOG: (opts: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

export default function VantaFog() {
  const ref = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Load Three.js first, then Vanta
      if (!document.querySelector('script[src*="three.min.js"]')) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.head.appendChild(s);
        });
      }

      if (!document.querySelector('script[src*="vanta.fog.min.js"]')) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js";
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.head.appendChild(s);
        });
      }

      if (cancelled || !ref.current || !window.VANTA) return;

      vantaRef.current = window.VANTA.FOG({
        el: ref.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        highlightColor: 0x0c00c2ff,
        midtoneColor: 0x0096ff,
        lowlightColor: 0x00ff86,
        baseColor: 0x0f1825,
        blurFactor: 0.9,
        speed: 1.4,
        zoom: 0.3,
      });
    }

    init().catch(() => {
      // Silently fail if scripts don't load
    });

    return () => {
      cancelled = true;
      vantaRef.current?.destroy();
      vantaRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
