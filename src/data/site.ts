// Single source of truth for contact details. These appear in the nav, hero,
// quiz, contact form, booking card, footer, the /contact page, the floating
// call button, and the LocalBusiness structured data.

// Trading / brand name, used everywhere the site speaks to customers.
export const COMPANY_NAME = "TheArkTech";

// Registered entity. LEGAL_NAME is the exact name on the certificate of
// incorporation (it usually ends in "Private Limited" and may differ from the
// trading name). CIN and GSTIN are optional here: every consumer below omits
// the row and the schema field entirely while they are empty, so nothing shows
// a blank or placeholder value.
// Note: Companies Act 2013 s.12(3) requires a company to publish its name,
// registered office address, CIN, phone, email and website on its official
// publications — filling CIN in here satisfies the website side of that.
export const LEGAL_NAME = "";
export const COMPANY_TYPE = "Private Limited Company";
export const CIN = "";
export const GSTIN = "";

/** Legal name when known, otherwise the trading name — never blank. */
export const LEGAL_DISPLAY_NAME = LEGAL_NAME || COMPANY_NAME;

export const WHATSAPP_NUMBER = "919489722142";
export const PHONE_E164 = "+919489722142";
export const PHONE_LABEL = "+91 94897 22142";
// Secondary line — shown alongside the primary on the contact page, in the
// footer, and in the structured data. WhatsApp and the call button stay on
// the primary number.
export const PHONE_2_E164 = "+918122801912";
export const PHONE_2_LABEL = "+91 81228 01912";
export const EMAIL = "sherwynjoel@thearktech.in";

// Postal address. Verification checks (AWS Activate, Google Business Profile,
// payment gateways) look for a real, consistent address on the site.
// STREET_ADDRESS and POSTAL_CODE are optional: every consumer below renders
// correctly while they are empty, and filling them in here updates the
// /contact page, the footer, and the structured data at once.
export const STREET_ADDRESS = "No. 5, Manikandan Nagar, Thelungupalayam";
export const CITY = "Coimbatore";
export const REGION = "Tamil Nadu";
export const POSTAL_CODE = "641039";
export const COUNTRY = "India";
export const COUNTRY_CODE = "IN";

/** Human-readable address, skipping any parts not filled in. */
export const ADDRESS_LINES: string[] = [
  STREET_ADDRESS,
  [CITY, REGION].filter(Boolean).join(", "),
  [POSTAL_CODE, COUNTRY].filter(Boolean).join(" "),
].filter(Boolean);

/** Short one-line form, used in the footer and meta descriptions. */
export const LOCATION = [CITY, REGION, COUNTRY].filter(Boolean).join(", ");

export const HOURS_LABEL = "Monday – Saturday, 10:00 AM – 7:00 PM IST";
export const HOURS_SCHEMA = "Mo-Sa 10:00-19:00";
export const RESPONSE_TIME = "We reply within a few hours on working days.";

/** Build a wa.me deep link with a pre-typed message. */
export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
