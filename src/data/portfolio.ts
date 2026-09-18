export interface PortfolioProject {
  title: string;
  sector: string;
  type: string;
  summary: string;
  image: string;
  gallery?: string[];
  metrics: { value: string; label: string }[];
  tags: string[];
  url?: string;

  /** Stable URL segment. Derived from the title when omitted. */
  slug?: string;

  // ---- Optional case-study detail ----------------------------------------
  // Each of these renders as its own section on /work/<slug> and is skipped
  // entirely when absent, so a project with none of them still produces a
  // complete page. Fill them in as you write up each engagement — nothing
  // here should be guessed, since these are claims about real client work.
  /** The situation the client came with. 2-4 sentences. */
  challenge?: string;
  /** What was actually built, one item per line. */
  approach?: string[];
  /** What changed for the client after launch. 2-4 sentences. */
  outcome?: string;
  /** Technologies used on this specific project. */
  stack?: string[];
  /** Delivery year, e.g. "2025". */
  year?: string;
  /** Short pull-quote from the client, if you have one on record. */
  testimonial?: { quote: string; author: string; role?: string };
}

/** URL-safe slug for a project, derived from the title unless one is set. */
export function projectSlug(project: PortfolioProject): string {
  return (
    project.slug ??
    project.title
      .toLowerCase()
      // Drop apostrophes first so "Dr. Alam's" becomes "dr-alams", not "dr-alam-s".
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export const portfolioProjects: PortfolioProject[] = [
  {
    title: "Hars Jewellery",
    sector: "Jewelry Retail",
    type: "Premium E-Commerce",
    summary:
      "A luxurious e-commerce platform for a premium jewelry brand, showcasing handcrafted gold and diamond collections with an elegant, immersive shopping experience.",
    image: "/portfolio/harsjewellery.webp",
    url: "https://harsjewellery.in",
    metrics: [],
    tags: ["E-Commerce", "Jewelry", "Luxury", "Online Store"],
    approach: [
      "Collection-based product catalogue with filtering",
      "Customer accounts with sign-in and registration",
      "Cart and checkout with online payment",
      "High-resolution product galleries",
      "WhatsApp enquiry channel alongside checkout",
      "Responsive layout across phone, tablet and desktop",
    ],
  },
  {
    title: "Zetra Electronics",
    sector: "E-Commerce",
    type: "Online Store",
    summary:
      "India's premium destination for electronic components, sensors, IoT modules, and robotics kits. A complete e-commerce experience.",
    image: "/portfolio/zetraelectronics.webp",
    url: "https://zetraelectronics.com",
    metrics: [{ value: "5000+", label: "products listed" }],
    tags: ["E-Commerce", "Electronics", "IoT", "Robotics"],
    approach: [
      "Component catalogue with category filtering",
      "Cart and checkout with online payment",
      "Customer accounts and order tracking",
      "Help centre and support section",
      "Product listings for sensors, IoT modules and robotics kits",
      "Mobile-first storefront",
    ],
  },

  {
    title: "Opal Media Productions",
    sector: "Media Production",
    type: "Corporate Website",
    summary:
      "A multi-service corporate website for a media production studio, with structured service sections and a direct enquiry flow.",
    image: "/portfolio/opalmediaproductions.webp",
    url: "https://www.opalmediaproductions.com/",
    metrics: [
      { value: "5+", label: "service verticals" },
      { value: "24h", label: "response promise" },
    ],
    tags: ["Corporate Site", "Media", "CMS", "Enquiry Flow"],
    approach: [
      "Multi-service corporate structure across production disciplines",
      "Work gallery presenting past productions",
      "Client testimonials section",
      "Direct enquiry flow with WhatsApp handoff",
      "Responsive media-heavy layout",
    ],
  },
  {
    title: "Dr. Alam's Skin Clinic",
    sector: "Healthcare",
    type: "Clinic Website",
    summary:
      "A dermatologist-led clinic website for advanced skin, hair, laser, and dermatosurgery treatments with consultation-focused patient journeys.",
    image: "/portfolio/dralamdermcentre.webp",
    url: "https://dralamdermcentre.com/",
    metrics: [
      { value: "500+", label: "Google reviews" },
      { value: "4.9", label: "review rating" },
    ],
    tags: ["Healthcare", "Booking System", "Gallery", "Responsive"],
  },
  {
    title: "LearnMore Projects",
    sector: "Education & R&D",
    type: "Training Website",
    summary:
      "A project-center website for final year engineering projects, training, domain discovery, student outcomes, and WhatsApp-led enquiries.",
    image: "/portfolio/learnmoreprojects.webp",
    url: "https://learnmoreprojects.in/",
    metrics: [
      { value: "7,000+", label: "students supported" },
      { value: "5,000+", label: "projects delivered" },
    ],
    tags: ["Education", "R&D", "Training", "Lead Gen"],
  },
  {
    title: "Axis Upgraders",
    sector: "Business Services",
    type: "Business Website",
    summary:
      "A live business website for Axis Upgraders with clear service positioning, mobile-friendly presentation, and direct enquiry flow.",
    image: "/portfolio/axisupgraders.webp",
    url: "https://axisupgraders.com/",
    metrics: [],
    tags: ["Business Site", "Responsive", "Enquiry Flow", "Performance"],
    approach: [
      "Structured service and capability sections",
      "Process walkthrough explaining the engagement",
      "Consultation booking flow",
      "Single-page navigation with in-page anchors",
      "Responsive layout tuned for mobile enquiries",
    ],
  },
  {
    title: "Deva Sea Food",
    sector: "Food & Export",
    type: "Business Website",
    summary:
      "A business website for a frozen seafood import and export brand, focused on product credibility, company presence, and direct enquiry flow.",
    image: "/portfolio/devaseafood.webp",
    url: "https://devaseafood.com/",
    metrics: [],
    tags: ["Food Export", "Business Site", "Responsive", "Lead Gen"],
  },
  {
    title: "Southern Group of Companies",
    sector: "Conglomerate",
    type: "Corporate Website",
    summary:
      "A corporate website for a South India group spanning scrap trading, clean energy, logistics, commodity trading, and real estate divisions.",
    image: "/portfolio/southerngoc.webp",
    url: "https://southerngoc.com/",
    metrics: [
      { value: "6", label: "group companies" },
      { value: "2015", label: "founded" },
    ],
    tags: ["Corporate", "Multi-Sector", "Clean Energy", "Logistics"],
  },
  {
    title: "FD Sports Infrastructure",
    sector: "Sports Infrastructure",
    type: "Business Website",
    summary:
      "A sports infrastructure website for turf construction, courts, cricket nets, project galleries, process education, and consultation-led enquiries.",
    image: "/portfolio/fdsports.webp",
    url: "https://fdsports.in/",
    metrics: [
      { value: "10+", label: "years experience" },
      { value: "40+", label: "team members" },
    ],
    tags: ["Sports", "Infrastructure", "Gallery", "Lead Gen"],
  },
  {
    title: "Grace Dental Care Kovai",
    sector: "Healthcare",
    type: "Clinic Website",
    summary:
      "A dental clinic website for patient education, treatment discovery, doctor profiles, international patient support, and direct appointment enquiries.",
    image: "/portfolio/gracedentalcarekovai.webp",
    url: "https://www.gracedentalcarekovai.com/",
    metrics: [{ value: "10+", label: "years experience" }],
    tags: ["Dental", "Healthcare", "Treatments", "Appointments"],
  },
];

