import { useEffect, useRef, useState } from "react";
import CardsShader from "@/components/ui/cards-shader-effect";

/**
 * The Contact page's digital business card: the 21st.dev cards-shader-effect
 * with the site's brand-blue Warp shader on the front, and the real contact
 * details on the back. Hover flips it on desktop; a tap flips it on phones.
 *
 * CardsShader fills its parent (absolute inset-0), so this wrapper owns the
 * box: it measures its own width and sizes the card to fit, leaving room for
 * the perspective lift (~1.11x) and the tilt so the card is never clipped.
 */
type Props = {
  name: string;
  tagline: string;
  email: string;
  phones: string[];
  location: string;
  site: string;
};

const MAX_CARD_W = 340;
const LIFT = 1.11; // translateZ(130px) under perspective 1350px

export default function ContactCard3D({ name, tagline, email, phones, location, site }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [cardW, setCardW] = useState(MAX_CARD_W);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.getBoundingClientRect().width;
      if (!w) return;
      setCardW(Math.max(220, Math.min(MAX_CARD_W, Math.floor((w - 16) / LIFT))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cardH = Math.round(cardW / 1.5925);
  const boxH = Math.round(cardH * LIFT + 56);

  const front = (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-5 text-white">
      {/* Keeps the type readable over the brighter parts of the shader */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" aria-hidden="true" />
      <div className="relative flex items-center gap-2.5">
        <img src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" decoding="async" />
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">{name}</span>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <span className="text-[0.72rem] leading-snug text-white/80">{tagline}</span>
        <span className="font-mono text-[0.68rem] tracking-[0.12em] text-white/60">{site}</span>
      </div>
    </div>
  );

  const back = (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-5 text-white">
      <div className="absolute left-0 right-0 top-4 h-7 bg-black/85 backdrop-blur-md" aria-hidden="true" />
      <div className="relative mt-9 flex flex-col gap-1.5">
        <p className="m-0 text-[0.6rem] uppercase tracking-[0.18em] text-white/50">Email</p>
        <p className="m-0 font-mono text-[0.78rem] tracking-wide">{email}</p>
        <p className="m-0 mt-1.5 text-[0.6rem] uppercase tracking-[0.18em] text-white/50">Phone</p>
        <p className="m-0 font-mono text-[0.78rem] tracking-wide">{phones.join("  ·  ")}</p>
      </div>
      <p className="relative m-0 text-[0.7rem] text-white/70">{location}</p>
    </div>
  );

  return (
    <div className="contact-card-3d">
      <div ref={boxRef} className="relative w-full" style={{ height: boxH }}>
        <CardsShader
          front={front}
          back={back}
          design={0}
          tapToFlip
          backShader={false}
          cardWidth={cardW}
          ariaLabel={`${name} business card. Hover or tap to flip.`}
          className="bg-transparent"
        />
      </div>
      <p className="m-0 text-center text-[0.72rem] uppercase tracking-[0.16em] text-ink-faint">
        Hover or tap to flip
      </p>
    </div>
  );
}
