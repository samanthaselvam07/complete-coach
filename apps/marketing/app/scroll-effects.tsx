"use client";

import { useEffect } from "react";

export function ScrollEffects() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const motionElements = Array.from(document.querySelectorAll<HTMLElement>(".motion-item"));

    document.documentElement.classList.add("reveal-ready");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
    }

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        element.classList.add("is-visible");
      }
    });

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                }
              }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
          )
        : null;

    elements.forEach((element) => observer?.observe(element));

    let frame = 0;
    const handleScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}`);

        const viewportCenter = window.innerHeight / 2;
        motionElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const depth = Number(element.dataset.depth ?? "1");
          const distance = (viewportCenter - (rect.top + rect.height / 2)) / window.innerHeight;
          const clamped = Math.max(-1, Math.min(1, distance));
          element.style.setProperty("--motion", `${clamped * depth}`);
        });

        frame = 0;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      document.documentElement.classList.remove("reveal-ready");
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return null;
}
