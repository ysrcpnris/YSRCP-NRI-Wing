import React, { useEffect, useState } from "react";
import { Search, Plus, Minus } from "lucide-react";
import { supabase } from "../lib/supabase";

type UserRow = {
  id: string;
  public_user_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  credits_balance: number | null;
};

type LedgerEntry = {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  note: string | null;
  ref_id: string | null;
  created_at: string;
};

export default function Credits() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<UserRow | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Adjustment form: explicit modes for the three valid admin operations.
  //   add     -> grant N more credits
  //   reduce  -> deduct N credits (capped at current balance, never below 0)
  //   reset   -> single click: deducts the entire balance, taking it to 0
  // Using modes instead of a signed delta avoids the UX trap where admins
  // didn't realise they could type a negative number into the input.
  const [mode, setMode] = useState<"add" | "reduce" | "reset">("add");
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, public_user_code, first_name, last_name, email, credits_balance")
      .or(
        `public_user_code.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
      )
      .limit(15);
    setResults((data || []) as UserRow[]);
    setSearching(false);
  };

  // Fetch the ledger only (no setSelected). Used both on first user pick and
  // for refreshes after an admin adjustment.
  const fetchLedger = async (userId: string) => {
    setLedgerLoading(true);
    const { data } = await supabase
      .from("credit_transactions")
      .select("id, user_id, delta, reason, note, ref_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLedger((data || []) as LedgerEntry[]);
    setLedgerLoading(false);
  };

  // Selecting a user from the search results: set as selected + load ledger.
  const loadLedger = async (u: UserRow) => {
    setSelected(u);
    setErr(null);
    setInfo(null);
    await fetchLedger(u.id);
  };

  // Re-fetch BOTH the selected profile (so credits_balance updates) and the
  // ledger. Previously this also called loadLedger(selected) which would
  // setSelected back to the stale value — that's why the balance card
  // wasn't updating after add / reduce / reset. Now we update them
  // independently so the freshly-fetched profile always wins.
  const refreshSelected = async () => {
    if (!selected) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, public_user_code, first_name, last_name, email, credits_balance")
      .eq("id", selected.id)
      .single();
    if (data) setSelected(data as UserRow);
    await fetchLedger(selected.id);
  };

  const postAdjustment = async () => {
    if (!selected) return;
    setErr(null);
    setInfo(null);

    const current = selected.credits_balance ?? 0;
    let delta = 0;
    let successMessage = "";
    let txReason: "admin_adjustment" | "admin_reset" = "admin_adjustment";
    let txNote: string | null = note.trim() || null;

    if (mode === "reset") {
      // Reset to 0: post a single negative entry equal to the current balance.
      // The ledger keeps the audit trail (no rows deleted) — only the cached
      // balance hits zero via the existing trigger. We use a distinct reason
      // ('admin_reset') so the user sees a clear "Balance reset" line in
      // their activity instead of a generic "Admin adjustment".
      if (current === 0) {
        setErr("Balance is already 0 — nothing to reset.");
        return;
      }
      if (!confirm(`Reset balance to 0 by deducting ${current} credits? This cannot be undone.`)) {
        return;
      }
      delta = -current;
      txReason = "admin_reset";
      txNote = txNote || "Balance reset to 0 by admin";
      successMessage = `Reset balance to 0 (deducted ${current} credits).`;
    } else {
      const amt = Math.abs(Math.floor(Number(amount) || 0));
      if (!amt) {
        setErr("Enter an amount greater than zero.");
        return;
      }
      if (mode === "reduce" && amt > current) {
        setErr(
          `Cannot reduce by ${amt} — user only has ${current} credits. Use Reset to 0 to clear them all.`
        );
        return;
      }
      delta = mode === "reduce" ? -amt : amt;
      successMessage = mode === "reduce"
        ? `Reduced ${amt} credits.`
        : `Added ${amt} credits.`;
    }

    setPosting(true);
    const { error } = await supabase.from("credit_transactions").insert({
      user_id: selected.id,
      delta,
      reason: txReason,
      note: txNote,
    });
    if (error) {
      if (/profiles_credits_nonneg/i.test(error.message)) {
        setErr("Balance cannot go below zero.");
      } else {
        setErr(error.message);
      }
    } else {
      setInfo(successMessage);
      setAmount(0);
      setNote("");
      await refreshSelected();
    }
    setPosting(false);
  };

  useEffect(() => {
    const t = setTimeout(runSearch, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary-600 mb-1">Credits</h1>
      <p className="text-gray-500 mb-6">
        Look up a user, audit their ledger, and post credit adjustments. Every change
        is an append-only ledger row — reverse mistakes by posting a negative adjustment.
      </p>

      {/* SEARCH */}
      <div className="bg-white border rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          <input
            className="flex-1 border p-2 rounded"
            placeholder="Search by User ID, email, or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {searching && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
        {!searching && query && results.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">No matches.</p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100 border rounded-lg max-h-64 overflow-y-auto">
            {results.map((u) => (
              <li
                key={u.id}
                onClick={() => loadLedger(u)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—"}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono truncate">
                    {u.public_user_code || u.id}
                  </p>
                </div>
                <span className="text-amber-700 font-bold text-xs whitespace-nowrap">
                  ⚡ {u.credits_balance ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* DETAIL */}
      {selected && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-lg font-bold">
                {[selected.first_name, selected.last_name].filter(Boolean).join(" ") ||
                  selected.email ||
                  "—"}
              </p>
              <p className="text-[11px] font-mono text-gray-500">
                {selected.public_user_code || selected.id}
              </p>
              <p className="text-[11px] text-gray-400">{selected.email}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                  Current balance
                </p>
                <button
                  onClick={refreshSelected}
                  className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 inline-flex items-center gap-1"
                  title="Refresh balance and ledger"
                >
                  ↻ Refresh
                </button>
              </div>
              <p className="text-3xl font-extrabold text-amber-700">
                ⚡ {selected.credits_balance ?? 0}
              </p>
            </div>
          </div>

          {/* ADJUSTMENT FORM */}
          {(() => {
            const current = selected.credits_balance ?? 0;
            // For reduce mode, cap the input at the current balance — admin
            // literally cannot type a number larger than what the user has.
            const maxForMode = mode === "reduce" ? current : 1_000_000;
            const cappedAmount = Math.min(amount, maxForMode);
            const newBalance =
              mode === "reset"
                ? 0
                : mode === "reduce"
                ? current - cappedAmount
                : current + cappedAmount;

            const accent =
              mode === "reduce"
                ? "bg-red-600 hover:bg-red-700"
                : mode === "reset"
                ? "bg-gray-800 hover:bg-gray-900"
                : "bg-emerald-600 hover:bg-emerald-700";

            return (
              <div className="bg-gray-50 border rounded-lg p-4 mb-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">
                  Adjust credits
                </p>

                {/* MODE TOGGLE — three clear modes */}
                <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden mb-3">
                  <button
                    type="button"
                    onClick={() => setMode("add")}
                    className={`px-4 py-2 text-sm font-bold inline-flex items-center gap-1 transition ${
                      mode === "add"
                        ? "bg-emerald-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Plus size={14} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("reduce")}
                    disabled={current === 0}
                    className={`px-4 py-2 text-sm font-bold inline-flex items-center gap-1 transition border-l border-gray-300 disabled:opacity-40 ${
                      mode === "reduce"
                        ? "bg-red-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={current === 0 ? "User has no credits to reduce" : ""}
                  >
                    <Minus size={14} /> Reduce
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    disabled={current === 0}
                    className={`px-4 py-2 text-sm font-bold inline-flex items-center gap-1 transition border-l border-gray-300 disabled:opacity-40 ${
                      mode === "reset"
                        ? "bg-gray-800 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={current === 0 ? "Already at 0" : "Wipe all credits to 0"}
                  >
                    Reset to 0
                  </button>
                </div>

                {/* AMOUNT INPUT (hidden in reset mode) + LIVE PREVIEW */}
                {mode === "reset" ? (
                  <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded p-3 mb-3">
                    This will deduct{" "}
                    <span className="font-bold text-amber-700">⚡ {current}</span>{" "}
                    credits, taking the balance to{" "}
                    <span className="font-bold text-gray-900">⚡ 0</span>. The
                    ledger entry is preserved for audit.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center mb-3">
                    <input
                      type="number"
                      min={1}
                      max={maxForMode}
                      step={1}
                      className="border p-2 rounded w-32 text-center font-bold"
                      placeholder="Amount"
                      value={amount || ""}
                      onChange={(e) => {
                        const raw = Math.abs(Math.floor(Number(e.target.value) || 0));
                        // Hard cap on reduce mode so admins never type more than the user has.
                        setAmount(mode === "reduce" ? Math.min(raw, current) : raw);
                      }}
                    />
                    {(mode === "reduce"
                      ? [10, 25, 50, current].filter((n) => n > 0 && n <= current)
                      : [10, 25, 50, 100]
                    ).map((n, i) => (
                      <button
                        key={`${n}-${i}`}
                        type="button"
                        onClick={() => setAmount(n)}
                        className="px-2.5 py-1 text-xs font-semibold border border-gray-300 rounded hover:bg-white"
                      >
                        {n}
                        {mode === "reduce" && n === current ? " (all)" : ""}
                      </button>
                    ))}
                    {amount > 0 && (
                      <span className="text-xs text-gray-600 ml-2">
                        New balance:{" "}
                        <b className="text-amber-700">⚡ {newBalance}</b>
                      </span>
                    )}
                  </div>
                )}

                {/* NOTE + SUBMIT */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className="flex-1 min-w-[200px] border p-2 rounded"
                    placeholder="Reason / note (shown to the user)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button
                    onClick={postAdjustment}
                    disabled={
                      posting ||
                      (mode !== "reset" && !amount) ||
                      (mode === "reset" && current === 0)
                    }
                    className={`px-4 py-2 rounded text-white font-semibold disabled:opacity-50 ${accent}`}
                  >
                    {posting
                      ? "Posting…"
                      : mode === "reset"
                      ? "Reset to 0"
                      : mode === "reduce"
                      ? `Reduce ${amount || 0}`
                      : `Add ${amount || 0}`}
                  </button>
                </div>

                {err && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded mt-2">
                    {err}
                  </p>
                )}
                {info && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 p-2 rounded mt-2">
                    {info}
                  </p>
                )}
              </div>
            );
          })()}

          {/* LEDGER */}
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Ledger (latest 50)
          </p>
          {ledgerLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">Note</th>
                    <th className="px-3 py-2 text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-blue-50">
                      <td className="px-3 py-2 text-gray-500">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 capitalize">{e.reason.replace("_", " ")}</td>
                      <td className="px-3 py-2 text-gray-600">{e.note || "-"}</td>
                      <td
                        className={`px-3 py-2 text-right font-bold ${
                          e.delta >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {e.delta >= 0 ? "+" : ""}
                        {e.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
