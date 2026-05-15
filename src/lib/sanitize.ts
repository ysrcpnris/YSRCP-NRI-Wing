// =====================================================================
// Shared input sanitiser for any form that accepts free-text from
// users. The Supabase JS client already parameterises every query
// (so SQL injection isn't possible at the transport layer); this is
// a separate "data hygiene" pass that strips ONLY characters that
// have no legitimate use in human-typed text:
//   - NULL bytes and other unprintable control chars (which can break
//     the rendering layer or look like glitches in admin exports),
//   - Zero-width / bidirectional Unicode chars commonly used in
//     homoglyph and direction-spoofing attacks.
//
// Conservative on purpose. Specifically the sanitiser:
//   - PRESERVES tab (0x09), newline (0x0A) and carriage return (0x0D)
//     so multi-line textareas (suggestions, service requests) keep
//     their formatting.
//   - PRESERVES every printable ASCII / Unicode character — letters,
//     digits, spaces, punctuation including quotes ('), apostrophes,
//     semicolons, commas, colons, slashes, ampersands, angle brackets
//     ("x > 0" stays intact), and any non-Latin scripts.
//
// In other words: legitimate user input flows through unchanged. Only
// invisible / unprintable garbage is removed.
// =====================================================================

// Build the strip-regex programmatically from char codes so the source
// file itself never contains any control / zero-width characters that
// could be silently rewritten by editors, linters or copy-paste flows.
const STRIP_RANGES: Array<[number, number]> = [
  [0x0000, 0x0008], // NUL through BS (skip TAB at 0x09)
  [0x000B, 0x000C], // VT, FF        (skip LF at 0x0A and CR at 0x0D)
  [0x000E, 0x001F], // SO through US
  [0x007F, 0x007F], // DEL
  [0x200B, 0x200F], // zero-width + LTR/RTL marks
  [0x202A, 0x202E], // bidi embedding controls
  [0x2066, 0x2069], // bidi isolate controls
  [0xFEFF, 0xFEFF], // BOM / zero-width no-break space
];

const STRIP_REGEX = new RegExp(
  "[" +
    STRIP_RANGES.map(([a, b]) =>
      a === b
        ? String.fromCharCode(a)
        : String.fromCharCode(a) + "-" + String.fromCharCode(b)
    ).join("") +
    "]",
  "g"
);

export const sanitizeText = (raw: string | null | undefined): string =>
  (raw || "").replace(STRIP_REGEX, "");

// Trim variant - handy for fields where leading/trailing whitespace is
// also meaningless (names, locations).
export const sanitizeTrim = (raw: string | null | undefined): string =>
  sanitizeText(raw).trim();

// Returns true when the value contains at least one letter character
// (Latin, Devanagari, Telugu, Tamil, Arabic, CJK — any script). Used
// to validate human names so users can't register with garbage like
// "," or "..." or "   ". Whitespace-only and pure-punctuation values
// are rejected. Numbers alone are also rejected.
export const isValidName = (raw: string | null | undefined): boolean => {
  const cleaned = sanitizeText(raw).trim();
  if (cleaned.length < 2) return false;          // 1-char names are usually bogus
  return /\p{L}/u.test(cleaned);                  // must contain at least one letter
};

// Returns true when the value looks like a valid Indian mobile number:
// either 10 digits (e.g. "9876543210") or 12 digits starting with "91"
// (e.g. "919876543210" / "+91 9876 543 210"). Non-digit characters
// (spaces, dashes, plus-signs) are stripped before checking — the
// helper only cares about the digit content.
export const isValidIndianMobile = (raw: string | null | undefined): boolean => {
  if (!raw) return false;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 12 && digits.startsWith("91")) return true;
  return false;
};

// Returns true if the input parses as a well-formed http/https URL
// with a real-looking domain. Empty input also returns true because
// most URL fields are optional — call sites that need a non-empty
// URL should also check the trim'd length.
//
// Stricter than just `new URL(...)`:
//   • Must start with `http://` or `https://` (otherwise `new URL`
//     accepts things like `mailto:foo` or `javascript:alert(1)`),
//   • Hostname must contain at least one DOT (so single-label hosts
//     like `https://localhost` or `https://12345` are rejected),
//   • Hostname must contain at least one LETTER (so `https://1.2.3`
//     and other pure-numeric "domains" are rejected — the user's
//     complaint about saving "12345" lands here).
export const isValidUrl = (raw: string | null | undefined): boolean => {
  const v = sanitizeText(raw).trim();
  if (!v) return true;
  if (!/^https?:\/\//i.test(v)) return false;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname;
    if (!host.includes(".")) return false;
    if (!/[a-zA-Z]/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
};

// =====================================================================
// INPUT FILTERS — used in onChange handlers to STRIP illegal characters
// the moment the user types them. This is what stops the form from
// quietly accepting garbage like "5454]]]]" or "[[[657[[5675" — those
// characters never make it into React state, the user just sees them
// not appear when they press the key.
//
// All filters also enforce a max length so paste-bombs are bounded.
// =====================================================================

// Human-name-shaped text: letters (any script), spaces, hyphens,
// apostrophes, periods, commas. Used for first/last names, family
// member name, village, designation, profession, role.
// Digits and brackets are stripped.
export const filterNameLike = (raw: string, maxLen = 80): string =>
  sanitizeText(raw)
    .replace(/[^\p{L}\s'.\-,]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen);

// STRICT letters-only filter: letters (any script) + spaces only.
// Digits, periods, commas, brackets and every other symbol are
// stripped. Used for fields where the data is purely a human/place
// name with no punctuation allowed — first_name, last_name,
// profession, role_designation, organization, village.
export const filterLettersOnly = (raw: string, maxLen = 80): string =>
  sanitizeText(raw)
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen);

// Family-member name filter: letters + spaces + AT MOST one period
// (so initials like "S. Krishna" survive but "S.K.R." or "S..K" does
// not). Periods after the first are silently dropped.
export const filterFamilyName = (raw: string, maxLen = 80): string => {
  // First strip everything except letters / spaces / periods,
  // then collapse whitespace, then keep only the first period.
  let cleaned = sanitizeText(raw)
    .replace(/[^\p{L}\s.]/gu, "")
    .replace(/\s{2,}/g, " ");
  const firstDotIdx = cleaned.indexOf(".");
  if (firstDotIdx !== -1) {
    // remove every additional '.' after the first one
    cleaned =
      cleaned.slice(0, firstDotIdx + 1) +
      cleaned.slice(firstDotIdx + 1).replace(/\./g, "");
  }
  return cleaned.slice(0, maxLen);
};

// Organisation-shaped text: same as name PLUS digits and a handful of
// business-name punctuation (& , ( ) / + #). Companies like "3M",
// "AT&T", "Tata Consultancy Services Pvt. Ltd." need to fit.
export const filterOrgLike = (raw: string, maxLen = 120): string =>
  sanitizeText(raw)
    .replace(/[^\p{L}\p{N}\s'.\-,&()/+#]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen);

// Social handle / URL shape: letters, digits, and the punctuation
// commonly seen in URLs and @handles. Strips spaces and brackets so
// "5675675[[" and "@john doe" both clean up correctly.
export const filterSocial = (raw: string, maxLen = 200): string =>
  sanitizeText(raw)
    .replace(/[^\p{L}\p{N}._\-/:@?=&#%+~]/gu, "")
    .slice(0, maxLen);

// =====================================================================
// SUBMIT-TIME VALIDATORS — verify the final value before saving. These
// catch values that passed the input filter (which only strips chars
// but doesn't enforce content) but still aren't real data — e.g. a
// village called ".." or a profession of ",,".
// =====================================================================

// Returns true when value contains at least one Unicode letter AND is
// long enough to be a real word. Whitespace-only, punctuation-only and
// digits-only values are rejected.
export const isValidNameLike = (raw: string | null | undefined): boolean => {
  const cleaned = sanitizeText(raw).trim();
  if (cleaned.length < 2) return false;
  return /\p{L}/u.test(cleaned);
};

// STRICT letters-only validator: only letters (any script) and
// spaces, ≥2 chars, ≥1 letter. Rejects "..." / "," / digits.
export const isValidLettersOnly = (raw: string | null | undefined): boolean => {
  const cleaned = sanitizeText(raw).trim();
  if (cleaned.length < 2) return false;
  if (!/\p{L}/u.test(cleaned)) return false;
  return /^[\p{L}\s]+$/u.test(cleaned);
};

// Family-name validator: letters + spaces, optionally with a single
// period (for initials like "S. Krishna"). Rejects digits, commas,
// multiple periods.
export const isValidFamilyName = (raw: string | null | undefined): boolean => {
  const cleaned = sanitizeText(raw).trim();
  if (cleaned.length < 2) return false;
  if (!/\p{L}/u.test(cleaned)) return false;
  if (!/^[\p{L}\s.]+$/u.test(cleaned)) return false;
  // Reject more than one period.
  const dotCount = (cleaned.match(/\./g) || []).length;
  return dotCount <= 1;
};

// Returns true when an organisation name contains at least one letter
// (so "3M" works but "12345" does not) and is at least 2 chars long.
export const isValidOrgLike = (raw: string | null | undefined): boolean => {
  const cleaned = sanitizeText(raw).trim();
  if (cleaned.length < 2) return false;
  return /\p{L}/u.test(cleaned);
};

// Social handle or URL. Empty is OK because these are optional fields.
// Non-empty must contain at least one letter (so "5675" alone is
// rejected) and match the allowed character set.
export const isValidSocial = (raw: string | null | undefined): boolean => {
  const cleaned = sanitizeText(raw).trim();
  if (!cleaned) return true;
  if (cleaned.length < 2) return false;
  if (!/\p{L}/u.test(cleaned)) return false;
  return /^[\p{L}\p{N}._\-/:@?=&#%+~]+$/u.test(cleaned);
};
