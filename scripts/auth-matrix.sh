#!/usr/bin/env bash
# =====================================================================
# auth-matrix.sh — authorization tests with real JWTs, every role.
#
# WHY THIS EXISTS
#   Nine slices were built and reported complete with no test that ran
#   as an admin, a cluster lead or a team lead. A code review then found
#   a one-request privilege escalation, an admin who could not read the
#   user list, and a member who could close their own case. Every one of
#   them is a two-line check here.
#
#   The rule this encodes: a permission is not enforced until something
#   has tried it and been refused.
#
# USAGE
#   scripts/auth-matrix.sh                 # against .env.local's project
#   EXPECT_FAIL_OK=1 scripts/auth-matrix.sh  # report only, exit 0
#
# Requires the fixtures created by supabase/seeds/staging_fixtures.sql:
#   t.us.a  member          no role
#   t.de.a  coordinator     country_coordinator, Germany
#   t.cl.a  cluster lead    cluster_lead, Germany cluster
#   t.tl.a  team lead       team_lead, Germany (read-only)
#   t.ae.a  admin           profiles.role = 'admin'
# =====================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
SB_URL=$(grep -m1 '^VITE_SUPABASE_URL' .env.local | cut -d= -f2- | tr -d '"'"'"' ')
SB_KEY=$(grep -m1 '^VITE_SUPABASE_ANON_KEY' .env.local | cut -d= -f2- | tr -d '"'"'"' ')
PW='StagingTest!2026'

if [ -z "$SB_URL" ] || [ -z "$SB_KEY" ]; then
  echo "No Supabase credentials in .env.local" >&2; exit 1
fi

tok() {
  curl -s "$SB_URL/auth/v1/token?grant_type=password" -H "apikey: $SB_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1@example.test\",\"password\":\"$PW\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))"
}

# check <description> <expected> <actual>
check() {
  if [ "$2" = "$3" ]; then
    printf '  \033[32m✓\033[0m %-56s %s\n' "$1" "$3"; PASS=$((PASS+1))
  else
    printf '  \033[31m✗\033[0m %-56s got %s, want %s\n' "$1" "$3" "$2"; FAIL=$((FAIL+1))
  fi
}

# HTTP status of a REST write
status() { # method url token body
  curl -s -o /dev/null -w '%{http_code}' -X "$1" "$SB_URL/rest/v1/$2" \
    -H "apikey: $SB_KEY" -H "Authorization: Bearer $3" \
    -H "Content-Type: application/json" ${4:+-d "$4"}
}

# "rows" or "none" from an RPC
rpc_rows() { # fn token body
  local body="${3:-}"
  [ -n "$body" ] || body='{}'
  curl -s -X POST "$SB_URL/rest/v1/rpc/$1" -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $2" -H "Content-Type: application/json" \
    -d "$body" \
  | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print('rows' if isinstance(d,list) and d else ('none' if isinstance(d,list) else 'error'))
except Exception: print('error')"
}

echo "Authorization matrix — $SB_URL"
MEMBER=$(tok t.us.a); COORD=$(tok t.de.a); CLUSTER=$(tok t.cl.a)
TEAM=$(tok t.tl.a);   ADMIN=$(tok t.ae.a)
for n in MEMBER COORD CLUSTER TEAM ADMIN; do
  [ -n "${!n}" ] || { echo "FATAL: no token for $n — are the fixtures seeded?" >&2; exit 1; }
done
MEMBER_ID=$(curl -s "$SB_URL/auth/v1/user" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $MEMBER" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo
echo "Privilege escalation — a member must not rewrite their own authority"
check "member sets role=admin"            403 "$(status PATCH "profiles?id=eq.$MEMBER_ID" "$MEMBER" '{"role":"admin"}')"
check "member sets status"                403 "$(status PATCH "profiles?id=eq.$MEMBER_ID" "$MEMBER" '{"status":"vip"}')"
check "member rewrites own email"         403 "$(status PATCH "profiles?id=eq.$MEMBER_ID" "$MEMBER" '{"email":"x@evil.test"}')"
check "member writes own epic_number"     403 "$(status PATCH "profiles?id=eq.$MEMBER_ID" "$MEMBER" '{"epic_number":"X1"}')"
check "member edits own city (allowed)"   204 "$(status PATCH "profiles?id=eq.$MEMBER_ID" "$MEMBER" '{"city_abroad":"San Jose"}')"

echo
echo "Protected columns stay unreadable"
for C in epic_number dob family_mobile has_vote; do
  R=$(curl -s "$SB_URL/rest/v1/profiles?select=$C&limit=1" -H "apikey: $SB_KEY" \
      -H "Authorization: Bearer $MEMBER" | python3 -c "
import sys,json
try: print(json.load(sys.stdin).get('code','readable'))
except Exception: print('readable')")
  check "member reads $C" 42501 "$R"
done

echo
echo "Case ownership — a member may file, never adjudicate"
# Effect, not status: PostgREST answers 204 for a write that RLS filtered
# to zero rows, which reads exactly like success. Create a real row, try
# to change it, then look at what the row actually says.
SR=$(curl -s -X POST "$SB_URL/rest/v1/student_requests" -H "apikey: $SB_KEY" \
      -H "Authorization: Bearer $MEMBER" -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{\"profile_id\":\"$MEMBER_ID\",\"request_type\":\"authmatrix\",\"description\":\"x\"}" \
     | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")
if [ -n "$SR" ]; then
  curl -s -o /dev/null -X PATCH "$SB_URL/rest/v1/student_requests?id=eq.$SR" \
    -H "apikey: $SB_KEY" -H "Authorization: Bearer $MEMBER" \
    -H "Content-Type: application/json" -d '{"status":"resolved"}'
  ST=$(curl -s "$SB_URL/rest/v1/student_requests?select=status&id=eq.$SR" \
        -H "apikey: $SB_KEY" -H "Authorization: Bearer $MEMBER" \
       | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['status'] if isinstance(d,list) and d else 'gone')
except Exception: print('error')")
  check "member cannot close own student request" open "$ST"
  curl -s -o /dev/null -X DELETE "$SB_URL/rest/v1/student_requests?id=eq.$SR" \
    -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN"
else
  check "member files a student request" created "failed"
fi

echo
echo "Scope — admin sees everything, team lead writes nothing"
check "admin reads chapter_roster"        rows "$(rpc_rows chapter_roster "$ADMIN")"
check "admin reads assistance_queue"      rows "$(rpc_rows assistance_queue "$ADMIN")"
check "coordinator reads roster"          rows "$(rpc_rows chapter_roster "$COORD")"
check "cluster lead reads roster"         rows "$(rpc_rows chapter_roster "$CLUSTER")"
check "team lead reads roster"            rows "$(rpc_rows chapter_roster "$TEAM")"
check "plain member reads roster"         none "$(rpc_rows chapter_roster "$MEMBER")"

echo
echo "Admin-only intelligence"
for F in intel_headline intel_geography intel_coverage_gaps intel_engagement; do
  check "member calls $F"                 none "$(rpc_rows "$F" "$MEMBER")"
  check "coordinator calls $F"            none "$(rpc_rows "$F" "$COORD")"
done
check "admin calls intel_headline"        rows "$(rpc_rows intel_headline "$ADMIN")"

echo
echo "Chapter map is admin-only"
check "coordinator creates a cluster"     403 "$(status POST clusters "$COORD" '{"name":"X","country":"Germany"}')"
check "member creates a cluster"          403 "$(status POST clusters "$MEMBER" '{"name":"Y","country":"Germany"}')"

echo
echo "Feedback"
# Same trap: deleting an id that matches nothing returns 204 whoever asks.
# Seed one row and check whether it survives.
curl -s -o /dev/null -X POST "$SB_URL/rest/v1/suggestions" -H "apikey: $SB_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"authmatrix canary","suggestion":"delete me","country":"Germany"}'
SG=$(curl -s "$SB_URL/rest/v1/suggestions?select=id&name=eq.authmatrix%20canary" \
      -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")
if [ -n "$SG" ]; then
  curl -s -o /dev/null -X DELETE "$SB_URL/rest/v1/suggestions?id=eq.$SG" \
    -H "apikey: $SB_KEY" -H "Authorization: Bearer $MEMBER"
  ALIVE=$(curl -s "$SB_URL/rest/v1/suggestions?select=id&id=eq.$SG" -H "apikey: $SB_KEY" \
           -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print('yes' if isinstance(d,list) and d else 'no')
except Exception: print('error')")
  check "member deletion leaves the row intact" yes "$ALIVE"

  curl -s -o /dev/null -X DELETE "$SB_URL/rest/v1/suggestions?id=eq.$SG" \
    -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN"
  GONE=$(curl -s "$SB_URL/rest/v1/suggestions?select=id&id=eq.$SG" -H "apikey: $SB_KEY" \
          -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print('no' if isinstance(d,list) and d else 'yes')
except Exception: print('error')")
  check "admin deletion removes the row" yes "$GONE"
fi

echo
echo "Bookings cannot be self-confirmed or oversold by direct write"
check "member confirms a booking"         403 "$(status PATCH "appointment_bookings?id=eq.00000000-0000-0000-0000-000000000000" "$MEMBER" '{"status":"confirmed"}')"
check "admin direct-confirms a booking"   403 "$(status PATCH "appointment_bookings?id=eq.00000000-0000-0000-0000-000000000000" "$ADMIN" '{"status":"confirmed"}')"

echo
echo "Click log is not readable"
for T in MEMBER COORD; do
  R=$(curl -s "$SB_URL/rest/v1/campaign_clicks?select=*&limit=1" -H "apikey: $SB_KEY" \
      -H "Authorization: Bearer ${!T}" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print('rows' if isinstance(d,list) and d else 'none')
except Exception: print('error')")
  check "$T reads campaign_clicks" none "$R"
done

# ── the checks a review found missing ────────────────────────────────
# Each block is here because something in it was broken and nothing
# looked. Read the comments as a list of past defects.
#
# All write checks assert EFFECT, never HTTP status: PostgREST answers
# 204 for an UPDATE or DELETE that RLS filtered to zero rows, which is
# indistinguishable from success. Two earlier assertions in this file
# got that wrong in both directions.

fieldval() { # table id field token
  curl -s "$SB_URL/rest/v1/$1?select=$3&id=eq.$2" -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $4" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['$3'] if isinstance(d,list) and d else 'ABSENT')
except Exception: print('ERROR')"
}

# Attempt a write, then report whether the stored value actually moved.
wrote() { # table id field newvalue token
  local before after
  before=$(fieldval "$1" "$2" "$3" "$ADMIN")
  curl -s -o /dev/null -X PATCH "$SB_URL/rest/v1/$1?id=eq.$2" -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $5" -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys;print(json.dumps({sys.argv[1]:sys.argv[2]}))" "$3" "$4")"
  after=$(fieldval "$1" "$2" "$3" "$ADMIN")
  [ "$before" = "$after" ] && echo "unchanged" || echo "CHANGED"
}

# Insert and report whether a row landed, by label.
inserted() { # table token json labelcol labelval
  curl -s -o /dev/null -X POST "$SB_URL/rest/v1/$1" -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $2" -H "Content-Type: application/json" -d "$3"
  curl -s "$SB_URL/rest/v1/$1?select=$4&$4=eq.$5" -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print('yes' if isinstance(d,list) and d else 'no')
except Exception: print('no')"
}

msg() { python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); r=d[0] if isinstance(d,list) and d else d
  print('ok' if r.get('ok') else 'refused')
except Exception: print('error')"; }

json() { python3 -c "import json,sys;print(json.dumps(json.loads(sys.argv[1])))" "$1"; }

VICTIM_ID=$(curl -s "$SB_URL/rest/v1/profiles?select=id&email=eq.t.de.b@example.test" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")
DE_CLUSTER=$(curl -s "$SB_URL/rest/v1/clusters?select=id&name=eq.Germany" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")
US_CLUSTER=$(curl -s "$SB_URL/rest/v1/clusters?select=id&country=eq.United%20States&limit=1" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")

echo
echo "Team lead is read-only"
# has_country_scope() was a READ predicate used by WRITE policies, so
# widening reads for team_lead silently gave them write access.
check "team lead cannot write another member's city" unchanged \
  "$(wrote profiles "$VICTIM_ID" city_abroad Nowhere "$TEAM")"
check "team lead cannot write another member's dob"  unchanged \
  "$(wrote profiles "$VICTIM_ID" dob 1900-01-01 "$TEAM")"
# JSON goes in a variable first. Nesting an escaped-quote literal inside
# "$( ... )" inside another "..." splits on the braces, which silently
# posted a fragment and made a passing check meaningless.
ROLE_JSON="{\"profile_id\":\"$VICTIM_ID\",\"role\":\"team_lead\",\"country\":\"Germany\",\"title\":\"AMT\"}"
RES=$(inserted member_roles "$TEAM" "$ROLE_JSON" title AMT)
check "team lead cannot mint a role" no "$RES"

echo
echo "Cluster lead is bounded by their own chapter"
OWN_JSON="{\"scope\":\"chapter\",\"platform\":\"telegram\",\"label\":\"AMown\",\"url\":\"https://example.com/o\",\"cluster_id\":\"$DE_CLUSTER\",\"country\":\"Germany\"}"
RES=$(inserted social_handles "$CLUSTER" "$OWN_JSON" label AMown)
check "cluster lead writes own chapter handle" yes "$RES"

CROSS_JSON="{\"scope\":\"chapter\",\"platform\":\"telegram\",\"label\":\"AMcross\",\"url\":\"https://example.com/x\",\"cluster_id\":\"$US_CLUSTER\",\"country\":\"United States\"}"
RES=$(inserted social_handles "$CLUSTER" "$CROSS_JSON" label AMcross)
check "cluster lead cannot write another chapter" no "$RES"
# The composite FK stops a handle naming one country and another
# country's cluster — a phishing vector on a table of invite links.
FK_JSON="{\"scope\":\"chapter\",\"platform\":\"telegram\",\"label\":\"AMfk\",\"url\":\"https://example.com/f\",\"cluster_id\":\"$US_CLUSTER\",\"country\":\"Germany\"}"
RES=$(inserted social_handles "$ADMIN" "$FK_JSON" label AMfk)
check "mismatched country/cluster is rejected" no "$RES"

echo
echo "Role delegation respects the rank ladder"
grant() { # token role country cluster
  local body
  body=$(python3 -c "
import json,sys
p={'p_profile_id':sys.argv[1],'p_role':sys.argv[2]}
if sys.argv[3]!='-': p['p_country']=sys.argv[3]
if sys.argv[4]!='-': p['p_cluster_id']=sys.argv[4]
print(json.dumps(p))" "$VICTIM_ID" "$2" "${3:--}" "${4:--}")
  curl -s -X POST "$SB_URL/rest/v1/rpc/grant_wing_role" -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$body" | msg
}
check "coordinator cannot clone a coordinator" refused "$(grant "$COORD" country_coordinator Germany)"
check "cluster lead cannot appoint a coordinator" refused "$(grant "$CLUSTER" country_coordinator Germany)"
check "team lead cannot appoint anyone"          refused "$(grant "$TEAM" team_lead Germany)"
check "cluster lead appoints in own chapter"     ok      "$(grant "$CLUSTER" team_lead Germany "$DE_CLUSTER")"

# revoke_wing_role() wrote to a GENERATED column and threw 428C9 on
# every call. Nothing exercised it, so it had never worked once.
NEW_ROLE=$(curl -s -X POST "$SB_URL/rest/v1/rpc/wing_roles_list" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d '{}' | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print(next((r['role_id'] for r in d if r['profile_id']=='$VICTIM_ID'), ''))
except Exception: print('')")
if [ -n "$NEW_ROLE" ]; then
  check "admin revokes a role" ok "$(curl -s -X POST "$SB_URL/rest/v1/rpc/revoke_wing_role" \
    -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" \
    -d "{\"p_role_id\":\"$NEW_ROLE\"}" | msg)"
else
  check "a role existed to revoke" found missing
fi

echo
echo "Protected columns are unreachable through an RPC too"
# admin_member_list() returns dob and family_* and once authorised any
# scoped role, handing them to coordinators and read-only team leads.
for T in MEMBER COORD CLUSTER TEAM; do
  check "$T reads admin_member_list" none "$(rpc_rows admin_member_list "${!T}")"
done
check "admin reads admin_member_list" rows "$(rpc_rows admin_member_list "$ADMIN")"

# Anything this section created.
curl -s -o /dev/null -X DELETE "$SB_URL/rest/v1/social_handles?label=in.(AMown,AMcross,AMfk)" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN"

echo
echo "Write scope on the RPCs, not just the tables"
# decide_booking() authorised through my_countries(), which includes
# read-only team leads. A team lead confirmed a booking.
#
# The slot comes from staging_fixtures.sql, not from whatever happened to
# be in the database. This block used to skip silently when it found
# nothing, so the suite could report success having tested none of it.
BOOK_SLOT=$(curl -s "$SB_URL/rest/v1/appointment_slots?select=id&title=eq.FIXTURE%20manual%20slot" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")
if [ -z "$BOOK_SLOT" ]; then
  echo "FATAL: the fixture appointment is missing. Re-run supabase/seeds/staging_fixtures.sql" >&2
  exit 1
fi
# The fixture slot is Germany-scoped, and MEMBER is the USA fixture —
# book_slot correctly refuses that, which is why this needs the German
# member. The FATAL below caught exactly that mismatch.
DE_MEMBER=$(tok t.de.b)
# Idempotent: a previous run leaves a confirmed booking, and book_slot
# correctly refuses a second. Cancel first so every run starts clean.
curl -s -o /dev/null -X POST "$SB_URL/rest/v1/rpc/cancel_booking" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $DE_MEMBER" -H "Content-Type: application/json" \
  -d "{\"p_slot_id\":\"$BOOK_SLOT\"}"
curl -s -o /dev/null -X POST "$SB_URL/rest/v1/rpc/book_slot" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $DE_MEMBER" -H "Content-Type: application/json" \
  -d "{\"p_slot_id\":\"$BOOK_SLOT\"}"
PEND=$(curl -s -X POST "$SB_URL/rest/v1/rpc/slot_bookings" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" \
  -d "{\"p_slot_id\":\"$BOOK_SLOT\"}" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print(next((x['booking_id'] for x in d if x['status']=='pending'), ''))
except Exception: print('')")
if [ -z "$PEND" ]; then
  echo "FATAL: could not create a pending booking to test against." >&2
  exit 1
fi
DECIDE="{\"p_booking_id\":\"$PEND\",\"p_decision\":\"confirmed\"}"
check "team lead cannot decide a booking" refused \
  "$(curl -s -X POST "$SB_URL/rest/v1/rpc/decide_booking" -H "apikey: $SB_KEY" \
     -H "Authorization: Bearer $TEAM" -H "Content-Type: application/json" -d "$DECIDE" | msg)"
check "team lead cannot read slot bookings" none \
  "$(rpc_rows slot_bookings "$TEAM" "{\"p_slot_id\":\"$BOOK_SLOT\"}")"
# JSON hoisted — nesting escaped quotes inside "$( ... )" splits on the
# braces and posts a fragment, which has produced a false pass twice now.
ATTEND_JSON="{\"p_booking_id\":\"$PEND\",\"p_attended\":true}"
ATTEND_RES=$(curl -s -X POST "$SB_URL/rest/v1/rpc/mark_attendance" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $TEAM" -H "Content-Type: application/json" -d "$ATTEND_JSON" | python3 -c "
import sys,json
try: print('refused_false' if json.load(sys.stdin) is False else 'ALLOWED')
except Exception: print('error')")
check "team lead cannot mark attendance" refused_false "$ATTEND_RES"
check "admin can decide a booking" ok \
  "$(curl -s -X POST "$SB_URL/rest/v1/rpc/decide_booking" -H "apikey: $SB_KEY" \
     -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d "$DECIDE" | msg)"
# Release the seat, or the fixture slot fills over repeated runs.
curl -s -o /dev/null -X POST "$SB_URL/rest/v1/rpc/cancel_booking" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $DE_MEMBER" -H "Content-Type: application/json" \
  -d "{\"p_slot_id\":\"$BOOK_SLOT\"}"

echo
echo "Appointments cannot be published outside their scope"
# cluster_id and country were stored independently with no consistency
# rule, so a Germany chapter lead published a wing-wide slot and a
# USA-scoped one, and USA members saw both.
FAR=$(python3 -c "
import datetime as d
n=d.datetime.now(d.timezone.utc)+d.timedelta(days=40)
print(n.strftime('%Y-%m-%dT%H:%M:%SZ'), (n+d.timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ'))")
FSTART=$(echo "$FAR" | cut -d' ' -f1); FEND=$(echo "$FAR" | cut -d' ' -f2)
GLOBAL_JSON="{\"title\":\"AMglobal\",\"starts_at\":\"$FSTART\",\"ends_at\":\"$FEND\",\"capacity\":1,\"mode\":\"auto\",\"cluster_id\":\"$DE_CLUSTER\",\"country\":null,\"is_published\":true}"
check "chapter lead cannot publish wing-wide" no \
  "$(inserted appointment_slots "$CLUSTER" "$GLOBAL_JSON" title AMglobal)"
XC_JSON="{\"title\":\"AMxcountry\",\"starts_at\":\"$FSTART\",\"ends_at\":\"$FEND\",\"capacity\":1,\"mode\":\"auto\",\"cluster_id\":\"$DE_CLUSTER\",\"country\":\"United States\",\"is_published\":true}"
check "chapter lead cannot publish cross-country" no \
  "$(inserted appointment_slots "$CLUSTER" "$XC_JSON" title AMxcountry)"
OK_JSON="{\"title\":\"AMchapter\",\"starts_at\":\"$FSTART\",\"ends_at\":\"$FEND\",\"capacity\":1,\"mode\":\"auto\",\"cluster_id\":\"$DE_CLUSTER\",\"country\":\"Germany\",\"is_published\":true}"
check "chapter lead publishes in own chapter" yes \
  "$(inserted appointment_slots "$CLUSTER" "$OK_JSON" title AMchapter)"
check "and can list it in slots_i_manage" yes \
  "$(rpc_rows slots_i_manage "$CLUSTER" | sed 's/rows/yes/;s/none/no/')"
curl -s -o /dev/null -X DELETE "$SB_URL/rest/v1/appointment_slots?title=in.(AMglobal,AMxcountry,AMchapter)" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN"

echo
echo "Assistance content is not editable by a read-only role"
# grievances_update and student_requests_update used READ predicates, so
# a team lead could not adjudicate a case but could rewrite what it said.
# Filed by the GERMANY member: the coordinator under test covers
# Germany, so a grievance from the USA member would be refused for the
# right reason and fail the positive check for the wrong one.
curl -s -o /dev/null -X DELETE "$SB_URL/rest/v1/grievances?subject=eq.AMgrv" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN"
DE_MEMBER=${DE_MEMBER:-$(tok t.de.b)}
MEM_ID=$(curl -s "$SB_URL/auth/v1/user" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $DE_MEMBER" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
GRV_JSON="{\"profile_id\":\"$MEM_ID\",\"subject\":\"AMgrv\",\"description\":\"original\"}"
curl -s -o /dev/null -X POST "$SB_URL/rest/v1/grievances" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $DE_MEMBER" -H "Content-Type: application/json" -d "$GRV_JSON"
# Newest first: a stray AMgrv from an aborted earlier run (owned by a
# different member, in a different country) would otherwise be picked
# and the positive check would fail for the wrong reason.
GRV=$(curl -s "$SB_URL/rest/v1/grievances?select=id&subject=eq.AMgrv&order=created_at.desc&limit=1" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")
if [ -z "$GRV" ]; then
  echo "FATAL: could not create a grievance to test against." >&2
  exit 1
fi
check "team lead cannot rewrite a grievance" unchanged \
  "$(wrote grievances "$GRV" subject "EDITED BY TEAM" "$TEAM")"
# The positive half. Denial alone would still pass if the policy denied
# everyone, which would be a different bug wearing the same green tick.
check "coordinator CAN edit a grievance" CHANGED \
  "$(wrote grievances "$GRV" subject "EDITED BY COORD" "$COORD")"
curl -s -o /dev/null -X DELETE "$SB_URL/rest/v1/grievances?id=eq.$GRV" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN"

echo
echo "Rank is computed for the scope being acted on"
# THE ORIGINAL EXPLOIT. t.de.a holds country_coordinator in Germany AND
# cluster_lead in the USA (staging_fixtures.sql). my_role_rank() took
# the best rank held ANYWHERE, so coordinator rank (2) could be
# presented against USA cluster scope and appoint another chapter lead
# there. Without this check the scoped helper could be swapped back for
# the global one and every other assertion would stay green.
US_CL=$(curl -s "$SB_URL/rest/v1/clusters?select=id&country=eq.United%20States&order=name&limit=1" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')
except Exception: print('')")
check "dual-role user cannot use Germany rank in the USA" refused \
  "$(grant "$COORD" cluster_lead "United States" "$US_CL")"
check "dual-role user still appoints in their own country" ok \
  "$(grant "$COORD" team_lead Germany)"
DUAL_ROLE=$(curl -s -X POST "$SB_URL/rest/v1/rpc/wing_roles_list" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d '{}' | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print(next((r['role_id'] for r in d if r['profile_id']=='$VICTIM_ID'), ''))
except Exception: print('')")
[ -n "$DUAL_ROLE" ] && curl -s -o /dev/null -X POST "$SB_URL/rest/v1/rpc/revoke_wing_role" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" \
  -d "{\"p_role_id\":\"$DUAL_ROLE\"}"

# my_role_rank() took the best rank held ANYWHERE, so coordinator rank
# in one country could be presented against cluster scope in another.
check "cluster lead appoints team lead in own chapter" ok \
  "$(grant "$CLUSTER" team_lead Germany "$DE_CLUSTER")"
CL_ROLE=$(curl -s -X POST "$SB_URL/rest/v1/rpc/wing_roles_list" -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $CLUSTER" -H "Content-Type: application/json" -d '{}' | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print(next((r['role_id'] for r in d if r['cluster_id'] and r['role']=='team_lead'), ''))
except Exception: print('')")
# wing_roles_list() excluded cluster scope, so a chapter lead could
# create a role and never see it again to revoke it.
check "chapter lead sees the role they granted" found \
  "$([ -n "$CL_ROLE" ] && echo found || echo missing)"
if [ -n "$CL_ROLE" ]; then
  check "chapter lead revokes it" ok \
    "$(curl -s -X POST "$SB_URL/rest/v1/rpc/revoke_wing_role" -H "apikey: $SB_KEY" \
       -H "Authorization: Bearer $CLUSTER" -H "Content-Type: application/json" \
       -d "{\"p_role_id\":\"$CL_ROLE\"}" | msg)"
fi

echo
printf 'passed %d, failed %d\n' "$PASS" "$FAIL"

# A block that returns early or skips would otherwise leave the suite
# green with fewer checks. Assert the count as well as the result.
EXPECTED=${EXPECTED_CHECKS:-64}
TOTAL=$((PASS + FAIL))
if [ "$TOTAL" -ne "$EXPECTED" ]; then
  printf '\033[31mFAIL\033[0m ran %d checks, expected %d — a block was skipped.\n' \
    "$TOTAL" "$EXPECTED"
  printf 'If you added or removed checks, update EXPECTED_CHECKS.\n'
  exit 1
fi

[ "$FAIL" -eq 0 ] || [ "${EXPECT_FAIL_OK:-0}" = "1" ]
