import TextRoll from "@/components/ui/text-roll";

/**
 * A nav label with the 21st.dev letter-roll hover effect.
 *
 * TextRoll needs its text as a plain string (it splits it into letters), and
 * Astro passes island children as a slot element, so the label arrives as a
 * prop. `text-inherit` replaces the component's black default so the link's
 * own colour (muted, hover, current-section) shows through. The link keeps
 * the pill padding: padding on this span would enlarge its clipping box and
 * expose the second copy of the text that the roll relies on hiding.
 */
export default function NavRoll({ text }: { text: string }) {
  return (
    <TextRoll center className="text-inherit">
      {text}
    </TextRoll>
  );
}
