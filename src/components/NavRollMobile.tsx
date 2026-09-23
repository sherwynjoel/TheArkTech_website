import { useEffect, useRef, useState } from "react";
import TextRoll from "@/components/ui/text-roll";

/**
 * The letter-roll for the mobile menu, where there is no hover. The roll
 * plays when the menu opens and then keeps going: every WAVE_MS the labels
 * roll up or back down, one link after another, so the effect is always
 * alive while the menu is open (Sherwyn's ask). Under reduced motion it
 * plays once on open and rests.
 *
 * The menu is opened and closed by Nav.astro's own script (it toggles the
 * `hidden` class on #nav-mobile); a MutationObserver reads that state so the
 * island never has to own it. `index` staggers the links a little.
 */
const WAVE_MS = 1700;

export default function NavRollMobile({ text, index = 0 }: { text: string; index?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const menu = ref.current?.closest("#nav-mobile");
    if (!menu) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let timers: number[] = [];
    let interval = 0;
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
      window.clearInterval(interval);
      interval = 0;
    };
    // Stagger the links on each wave; reset immediately on close.
    const wave = (on: boolean) => {
      timers.push(window.setTimeout(() => setActive(on), on ? 60 + index * 70 : index * 70));
    };
    const update = () => {
      clear();
      const open = !menu.classList.contains("hidden");
      if (!open) {
        setActive(false);
        return;
      }
      wave(true);
      if (reduce) return;
      let on = true;
      interval = window.setInterval(() => {
        on = !on;
        wave(on);
      }, WAVE_MS);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(menu, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      clear();
    };
  }, [index]);

  return (
    <span ref={ref} className="block">
      <TextRoll center active={active} className="text-inherit">
        {text}
      </TextRoll>
    </span>
  );
}
