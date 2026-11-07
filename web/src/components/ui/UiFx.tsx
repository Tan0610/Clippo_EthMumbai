"use client";
import { useEffect } from "react";

/**
 * Presentation only. Click feedback for every button: on pointer down it writes where the press happened
 * (--rx / --ry) and a data-fx flag on the control; CSS paints a soft ring from that point and the flag is removed
 * when the animation ends. No elements are inserted and no handlers, props or state of any component are touched.
 */
const SEL = ".btn, .seg button, .pick button, .clip-btn, .dec-btns button, .ws-tiers button, .menu-btn";

export function UiFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers = new WeakMap<Element, number>();
    const onDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest<HTMLElement>(SEL);
      if (!el || (el instanceof HTMLButtonElement && el.disabled)) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--rx", `${e.clientX - r.left}px`);
      el.style.setProperty("--ry", `${e.clientY - r.top}px`);
      el.removeAttribute("data-fx");
      void el.offsetWidth; // restart the animation on a quick second press
      el.setAttribute("data-fx", "1");
      window.clearTimeout(timers.get(el));
      timers.set(el, window.setTimeout(() => el.removeAttribute("data-fx"), 750));
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
