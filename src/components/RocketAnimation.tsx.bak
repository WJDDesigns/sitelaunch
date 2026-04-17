"use client";

import { useEffect, useRef } from "react";

/**
 * Animated rocket (logo-style) hovering with stylised smoke puffs.
 * Smoke is rendered as soft, round, flat-colour circles that drift
 * and scale — similar to a Lottie / motion-graphic aesthetic rather
 * than realistic particle simulation.
 */
export default function RocketAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let t = 0;

    /* ── smoke puffs (stylised, flat) ──────────────── */
    interface Puff {
      x: number; y: number;
      vx: number; vy: number;
      r: number; targetR: number;
      life: number; max: number;
      opacity: number;
      delay: number; // frames before visible
    }
    let puffs: Puff[] = [];

    /* ── 4-point diamond stars ─────────────────────── */
    interface Star {
      x: number; y: number;
      size: number; speed: number; phase: number;
      kind: "dot" | "diamond";
    }
    let stars: Star[] = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    }

    function initStars() {
      stars = [];
      const n = Math.floor((W * H) / 14000);
      for (let i = 0; i < n; i++) {
        const isDiamond = Math.random() < 0.15;
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: isDiamond ? Math.random() * 3.5 + 1.5 : Math.random() * 1.2 + 0.3,
          speed: Math.random() * 1.8 + 0.6,
          phase: Math.random() * Math.PI * 2,
          kind: isDiamond ? "diamond" : "dot",
        });
      }
    }

    function dark() {
      return document.documentElement.classList.contains("dark");
    }

    function col() {
      const d = dark();
      return {
        body1: d ? "#c0c1ff" : "#696cf8",
        body2: d ? "#8b8ddb" : "#4e50c7",
        bodyDark: d ? "#3e4080" : "#2d2f8e",
        bodyHL: d ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.3)",
        win: d ? "#3cddc7" : "#006d62",
        winGlow: d ? "rgba(60,221,199,0.20)" : "rgba(0,109,98,0.12)",
        winBright: d ? "rgba(180,255,245,0.9)" : "rgba(140,240,220,0.85)",
        fCore: "rgba(255,255,255,0.95)",
        fInner: d ? "rgba(255,210,120,0.9)" : "rgba(255,190,70,0.9)",
        fOuter: d ? "rgba(255,130,70,0.50)" : "rgba(255,110,50,0.50)",
        booster: d ? "#6d6fbd" : "#5456c0",
        boosterDark: d ? "#3a3c78" : "#2a2c72",
        // Stylised smoke — flat, slightly tinted
        puff: d ? "rgba(192,193,255," : "rgba(140,142,248,",
        puffAlt: d ? "rgba(160,161,220," : "rgba(105,108,248,",
        star: d ? "rgba(192,193,255," : "rgba(105,108,248,",
        cloud: d ? "rgba(192,193,255," : "rgba(105,108,248,",
      };
    }

    /* ── rocket scale & position ────────────────────── */
    const SCALE = 0.65; // smaller rocket

    function rocketPos() {
      const cx = W / 2;
      // Sit above the vertically-centered dialog — roughly 18% from top
      const baseY = H * 0.18;
      const bob = Math.sin(t * 0.7) * 4 + Math.sin(t * 1.2) * 2;
      const sway = Math.sin(t * 0.45) * 1.5;
      return { x: cx + sway, y: baseY + bob };
    }

    /* ── draw 4-point diamond ──────────────────────── */
    function drawDiamond(x: number, y: number, s: number, a: number, c: ReturnType<typeof col>) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = `${c.star}0.55)`;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.28, y - s * 0.28);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s * 0.28, y + s * 0.28);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.28, y + s * 0.28);
      ctx.lineTo(x - s, y);
      ctx.lineTo(x - s * 0.28, y - s * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /* ── draw rocket ───────────────────────────────── */
    function drawRocket(cx: number, cy: number, c: ReturnType<typeof col>) {
      ctx.save();
      ctx.translate(cx, cy);
      const tilt = Math.sin(t * 0.45) * 0.02;
      ctx.rotate(tilt);
      ctx.scale(SCALE, SCALE);

      // Soft glow
      const glow = ctx.createRadialGradient(0, 15, 4, 0, 15, 55);
      glow.addColorStop(0, c.winGlow);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(-60, -50, 120, 130);

      // ── Side boosters (behind body) ──
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 18, -10);
        ctx.lineTo(side * 28, 10);
        ctx.lineTo(side * 32, 40);
        ctx.lineTo(side * 30, 48);
        ctx.lineTo(side * 22, 50);
        ctx.lineTo(side * 16, 44);
        ctx.lineTo(side * 14, 10);
        ctx.closePath();
        const bg = ctx.createLinearGradient(side * 14, 0, side * 32, 0);
        bg.addColorStop(side === -1 ? 0 : 1, c.boosterDark);
        bg.addColorStop(0.5, c.booster);
        bg.addColorStop(side === -1 ? 1 : 0, c.bodyDark);
        ctx.fillStyle = bg;
        ctx.fill();
        // booster tip
        ctx.beginPath();
        ctx.moveTo(side * 22, -10);
        ctx.quadraticCurveTo(side * 21, -18, side * 18, -10);
        ctx.closePath();
        ctx.fillStyle = c.bodyDark;
        ctx.fill();
      }

      // ── Main body ──
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.bezierCurveTo(5, -48, 12, -35, 15, -18);
      ctx.lineTo(16, 35);
      ctx.lineTo(12, 44);
      ctx.lineTo(-12, 44);
      ctx.lineTo(-16, 35);
      ctx.lineTo(-15, -18);
      ctx.bezierCurveTo(-12, -35, -5, -48, 0, -55);
      ctx.closePath();
      const bGrad = ctx.createLinearGradient(-16, 0, 16, 0);
      bGrad.addColorStop(0, c.body2);
      bGrad.addColorStop(0.3, c.body1);
      bGrad.addColorStop(0.7, c.body1);
      bGrad.addColorStop(1, c.body2);
      ctx.fillStyle = bGrad;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.bezierCurveTo(2, -48, 5, -35, 6, -18);
      ctx.lineTo(6, 35);
      ctx.lineTo(4, 40);
      ctx.lineTo(-2, 40);
      ctx.lineTo(-2, -18);
      ctx.bezierCurveTo(-1, -35, 0, -48, 0, -55);
      ctx.closePath();
      ctx.fillStyle = c.bodyHL;
      ctx.fill();

      // Body stripe
      ctx.fillStyle = c.bodyDark;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(-3, 5, 6, 27);
      ctx.globalAlpha = 1;

      // ── Window ──
      const wy = -20;
      ctx.beginPath();
      ctx.arc(0, wy, 10.5, 0, Math.PI * 2);
      ctx.fillStyle = c.bodyDark;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, wy, 8, 0, Math.PI * 2);
      const wG = ctx.createRadialGradient(-2, wy - 2, 1, 0, wy, 8);
      wG.addColorStop(0, c.winBright);
      wG.addColorStop(1, c.win);
      ctx.fillStyle = wG;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-2.5, wy - 2.5, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();

      // ── Fins ──
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 14, 28);
        ctx.lineTo(side * 24, 52);
        ctx.quadraticCurveTo(side * 20, 50, side * 13, 44);
        ctx.closePath();
        ctx.fillStyle = c.bodyDark;
        ctx.fill();
      }

      // ── Nozzle ──
      ctx.beginPath();
      ctx.moveTo(-8, 44);
      ctx.lineTo(-10, 52);
      ctx.lineTo(10, 52);
      ctx.lineTo(8, 44);
      ctx.closePath();
      ctx.fillStyle = c.bodyDark;
      ctx.fill();

      // ── Flames ──
      const flk = Math.sin(t * 14) * 4 + Math.sin(t * 19) * 2.5;
      const fH = 28 + flk;

      // Main flame
      const fG = ctx.createLinearGradient(0, 52, 0, 52 + fH);
      fG.addColorStop(0, c.fCore);
      fG.addColorStop(0.25, c.fInner);
      fG.addColorStop(0.65, c.fOuter);
      fG.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.moveTo(-7, 52);
      ctx.quadraticCurveTo(-5 + Math.sin(t * 16) * 1.5, 52 + fH * 0.5, Math.sin(t * 11) * 1.5, 52 + fH);
      ctx.quadraticCurveTo(5 + Math.sin(t * 14) * 1.5, 52 + fH * 0.5, 7, 52);
      ctx.closePath();
      ctx.fillStyle = fG;
      ctx.fill();

      // Inner bright core
      const iH = fH * 0.5;
      ctx.beginPath();
      ctx.moveTo(-3.5, 52);
      ctx.quadraticCurveTo(-1.5 + Math.sin(t * 20) * 1, 52 + iH * 0.5, Math.sin(t * 15) * 0.8, 52 + iH);
      ctx.quadraticCurveTo(1.5 + Math.sin(t * 18) * 1, 52 + iH * 0.5, 3.5, 52);
      ctx.closePath();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = c.fCore;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Side booster flames
      const sfH = 14 + Math.sin(t * 11) * 2;
      for (const sx of [-26, 26]) {
        const sg = ctx.createLinearGradient(sx, 48, sx, 48 + sfH);
        sg.addColorStop(0, c.fInner);
        sg.addColorStop(0.5, c.fOuter);
        sg.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(sx - 2.5, 48);
        ctx.quadraticCurveTo(sx + Math.sin(t * 18 + sx) * 1, 48 + sfH * 0.5, sx + Math.sin(t * 13 + sx) * 0.8, 48 + sfH);
        ctx.quadraticCurveTo(sx + Math.sin(t * 15 + sx) * 1, 48 + sfH * 0.5, sx + 2.5, 48);
        ctx.closePath();
        ctx.fillStyle = sg;
        ctx.fill();
      }

      ctx.restore();
    }

    /* ── stylised smoke puffs ──────────────────────── */
    function spawnPuffs(rx: number, flameBottom: number) {
      // Spawn 1-2 puffs per frame (fewer, bigger, smoother — lottie style)
      const count = Math.random() < 0.6 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const startR = 4 + Math.random() * 6;
        puffs.push({
          x: rx + (Math.random() - 0.5) * 12 * SCALE,
          y: flameBottom + Math.random() * 4,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.8 + Math.random() * 1.0,
          r: startR,
          targetR: startR + 20 + Math.random() * 25,
          life: 0,
          max: 110 + Math.random() * 60,
          opacity: 0.22 + Math.random() * 0.12,
          delay: Math.floor(Math.random() * 6),
        });
      }
      // Side booster puffs (smaller, wider)
      if (Math.random() < 0.4) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const startR = 3 + Math.random() * 4;
        puffs.push({
          x: rx + side * 17 * SCALE + (Math.random() - 0.5) * 4,
          y: flameBottom - 8 + Math.random() * 4,
          vx: side * 0.3 + (Math.random() - 0.5) * 0.3,
          vy: 0.6 + Math.random() * 0.8,
          r: startR,
          targetR: startR + 12 + Math.random() * 15,
          life: 0,
          max: 80 + Math.random() * 50,
          opacity: 0.15 + Math.random() * 0.1,
          delay: Math.floor(Math.random() * 4),
        });
      }
    }

    function updatePuffs() {
      puffs = puffs.filter((p) => {
        p.life++;
        if (p.life > p.max) return false;
        if (p.life < p.delay) return true; // waiting

        p.x += p.vx;
        p.y += p.vy;
        p.vy *= 0.998;
        p.vx += (Math.random() - 0.5) * 0.06;
        p.vx *= 0.995;
        // Ease-out growth toward targetR
        const progress = (p.life - p.delay) / (p.max - p.delay);
        p.r = p.r + (p.targetR - p.r) * 0.03;

        return true;
      });
      if (puffs.length > 300) puffs.splice(0, puffs.length - 300);
    }

    function drawPuffs(c: ReturnType<typeof col>) {
      for (const p of puffs) {
        if (p.life < p.delay) continue;
        const progress = (p.life - p.delay) / (p.max - p.delay);
        // Smooth ease-in-out opacity: quick fade in, slow fade out
        let a: number;
        if (progress < 0.12) {
          a = p.opacity * (progress / 0.12);
        } else {
          // Smooth cubic ease-out
          const fadeProgress = (progress - 0.12) / 0.88;
          a = p.opacity * (1 - fadeProgress * fadeProgress);
        }
        if (a <= 0.003) continue;

        ctx.save();
        ctx.globalAlpha = a;
        // Draw as a simple filled circle — flat, graphic look
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // Alternate between two tints for visual depth
        ctx.fillStyle = p.life % 2 === 0
          ? `${c.puff}0.18)`
          : `${c.puffAlt}0.12)`;
        ctx.fill();
        ctx.restore();
      }
    }

    /* ── clouds ─────────────────────────────────────── */
    function drawClouds(c: ReturnType<typeof col>) {
      const baseY = H * 0.86;
      for (let layer = 0; layer < 3; layer++) {
        const y = baseY + layer * 20;
        const alpha = 0.05 + layer * 0.035;
        ctx.beginPath();
        ctx.moveTo(-10, H + 10);
        ctx.lineTo(-10, y + 20);
        const bumps = 14;
        const bw = (W + 20) / bumps;
        for (let i = 0; i <= bumps; i++) {
          const bx = i * bw - 10;
          const bh = 12 + Math.sin(i * 1.4 + layer * 2.2 + t * 0.18) * 8;
          ctx.quadraticCurveTo(bx - bw * 0.5, y - bh, bx, y + Math.sin(i * 0.9 + t * 0.12) * 3);
        }
        ctx.lineTo(W + 10, H + 10);
        ctx.closePath();
        ctx.fillStyle = `${c.cloud}${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    /* ── main loop ──────────────────────────────────── */
    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      const c = col();
      const { x: rx, y: ry } = rocketPos();

      // Stars
      for (const s of stars) {
        const tw = 0.3 + 0.7 * ((Math.sin(t * s.speed + s.phase) + 1) / 2);
        if (s.kind === "dot") {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `${c.star}${(tw * 0.28).toFixed(2)})`;
          ctx.fill();
        } else {
          drawDiamond(s.x, s.y, s.size * tw, tw * 0.38, c);
        }
      }

      // Puffs (behind rocket)
      drawPuffs(c);
      drawClouds(c);
      drawRocket(rx, ry, c);

      // Spawn puffs from below flame
      const nozzleY = ry + (52 + 28) * SCALE;
      spawnPuffs(rx, nozzleY);
      updatePuffs();

      animRef.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    animRef.current = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
