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

  const [delta, setDelta] = useState<number>(0);
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

  const loadLedger = async (u: UserRow) => {
    setSelected(u);
    setLedgerLoading(true);
    setErr(null);
    setInfo(null);
    const { data } = await supabase
      .from("credit_transactions")
      .select("id, user_id, delta, reason, note, ref_id, created_at")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLedger((data || []) as LedgerEntry[]);
    setLedgerLoading(false);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, public_user_code, first_name, last_name, email, credits_balance")
      .eq("id", selected.id)
      .single();
    if (data) setSelected(data as UserRow);
    await loadLedger(selected);
  };

  const postAdjustment = async () => {
    if (!selected) return;
    setErr(null);
    setInfo(null);
    if (!Number.isFinite(delta) || delta === 0) {
      setErr("Enter a non-zero credit amount (can be negative).");
      return;
    }
    // Client-side guard: DB also enforces via a CHECK constraint, but we give
    // a friendlier message here than the raw constraint error.
    const current = selected.credits_balance ?? 0;
    if (delta < 0 && current + delta < 0) {
      setErr(
        `Not enough credits: user has ${current}, this would drop balance to ${current + delta}.`
      );
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("credit_transactions").insert({
      user_id: selected.id,
      delta,
      reason: "admin_adjustment",
      note: note.trim() || null,
    });
    if (error) {
      // Translate the DB CHECK message into something human-readable.
      if (/profiles_credits_nonneg/i.test(error.message)) {
        setErr(
          "Not enough credits for this adjustment — balance cannot go below zero."
        );
      } else {
        setErr(error.message);
      }
    } else {
      setInfo(`Posted ${delta > 0 ? "+" : ""}${delta} credits.`);
      setDelta(0);
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
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                Current balance
              </p>
              <p className="text-3xl font-extrabold text-amber-700">
                ⚡ {selected.credits_balance ?? 0}
              </p>
            </div>
          </div>

          {/* ADJUSTMENT FORM */}
          <div className="bg-gray-50 border rounded-lg p-4 mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
              Post adjustment
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setDelta((d) => d - 10)}
                className="p-2 border rounded hover:bg-white"
                title="-10"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                className="border p-2 rounded w-28 text-center font-bold"
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
              />
              <button
                onClick={() => setDelta((d) => d + 10)}
                className="p-2 border rounded hover:bg-white"
                title="+10"
              >
                <Plus size={14} />
              </button>
              <input
                className="flex-1 min-w-[200px] border p-2 rounded"
                placeholder="Reason / note (shown to the user)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                onClick={postAdjustment}
                disabled={posting || delta === 0}
                className="bg-primary-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post"}
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
