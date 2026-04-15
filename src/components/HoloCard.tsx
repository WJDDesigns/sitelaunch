"use client";

import { useRef, useState, useCallback, type ReactNode, type CSSProperties } from "react";

/**
 * HoloCard — holographic pricing card with mouse-tracking 3D tilt,
 * rainbow shimmer, and glare effect inspired by simeydotme/pokemon-cards-css.
 */

interface Props {
  children: ReactNode;
  className?: string;
  /** Glow color for the active state (CSS color string). */
  glowColor?: string;
  /** Intensity of the 3D rotation (lower = more tilt). Default 4. */
  tiltFactor?: number;
  /** Whether this card is the "featured" / highlighted card. */
  featured?: boolean;
}

interface PointerState {
  x: number; // 0–100 percentage
  y: number; // 0–100 percentage
  active: boolean;
}

function clamp(val: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, val));
}

export default function HoloCard({
  children,
  className = "",
  glowColor = "rgba(var(--color-primary), 0.4)",
  tiltFactor = 5,
  featured = false,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<PointerState>({ x: 50, y: 50, active: false });

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clamp(((e.clientX - rect.left) / rect.width) * 100);
      const y = clamp(((e.clientY - rect.top) / rect.height) * 100);
      setPointer({ x, y, active: true });
    },
    [],
  );

  const handleLeave = useCallback(() => {
    setPointer({ x: 50, y: 50, active: false });
  }, []);

  // Derive rotation & gradient positions from pointer
  const centerX = pointer.x - 50;
  const centerY = pointer.y - 50;
  const rotateX = -(centerX / tiltFactor); // horizontal mouse → Y-axis rotation
  const rotateY = centerY / tiltFactor;    // vertical mouse → X-axis rotation
  const distFromCenter = Math.sqrt(centerX * centerX + centerY * centerY) / 50;

  const cardStyle: CSSProperties = {
    "--pointer-x": `${pointer.x}%`,
    "--pointer-y": `${pointer.y}%`,
    "--rotate-x": `${pointer.active ? rotateX : 0}deg`,
    "--rotate-y": `${pointer.active ? rotateY : 0}deg`,
    "--pointer-from-center": clamp(distFromCenter, 0, 1),
    "--card-opacity": pointer.active ? 1 : 0,
    "--glow-color": glowColor,
  } as CSSProperties;

  return (
    <div
      ref={cardRef}
      className={`holo-card ${featured ? "holo-card--featured" : ""} ${pointer.active ? "holo-card--active" : ""} ${className}`}
      style={cardStyle}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className="holo-card__rotator">
        <div className="holo-card__content">{children}</div>
        <div className="holo-card__shine" />
        <div className="holo-card__glare" />
      </div>
    </div>
  );
}
