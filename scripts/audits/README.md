# Production audits and repairs

Read-only unless a filename says otherwise. Run these **before** any
production migration work, and keep the output.

## `check_prod_constituencies.sql` — READ ONLY

Looks for member records damaged by the unanchored `normalizeAssembly`
regex, which ran when a profile was loaded into the edit form and so
wrote its own corruption back on save:

```
Achanta      -> hanta
Macherla     -> Mherla
Mandalapalle -> apalle
```

The regex is fixed (anchored to a trailing whole word). **That stops new
corruption and repairs nothing already stored**, which is what this
script is for.

```bash
supabase db query --linked --file scripts/audits/check_prod_constituencies.sql
```

Reading the output:

- **`LIKELY CORRUPTED`** is the real signal. A stored value that becomes
  a valid constituency when the stripped `ac` is put back is very
  unlikely to be coincidence.
- **`SUSPICIOUSLY SHORT`** is advisory only. Verified false positives on
  staging: `Tuni` and `Undi` are genuine four-letter constituencies.

Repair is `update profiles set assembly_constituency = <probably_meant>`
per value — but get sign-off on each one first. These are live member
records and the mapping is a judgement, not a rule.

## `repair_migration_history.sh` — WRITES, needs `--apply`

Production ran the original 47 migrations under their old `new_NN_*`
filenames. (47 is the file count in the rename commit `8b4a2c5`;
earlier notes said 49 from memory, and the script's assertion is what
caught that.) They were renamed to timestamps so environments are
reproducible, which means production's `supabase_migrations` table no
longer matches the files on disk. Until that is reconciled,
`supabase db push` against production will try to re-run everything.

Defaults to a dry run and prints exactly what it would mark. Run the dry
run, read it, then re-run with `--apply`.

```bash
scripts/audits/repair_migration_history.sh              # dry run
scripts/audits/repair_migration_history.sh --apply      # writes
```

Do this with the user present. It is the one step here that cannot be
undone by re-running it.
