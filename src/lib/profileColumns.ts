/**
 * The columns AuthContext requests for the signed-in member's profile.
 *
 * WHY THIS IS ITS OWN FILE
 *   `SELECT *` is not usable here: dob, family_* and the voter fields
 *   are revoked from the `authenticated` role at the column level
 *   (20260804094500, 20260805111000), and Postgres rejects the entire
 *   statement with 42501 if a restricted column is named.
 *
 *   So the list must be explicit — and it must be explicit in exactly
 *   ONE place. It was previously duplicated in the smoke test, which
 *   meant the test could keep passing while the app drifted. The whole
 *   point of that test is to notice when a column the app depends on
 *   goes missing; a private copy of the list defeats it.
 *
 *   scripts/smoke-member-journey.mjs parses this file rather than
 *   keeping its own copy. Keep the array a plain list of string
 *   literals so that stays possible.
 *
 * ANYTHING RESTRICTED GOES THROUGH AN RPC
 *   my_private_profile() for the member's own dob/family fields;
 *   admin_member_list() for admin screens. Never add a restricted
 *   column to this list — the query would start failing for everyone.
 */
export const PROFILE_COLUMNS_LIST = [
  "id",
  "public_user_code",
  "first_name",
  "last_name",
  "full_name",
  "email",
  "mobile_number",
  "whatsapp_number",
  "gender",
  "country_of_residence",
  "state_abroad",
  "city_abroad",
  "indian_state",
  "district",
  "assembly_constituency",
  "mandal",
  "village",
  "profession",
  "organization",
  "designation",
  "occupation",
  "contribution",
  // Multi-select from the prototype. Granted explicitly in
  // 20260805230000 — a column added later is NOT covered by the
  // existing column grants, so it had to be named to be readable.
  "contribution_areas",
  // Free text from My Profile's "Tell us more". Distinct from
  // `contribution`, which is the fixed-category select from signup —
  // see 20260805231000 for why they must not be conflated.
  "contribution_note",
  "participate_campaign",
  "suggestions",
  "facebook_id",
  "twitter_id",
  "instagram_id",
  "linkedin_id",
  "profile_photo",
  "referral_code",
  "referred_by",
  "role",
  "status",
  "created_at",
  "updated_at",
  // ProtectedRoute gates on this. Omitting it once made every user —
  // including members who had already finished — redirect to
  // /complete-profile forever.
  "onboarding_completed_at",
];

export const PROFILE_COLUMNS = PROFILE_COLUMNS_LIST.join(", ");
