import type { ReactNode } from "react";
import { LinkPreview } from "@/components/ui/link-preview";

/**
 * Turns named phrases inside a sentence into hover-preview links (the
 * Aceternity Link Preview). Used in the About page story, where the client
 * types ("jewellers", "clinics"...) preview the matching client site and
 * click through to its case study. The copy itself stays in data/team.ts;
 * this only decorates it, and any phrase not found in the text is ignored.
 *
 * Renders inline (a fragment of text and links) so it can sit inside the
 * page's own <p>. Hover cards open on hover and focus only, so on phones the
 * phrases are ordinary links.
 */
export type ProseLink = {
  /** Exact text to link, matched once (first occurrence). */
  phrase: string;
  href: string;
  /** Screenshot shown in the hover card. */
  image: string;
};

const LINK_CLASS =
  "text-ink underline underline-offset-4 decoration-brand-bright decoration-[1.5px] hover:text-brand-bright transition-colors";

export default function ProsePreviewLinks({ text, links }: { text: string; links: ProseLink[] }) {
  const placed = links
    .map((link) => ({ ...link, at: text.indexOf(link.phrase) }))
    .filter((link) => link.at >= 0)
    .sort((a, b) => a.at - b.at);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const link of placed) {
    if (link.at < cursor) continue; // overlaps a phrase already linked
    nodes.push(text.slice(cursor, link.at));
    nodes.push(
      <LinkPreview key={link.phrase} url={link.href} isStatic imageSrc={link.image} width={280} height={175} className={LINK_CLASS}>
        {link.phrase}
      </LinkPreview>,
    );
    cursor = link.at + link.phrase.length;
  }
  nodes.push(text.slice(cursor));

  return <>{nodes}</>;
}
