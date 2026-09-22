import TextRoll from "@/components/ui/text-roll";

/**
 * A nav label with the 21st.dev letter-roll hover effect.
 *
 * TextRoll needs its text as a plain string (it splits it into letters), and
 * Astro passes island children as a slot element, so the label arrives as a
 * prop. The span fills the link's padding so hovering anywhere on the pill
 * starts the roll, and `text-inherit` replaces the component's black default
 * so the link's own colour (muted, hover, current-section) shows through.
 */
export default function NavRoll({ text }: { text: string }) {
  return (
    <TextRoll center className="px-4 py-2 text-inherit">
      {text}
    </TextRoll>
  );
}
