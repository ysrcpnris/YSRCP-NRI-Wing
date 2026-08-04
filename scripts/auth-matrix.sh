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
printf 'passed %d, failed %d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || [ "${EXPECT_FAIL_OK:-0}" = "1" ]
