import { useEffect, useState, type ReactNode } from "react";
import GlyphPortal from "@/components/ui/glyph-portal";
import { LiquidLink } from "@/components/ui/liquid-glass-button";

export type AboutAction = { label: string; href: string; external?: boolean };

/**
 * The About page opener: the Glyph Portal (21st.dev) set in the site's own
 * type and colours. The word fills the screen; scrolling dives through one
 * letter into the page header passed as children.
 *
 * The portal freezes whichever font face is loaded at mount, so we wait for
 * Clash Display (self-hosted, preloaded by about.astro) before rendering it,
 * with a timeout so a slow font can never block the page. Until then a
 * full-height placeholder holds the space, so nothing shifts.
 */
const FACE = '"Clash Display", "Arial Black", Arial, sans-serif';

/**
 * Scroll travel through the letter, in viewport heights. Phones get a shorter
 * dive: at 2.2 a reader swipes through ~1400px of empty field before the
 * header fades in; 1.5 keeps the effect and halves the blank stretch.
 */
const TRAVEL = 2.2;
const TRAVEL_PHONE = 1.5;

export default function AboutPortal({
  word = "ARKTECH",
  eyebrow,
  support,
  enterLabel = "Read our story",
  actions = [],
  children,
}: {
  word?: string;
  eyebrow?: string;
  support?: string;
  enterLabel?: string;
  /** Buttons under the revealed header, rendered as liquid-glass links. */
  actions?: AboutAction[];
  children?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [travel, setTravel] = useState(TRAVEL);

  useEffect(() => {
    let settled = false;
    setTravel(window.matchMedia("(max-width: 767px)").matches ? TRAVEL_PHONE : TRAVEL);
    const finish = () => {
      if (!settled) {
        settled = true;
        setReady(true);
      }
    };
    const timeout = window.setTimeout(finish, 1500);
    document.fonts.load('700 100px "Clash Display"').then(finish, finish);
    return () => {
      settled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  if (!ready) {
    return <div data-about-portal-placeholder style={{ minHeight: "100svh", background: "#000" }} aria-hidden="true" />;
  }

  return (
    <div data-about-portal style={{ containerType: "inline-size" }}>
      <style>{`
        [data-about-portal] [data-gp-hint]{color:var(--ink-faint);font:500 12px/1.4 Satoshi,ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;}
        [data-about-portal] [data-gp-caption]{inset:calc(var(--gp-word-bottom,50%) + 84px) 24px auto;justify-content:center;}
        [data-about-portal] [data-gp-enter]{min-height:46px;padding:0 22px;gap:18px;border-radius:9999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#fff;font:500 14px/1 Satoshi,ui-sans-serif,system-ui,sans-serif;transition:background var(--dur-2,.28s),border-color var(--dur-2,.28s);}
        [data-about-portal] [data-gp-enter]:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);}
        [data-about-portal] [data-gp-touch-picker]{display:none;}
        [data-about-portal] [data-ab-eyebrow]{position:absolute;inset:auto 24px calc(100% - var(--gp-word-top,35%) + 30px);margin:0;text-align:center;font:500 12px/1.5 Satoshi,ui-sans-serif,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);}
        [data-about-portal] [data-ab-support]{position:absolute;inset:calc(var(--gp-word-bottom,50%) + 30px) 24px auto;margin:0;text-align:center;font:400 16px/1.5 Satoshi,ui-sans-serif,system-ui,sans-serif;color:var(--ink-muted);}
        [data-about-portal] [data-gp-content]{padding:6rem clamp(1rem,4vw,1.5rem) 4rem;}
        [data-about-portal] [data-ab-inner]{width:100%;max-width:58rem;margin-inline:auto;}
        [data-about-portal] [data-ab-actions]{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.75rem;max-width:44rem;}
        [data-about-portal] [data-ab-actions] [style*="container-glass"]{border-radius:9999px;}
        @container(max-height:479px){[data-about-portal] [data-ab-support]{top:calc(var(--gp-word-bottom,50%) + 14px);}[data-about-portal] [data-gp-caption]{top:calc(var(--gp-word-bottom,50%) + 58px);}}
        @media(max-width:639px){
          [data-about-portal] [data-gp-content]{padding:5.5rem 1rem 2.5rem;}
          [data-about-portal] [data-gp-caption]{inset:calc(var(--gp-word-bottom,50%) + 76px) 16px auto;}
          [data-about-portal] [data-ab-support]{font-size:15px;}
          [data-about-portal] [data-ab-actions]{margin-top:1.4rem;}
        }
      `}</style>
      <GlyphPortal
        word={word}
        fontFamily={FACE}
        fontWeight={700}
        scrollLength={travel}
        interactive
        annotations={false}
        enterLabel={enterLabel}
        style={{
          "--gp-paper": "#000000",
          "--gp-ink": "#ffffff",
          "--gp-field": "#0b1a3a",
          "--gp-foreground": "#ffffff",
          fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif",
        }}
        background={
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: "scale(var(--gp-field-scale,1))",
              background:
                "radial-gradient(circle at 20% 12%, rgba(96,165,250,.55), transparent 40%), radial-gradient(circle at 82% 28%, rgba(34,211,238,.22), transparent 34%), radial-gradient(circle at 50% 88%, rgba(30,58,138,.75), transparent 52%), linear-gradient(135deg, #0b1a3a 0%, #1e3a8a 52%, #050b18 100%)",
            }}
          />
        }
        front={
          <>
            {eyebrow && <p data-ab-eyebrow>{eyebrow}</p>}
            {support && <p data-ab-support>{support}</p>}
          </>
        }
      >
        {/* Astro slots island children in a display:contents wrapper, so the column width lives on this div. */}
        <div data-ab-inner>
          {children}
          {actions.length > 0 && (
            <div data-ab-actions className="dark">
              {actions.map((action) => (
                <LiquidLink
                  key={action.href}
                  href={action.href}
                  size="xl"
                  className="rounded-full text-ink font-semibold"
                  {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {action.label}
                </LiquidLink>
              ))}
            </div>
          )}
        </div>
      </GlyphPortal>
    </div>
  );
}
