"use client";

import { useEffect, useRef, useState } from "react";

type Animation = "fade-up" | "fade-in" | "slide-left" | "slide-right" | "zoom-in" | "fade-up-stagger";

interface Props {
  children: React.ReactNode;
  animation?: Animation;
  delay?: number;
  threshold?: number;
  className?: string;
  once?: boolean;
  /** For stagger: applies incrementing delay to each direct child */
  staggerMs?: number;
}

export default function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  threshold = 0.15,
  className = "",
  once = true,
  staggerMs,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const baseStyle: React.CSSProperties = {
    transitionDelay: `${delay}ms`,
  };

  // Map animation name to CSS class
  const animClass = visible ? `sr-visible sr-${animation}` : `sr-hidden sr-${animation}`;

  return (
    <div
      ref={ref}
      className={`sr-wrapper ${animClass} ${className}`}
      style={baseStyle}
      data-stagger={staggerMs}
    >
      {children}
    </div>
  );
}
