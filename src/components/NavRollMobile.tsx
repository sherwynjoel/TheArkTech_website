import { useEffect, useRef, useState } from "react";
import TextRoll from "@/components/ui/text-roll";

/**
 * The letter-roll for the mobile menu, where there is no hover. The roll
 * plays each time the menu opens, through TextRoll's `active` prop.
 *
 * The menu is opened and closed by Nav.astro's own script (it toggles the
 * `hidden` class on #nav-mobile); a MutationObserver reads that state so the
 * island never has to own it. `index` staggers the links a little.
 */
export default function NavRollMobile({ text, index = 0 }: { text: string; index?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const menu = ref.current?.closest("#nav-mobile");
    if (!menu) return;
    let timer = 0;
    const update = () => {
      window.clearTimeout(timer);
      const open = !menu.classList.contains("hidden");
      // Stagger the links on open; reset immediately on close.
      timer = window.setTimeout(() => setActive(open), open ? 60 + index * 70 : 0);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(menu, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
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
