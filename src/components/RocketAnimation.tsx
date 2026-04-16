"use client";

import { useEffect, useRef } from "react";

/**
 * Animated rocket hovering with smoke billowing downward.
 * Uses CSS variables for theme-adaptive colors (works in both light & dark).
 * Rendered as a full-viewport background behind auth dialog boxes.
 */
export default function RocketAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let stars: Star[] = [];
    let time = 0;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      opacity: number;
      hue: number; // 0 = warm (orange/yellow), 1 = cool (white/blue)
    }

    interface Star {
      x: number;
      y: number;
      size: number;
      twinkleSpeed: number;
      twinkleOffset: number;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      generateStars();
    }

    function generateStars() {
      stars = [];
      const count = Math.floor((width * height) / 8000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 0.5,
          twinkleSpeed: Math.random() * 2 + 1,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    function isDark(): boolean {
      return document.documentElement.classList.contains("dark");
    }

    function getColors() {
      const dark = isDark();
      return {
        // Rocket body
        rocketPrimary: dark ? "rgba(192,193,255,0.95)" : "rgba(105,108,248,0.9)",
        rocketSecondary: dark ? "rgba(130,131,220,0.9)" : "rgba(80,82,200,0.9)",
        rocketDark: dark ? "rgba(60,62,120,0.95)" : "rgba(50,52,140,0.95)",
        rocketWindow: dark ? "rgba(60,221,199,0.8)" : "rgba(0,109,98,0.6)",
        rocketWindowGlow: dark ? "rgba(60,221,199,0.3)" : "rgba(0,109,98,0.2)",
        // Flame
        flameCore: dark ? "rgba(255,255,255,0.95)" : "rgba(255,255,240,0.95)",
        flameInner: dark ? "rgba(255,200,100,0.85)" : "rgba(255,180,60,0.85)",
        flameOuter: dark ? "rgba(255,120,60,0.6)" : "rgba(255,100,40,0.6)",
        // Smoke / exhaust
        smokeCore: dark ? "rgba(192,193,255,0.12)" : "rgba(105,108,248,0.08)",
        smokeEdge: dark ? "rgba(192,193,255,0.03)" : "rgba(105,108,248,0.02)",
        // Stars
        starColor: dark ? "rgba(192,193,255," : "rgba(105,108,248,",
        // Clouds
        cloudColor: dark ? "rgba(192,193,255," : "rgba(105,108,248,",
      };
    }

    // Rocket dimensions
    const ROCKET_W = 48;
    const ROCKET_H = 72;

    function getRocketCenter() {
      // Rocket hovers above center — positioned so dialog fits below
      const cx = width / 2;
      // Float above the vertical center with gentle bob
      const baseY = height * 0.32;
      const bob = Math.sin(time * 0.8) * 6 + Math.sin(time * 1.3) * 3;
      const sway = Math.sin(time * 0.5) * 2;
      return { x: cx + sway, y: baseY + bob };
    }

    function spawnSmoke(rocketX: number, rocketBottom: number) {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 16;
        particles.push({
          x: rocketX + spread,
          y: rocketBottom + Math.random() * 8,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 1.5 + Math.random() * 2.5,
          size: 8 + Math.random() * 14,
          life: 0,
          maxLife: 120 + Math.random() * 100,
          opacity: 0.4 + Math.random() * 0.3,
          hue: Math.random(),
        });
      }
    }

    function updateParticles() {
      particles = particles.filter((p) => {
        p.life++;
        if (p.life > p.maxLife) return false;

        p.x += p.vx;
        p.y += p.vy;
        // Slow down and spread horizontally as they fall
        p.vy *= 0.995;
        p.vx += (Math.random() - 0.5) * 0.15;
        p.vx *= 0.99;
        // Grow over time
        p.size += 0.3;

        return true;
      });
    }

    function drawStars(colors: ReturnType<typeof getColors>) {
      for (const star of stars) {
        const twinkle = 0.3 + 0.7 * ((Math.sin(time * star.twinkleSpeed + star.twinkleOffset) + 1) / 2);
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx!.fillStyle = `${colors.starColor}${(twinkle * 0.35).toFixed(2)})`;
        ctx!.fill();
      }
    }

    function drawRocket(cx: number, cy: number, colors: ReturnType<typeof getColors>) {
      const c = ctx!;
      c.save();
      c.translate(cx, cy);
      // Slight tilt with the sway
      const tilt = Math.sin(time * 0.5) * 0.03;
      c.rotate(tilt);

      const w2 = ROCKET_W / 2;
      const h2 = ROCKET_H / 2;

      // Glow behind the rocket
      const glow = c.createRadialGradient(0, 0, 10, 0, 0, 60);
      glow.addColorStop(0, colors.rocketWindowGlow);
      glow.addColorStop(1, "transparent");
      c.fillStyle = glow;
      c.fillRect(-60, -60, 120, 120);

      // Nose cone
      c.beginPath();
      c.moveTo(0, -h2 - 16);
      c.bezierCurveTo(w2 * 0.3, -h2 - 8, w2 * 0.7, -h2 + 4, w2, -h2 + 20);
      c.lineTo(w2, h2 - 8);
      c.lineTo(-w2, h2 - 8);
      c.lineTo(-w2, -h2 + 20);
      c.bezierCurveTo(-w2 * 0.7, -h2 + 4, -w2 * 0.3, -h2 - 8, 0, -h2 - 16);
      c.closePath();

      // Body gradient
      const bodyGrad = c.createLinearGradient(-w2, 0, w2, 0);
      bodyGrad.addColorStop(0, colors.rocketSecondary);
      bodyGrad.addColorStop(0.3, colors.rocketPrimary);
      bodyGrad.addColorStop(0.7, colors.rocketPrimary);
      bodyGrad.addColorStop(1, colors.rocketSecondary);
      c.fillStyle = bodyGrad;
      c.fill();

      // Subtle highlight
      c.beginPath();
      c.moveTo(0, -h2 - 16);
      c.bezierCurveTo(w2 * 0.15, -h2 - 8, w2 * 0.35, -h2 + 4, w2 * 0.5, -h2 + 20);
      c.lineTo(w2 * 0.5, h2 - 8);
      c.lineTo(w2 * 0.15, h2 - 8);
      c.lineTo(w2 * 0.15, -h2 + 20);
      c.bezierCurveTo(w2 * 0.1, -h2 + 4, w2 * 0.05, -h2 - 8, 0, -h2 - 16);
      c.closePath();
      c.fillStyle = isDark() ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)";
      c.fill();

      // Window
      const windowY = -h2 + 28;
      const windowR = 9;
      c.beginPath();
      c.arc(0, windowY, windowR + 3, 0, Math.PI * 2);
      c.fillStyle = colors.rocketDark;
      c.fill();
      c.beginPath();
      c.arc(0, windowY, windowR, 0, Math.PI * 2);
      const windowGrad = c.createRadialGradient(-3, windowY - 3, 1, 0, windowY, windowR);
      windowGrad.addColorStop(0, isDark() ? "rgba(150,255,240,0.9)" : "rgba(100,220,200,0.8)");
      windowGrad.addColorStop(1, colors.rocketWindow);
      c.fillStyle = windowGrad;
      c.fill();
      // Window highlight
      c.beginPath();
      c.arc(-3, windowY - 3, 3, 0, Math.PI * 2);
      c.fillStyle = "rgba(255,255,255,0.4)";
      c.fill();

      // Fins — left
      c.beginPath();
      c.moveTo(-w2, h2 - 20);
      c.lineTo(-w2 - 14, h2 + 8);
      c.quadraticCurveTo(-w2 - 8, h2 + 2, -w2, h2 - 8);
      c.closePath();
      c.fillStyle = colors.rocketDark;
      c.fill();

      // Fins — right
      c.beginPath();
      c.moveTo(w2, h2 - 20);
      c.lineTo(w2 + 14, h2 + 8);
      c.quadraticCurveTo(w2 + 8, h2 + 2, w2, h2 - 8);
      c.closePath();
      c.fillStyle = colors.rocketDark;
      c.fill();

      // Nozzle
      c.beginPath();
      c.moveTo(-w2 * 0.5, h2 - 8);
      c.lineTo(-w2 * 0.6, h2 + 4);
      c.lineTo(w2 * 0.6, h2 + 4);
      c.lineTo(w2 * 0.5, h2 - 8);
      c.closePath();
      c.fillStyle = colors.rocketDark;
      c.fill();

      // Flame
      const flameFlicker = Math.sin(time * 12) * 4 + Math.sin(time * 17) * 3;
      const flameH = 30 + flameFlicker;

      const flameGrad = c.createLinearGradient(0, h2 + 4, 0, h2 + 4 + flameH);
      flameGrad.addColorStop(0, colors.flameCore);
      flameGrad.addColorStop(0.3, colors.flameInner);
      flameGrad.addColorStop(0.7, colors.flameOuter);
      flameGrad.addColorStop(1, "transparent");

      c.beginPath();
      c.moveTo(-w2 * 0.45, h2 + 4);
      c.quadraticCurveTo(
        -w2 * 0.3 + Math.sin(time * 15) * 3,
        h2 + 4 + flameH * 0.5,
        Math.sin(time * 10) * 2,
        h2 + 4 + flameH
      );
      c.quadraticCurveTo(
        w2 * 0.3 + Math.sin(time * 13) * 3,
        h2 + 4 + flameH * 0.5,
        w2 * 0.45,
        h2 + 4
      );
      c.closePath();
      c.fillStyle = flameGrad;
      c.fill();

      // Inner flame (brighter core)
      const innerFlameH = flameH * 0.6;
      c.beginPath();
      c.moveTo(-w2 * 0.2, h2 + 4);
      c.quadraticCurveTo(
        -w2 * 0.1 + Math.sin(time * 18) * 2,
        h2 + 4 + innerFlameH * 0.5,
        Math.sin(time * 14) * 1.5,
        h2 + 4 + innerFlameH
      );
      c.quadraticCurveTo(
        w2 * 0.1 + Math.sin(time * 16) * 2,
        h2 + 4 + innerFlameH * 0.5,
        w2 * 0.2,
        h2 + 4
      );
      c.closePath();
      c.fillStyle = colors.flameCore;
      c.globalAlpha = 0.7;
      c.fill();
      c.globalAlpha = 1;

      c.restore();
    }

    function drawSmoke(colors: ReturnType<typeof getColors>) {
      for (const p of particles) {
        const progress = p.life / p.maxLife;
        // Fade in quickly then fade out
        const alpha = p.opacity * (progress < 0.1 ? progress / 0.1 : 1 - (progress - 0.1) / 0.9);
        if (alpha <= 0) continue;

        const c = ctx!;
        const grad = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, colors.smokeCore.replace(")", `)`.replace("0.", `${(alpha * 1.5).toFixed(2)}`.replace("0.", "0."))));

        // Simpler approach: use globalAlpha
        c.save();
        c.globalAlpha = alpha;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fillStyle = colors.smokeCore;
        c.fill();
        c.restore();
      }
    }

    function drawClouds(colors: ReturnType<typeof getColors>) {
      const c = ctx!;
      const cloudY = height * 0.82;

      // Draw layered clouds at the bottom
      for (let layer = 0; layer < 3; layer++) {
        const y = cloudY + layer * 25;
        const alpha = 0.06 + layer * 0.04;

        c.save();
        c.globalAlpha = 1;
        c.beginPath();

        // Bumpy cloud top using circles
        const numBumps = 12;
        const bumpW = width / numBumps;
        c.moveTo(0, height);
        c.lineTo(0, y + 20);

        for (let i = 0; i <= numBumps; i++) {
          const bx = i * bumpW;
          const bumpH = 15 + Math.sin(i * 1.5 + layer * 2 + time * 0.2) * 10;
          c.quadraticCurveTo(
            bx - bumpW * 0.5,
            y - bumpH,
            bx,
            y + Math.sin(i * 0.8 + time * 0.15) * 5
          );
        }

        c.lineTo(width, height);
        c.closePath();

        c.fillStyle = `${colors.cloudColor}${alpha.toFixed(2)})`;
        c.fill();
        c.restore();
      }
    }

    function animate() {
      time += 0.016; // ~60fps
      ctx!.clearRect(0, 0, width, height);

      const colors = getColors();
      const { x: rx, y: ry } = getRocketCenter();

      drawStars(colors);
      drawSmoke(colors);
      drawClouds(colors);
      drawRocket(rx, ry, colors);

      // Spawn smoke from rocket bottom
      const rocketBottom = ry + ROCKET_H / 2 + 30;
      spawnSmoke(rx, rocketBottom);

      updateParticles();

      animRef.current = requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener("resize", resize);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
