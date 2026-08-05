/**
 * The top-level service_type values. Fixed in practice — the
 * service_categories table's own migration comment notes there is no
 * CHECK constraint because adding a 5th type is meant to be a UI
 * change — but the categories and options WITHIN each type are
 * admin-managed via the service_categories / service_options tables,
 * not hardcoded. Fetch those live; do not hardcode a copy here.
 *
 * (This file used to also carry a hardcoded category/option tree. That
 * tree was the ORIGINAL version, superseded when service_categories /
 * service_options were introduced — Dashboard.tsx's own comment reads
 * "Replaces what used to live in SERVICE_CONFIG.subs." Keeping it here
 * would have meant a new screen quietly reading stale, non-admin-
 * editable categories instead of the real ones.)
 */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  student: "Student Support",
  legal: "Legal Advisor",
  career: "Career Coach",
  local: "Local Connector",
};
