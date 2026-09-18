// Team and company story for /about.
//
// Nothing in here is invented. FOUNDED_YEAR, TEAM_SIZE, STORY and TEAM are
// deliberately left empty — an About page is the one place where made-up
// details do real damage, both to trust and to any funding or credit
// application that cross-checks it.
//
// Every section on /about renders only when its data exists, so the page is
// complete and honest right now, and gets stronger as you fill these in.

/** e.g. "2023". Shown as "Founded 2023" and in the schema. */
export const FOUNDED_YEAR = "2025";

/** e.g. "6" or "5-10". Shown as "N people". */
export const TEAM_SIZE = "";

/**
 * Two or three paragraphs on why the company exists. Each string is a <p>.
 *
 * These describe how the company works and what it believes — deliberately no
 * origin claims (founding date, headcount, "since X we have served Y"), because
 * those are checkable facts and nothing here should assert one that isn't set
 * above. Rewrite freely in your own voice; add the origin story once you want
 * it public.
 */
export const STORY: string[] = [
  "TheArkTech exists because most businesses don't need a showpiece — they need software that works on a Tuesday morning when an order comes in. Our clients are jewellers, clinics, exporters, manufacturers, and training companies. What they have in common is that the thing we build for them has to hold up in daily use.",
  "So we build in the open. Every project starts with a written scope, so you know the cost and the timeline before anyone writes a line of code. You see something reviewable at the end of each cycle rather than waiting for a reveal. And when the work is done, the source code, the repositories, and the infrastructure accounts are yours — we don't hold credentials or lock anyone into a platform they can't leave.",
  "The clearest way to judge us is to look at what we've already shipped. Every project in our portfolio is a live site you can open right now and use as a real customer would. We'd rather be checked than believed.",
];

export interface TeamMember {
  name: string;
  role: string;
  /** Path under /public, e.g. "/team/sherwyn.jpg". Initials shown if absent. */
  photo?: string;
  /** One line on what they do here. */
  bio?: string;
  linkedin?: string;
}

/** Named people. Leave empty until you have real names and roles to publish. */
export const TEAM: TeamMember[] = [];

/** How an engagement actually runs, start to finish. */
export const PROCESS: { step: string; title: string; detail: string }[] = [
  {
    step: "01",
    title: "Discovery",
    detail:
      "We work out what you actually need, what it should cost, and how long it takes — before anyone writes code. You get a written scope.",
  },
  {
    step: "02",
    title: "Architecture & design",
    detail:
      "We decide the stack, data model, and interface, and show you the plan. Changing direction here is cheap; changing it later is not.",
  },
  {
    step: "03",
    title: "Build",
    detail:
      "Development in short cycles with something reviewable at the end of each one, so you see progress rather than waiting for a reveal.",
  },
  {
    step: "04",
    title: "Test & launch",
    detail:
      "Functional and cross-device testing, performance tuning, then deployment to your infrastructure with documentation handed over.",
  },
  {
    step: "05",
    title: "Support",
    detail:
      "A post-launch support window on every project, and optional ongoing maintenance covering updates, backups, and priority fixes.",
  },
];
