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

// Returns true if the input parses as a well-formed http/https URL.
// Empty input also returns true because most URL fields on the profile
// are optional — call sites that need a non-empty URL should also
// check the trim'd length.
export const isValidUrl = (raw: string | null | undefined): boolean => {
  const v = sanitizeText(raw).trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
