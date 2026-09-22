import { Phone } from "lucide-react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

/**
 * The floating "Call us" button, styled with the 21st.dev liquid-glass button.
 *
 * LiquidButton renders a <button>, and its `asChild` mode cannot wrap an <a>
 * (it passes several children into the slot), so the button dials through a
 * click handler and carries the phone number in its accessible label.
 * Positioning and the hide-while-contact-is-visible behaviour live in
 * CallFab.astro, which renders this as a `client:load` island.
 */
export default function CallFab({ tel, label }: { tel: string; label: string }) {
  return (
    <LiquidButton
      size="xl"
      className="rounded-full text-ink font-semibold"
      aria-label={`Call us on ${label}`}
      onClick={() => {
        window.location.href = `tel:${tel}`;
      }}
    >
      <span className="flex items-center gap-2">
        <Phone className="size-4" aria-hidden="true" />
        Call us
      </span>
    </LiquidButton>
  );
}
