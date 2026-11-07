"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Presentation only. The hero section, plus a pointer-parallax: while the pointer moves over it, two CSS
 * variables (--px / --py, -1 to 1) are written on the section and each layer decides how far it rides.
 * Fine pointers only, and never under reduced motion. Nothing else on the page reads these values.
 */
export function HeroStage({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const paint = () => {
      raf = 0;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const leave = () => {
      px = 0;
      py = 0;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <section className="hx" ref={ref} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
