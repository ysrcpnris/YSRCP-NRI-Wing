#!/usr/bin/env bash
# =====================================================================
# repair_migration_history.sh
#
# Production applied the original 49 migrations under their old
# new_NN_*.sql names. Renaming them to <timestamp>_name.sql made the
# repo reproducible and left production's supabase_migrations table
# describing files that no longer exist — so `supabase db push` would
# try to replay everything.
#
# This marks the pre-existing ones as already applied, so a push only
# runs what is genuinely new.
#
# Dry run by default. Nothing is written without --apply.
#
#   scripts/audits/repair_migration_history.sh
#   scripts/audits/repair_migration_history.sh --apply
#
# The review asked for this to exist as a script with explicit versions
# and pre/post assertions rather than a verbal instruction. It does not
# guess: it reads the versions off disk and refuses if what it finds
# does not match what it expects.
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

echo "Migration history repair — $([ $APPLY -eq 1 ] && echo 'APPLY' || echo 'dry run')"
echo

# The cut-off. Everything at or before this timestamp existed in
# production under its old filename; everything after is new work from
# the develop branch and MUST still run.
CUTOFF="20260803000000"

# mapfile is bash 4+; macOS ships 3.2, so build the lists portably.
PRE=(); NEW=()
while IFS= read -r v; do PRE+=("$v"); done < <(
  ls supabase/migrations/*.sql | xargs -n1 basename \
    | sed 's/_.*//' | awk -v c="$CUTOFF" '$1 <= c' | sort)
while IFS= read -r v; do NEW+=("$v"); done < <(
  ls supabase/migrations/*.sql | xargs -n1 basename \
    | sed 's/_.*//' | awk -v c="$CUTOFF" '$1 > c' | sort)

echo "  ${#PRE[@]} migrations at or before $CUTOFF — mark as applied"
echo "  ${#NEW[@]} migrations after  $CUTOFF — leave alone, these must run"
echo

# Assertion: the pre-cutoff count must match what production actually
# ran. If this is wrong, stop — marking the wrong set applied would skip
# a migration production never had.
#
# 47, not 49. The figure is the number of files renamed in commit
# 8b4a2c5 "Rename migrations to timestamp format":
#   git show --stat 8b4a2c5 | grep -c '=>'   ->  47
# Earlier notes in this project said 49 from memory. This assertion is
# what caught that, which is the whole reason it is here.
EXPECTED_PRE=47
if [ "${#PRE[@]}" -ne "$EXPECTED_PRE" ]; then
  echo "REFUSING: expected $EXPECTED_PRE pre-existing migrations, found ${#PRE[@]}." >&2
  echo "Someone has added or removed a migration below the cutoff." >&2
  echo "Check the list before changing EXPECTED_PRE." >&2
  exit 1
fi

if [ $APPLY -eq 0 ]; then
  echo "Would run, for each of the ${#PRE[@]}:"
  echo "  supabase migration repair --status applied <version>"
  echo
  echo "First three and last three:"
  printf '  %s\n' "${PRE[0]}" "${PRE[1]}" "${PRE[2]}"
  echo "  …"
  n=${#PRE[@]}
  printf '  %s\n' "${PRE[$((n-3))]}" "${PRE[$((n-2))]}" "${PRE[$((n-1))]}"
  echo
  echo "Re-run with --apply to write. Do this with the user present."
  exit 0
fi

read -rp "Mark ${#PRE[@]} migrations as applied on the LINKED project? [type YES] " ok
[ "$ok" = "YES" ] || { echo "Aborted."; exit 1; }

for v in "${PRE[@]}"; do
  echo "  repairing $v"
  supabase migration repair --status applied "$v"
done

echo
echo "Post-check — remote and local should now agree on the pre-cutoff set:"
supabase migration list
echo
echo "Now run: supabase db push --dry-run"
echo "It should list only the ${#NEW[@]} migrations after $CUTOFF."
