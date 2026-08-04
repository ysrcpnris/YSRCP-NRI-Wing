import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, Clock, Send } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * The coordinator's assistance queue.
 *
 * Scoped by assistance_queue(), which reads my_countries(). A
 * coordinator sees their own countries' cases; a member with no role
 * gets an empty list. Responding goes through respond_to_case(), which
 * re-checks scope server-side and returns false without writing if the
 * case belongs elsewhere — so nothing here depends on the client
 * behaving.
 *
 * Oldest first, deliberately. A queue sorted newest-first buries the
 * case that has been waiting longest, which is the one most likely to
 * have lost the member's trust already.
 */

type Case = {
  kind: "grievance" | "student";
  id: string;
  reference_no: string | null;
  title: string | null;
  detail: string | null;
  status: string;
  response: string | null;
  member_id: string;
  member_name: string | null;
  member_email: string | null;
  member_mobile: string | null;
  member_country: string | null;
  member_city: string | null;
  created_at: string;
  updated_at: string | null;
  total_count: number;
};

const FILTERS = [
  { key: null as string | null, label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function CaseCard({ c, onDone }: { c: Case; onDone: () => void }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const age = daysOpen(c.created_at);
  const stale = c.status !== "resolved" && c.status !== "closed" && age >= 14;

  const respond = async (status: string) => {
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("respond_to_case", {
      p_kind: c.kind,
      p_id: c.id,
      p_status: status,
      p_response: reply.trim() || null,
    });
    setSaving(false);
    // The function returns false rather than throwing when the case is
    // out of scope — a silent no-op would look like success.
    if (err || data === false) {
      setError(
        err
          ? "Something went wrong saving that."
          : "This case is outside the countries you cover."
      );
      return;
    }
    setReplying(false);
    setReply("");
    onDone();
  };

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden ${
        stale ? "border-l-4 border-l-rose-500 border-gray-200" : "border-gray-200"
      }`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {c.kind === "grievance" ? "Grievance" : "Student assistance"}
          </span>
          {c.reference_no && (
            <span className="text-xs font-mono text-gray-400">
              {c.reference_no}
            </span>
          )}
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
              c.status === "resolved"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : c.status === "in_progress"
                ? "bg-primary-50 text-primary-800 border-primary-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {c.status === "in_progress" ? "In progress" : c.status}
          </span>
          <span
            className={`text-xs inline-flex items-center gap-1 ${
              stale ? "text-rose-700 font-bold" : "text-gray-400"
            }`}
          >
            <Clock size={11} />
            {age === 0 ? "today" : `${age}d`}
          </span>
        </div>

        <p className="font-bold text-gray-900">{c.title || "—"}</p>
        {c.detail && (
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
            {c.detail}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">
            {c.member_name || "—"}
          </span>
          <span>
            {c.member_city ? `${c.member_city}, ` : ""}
            {c.member_country}
          </span>
          {c.member_email && (
            <a
              href={`mailto:${c.member_email}`}
              className="inline-flex items-center gap-1 hover:text-primary-600"
            >
              <Mail size={11} />
              {c.member_email}
            </a>
          )}
          {c.member_mobile && (
            <a
              href={`tel:${c.member_mobile}`}
              className="inline-flex items-center gap-1 hover:text-primary-600"
            >
              <Phone size={11} />
              {c.member_mobile}
            </a>
          )}
        </div>

        {c.response && (
          <div className="mt-3 p-3 bg-gray-50 border-l-2 border-gray-300 rounded-r-lg">
            <p className="text-xs font-bold text-gray-700 mb-0.5">Reply sent</p>
            <p className="text-sm text-gray-700">{c.response}</p>
          </div>
        )}
      </div>

      {c.status !== "resolved" && c.status !== "closed" && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          {!replying ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReplying(true)}
                className="h-9 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                           inline-flex items-center gap-2 hover:bg-primary-700"
              >
                <Send size={14} />
                Reply &amp; resolve
              </button>
              {c.status === "open" && (
                <button
                  onClick={() => respond("in_progress")}
                  disabled={saving}
                  className="h-9 px-4 rounded-lg border border-gray-300 text-sm font-bold
                             text-gray-700 hover:border-primary-300 disabled:opacity-50"
                >
                  Mark in progress
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                maxLength={2000}
                autoFocus
                placeholder="What did you do about it? The member sees this."
                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-sm
                           focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => respond("resolved")}
                  disabled={saving || !reply.trim()}
                  className="h-9 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                             hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? "Sending…" : "Send & resolve"}
                </button>
                <button
                  onClick={() => {
                    setReplying(false);
                    setError(null);
                  }}
                  className="h-9 px-4 rounded-lg border border-gray-300 text-sm font-bold text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function AssistanceQueue() {
  const [cases, setCases] = useState<Case[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  const load = useCallback(async (status: string | null) => {
    const { data, error } = await supabase.rpc("assistance_queue", {
      p_status: status,
    });
    if (error) {
      console.error("assistance_queue failed:", error);
      setLoading(false);
      return;
    }
    const rows = (data as Case[]) ?? [];
    setCases(rows);
    setLoading(false);
    return rows;
  }, []);

  useEffect(() => {
    (async () => {
      // An empty "all" result means no role at all, as distinct from a
      // coordinator whose queue happens to be clear.
      const rows = await load(filter);
      if (rows && rows.length === 0 && filter === null) {
        const { data } = await supabase.rpc("assistance_queue", {
          p_status: "all",
        });
        setNoAccess(((data as Case[]) ?? []).length === 0);
      }
    })();
  }, [filter, load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const total = cases[0]?.total_count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Assistance queue</h2>
        <p className="text-sm text-gray-600 mt-1">
          Grievances and student requests from members in your countries,
          oldest first.
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.key)}
            className={`h-9 px-4 rounded-lg text-sm font-bold border transition-colors ${
              filter === f.key
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-primary-300"
            }`}
          >
            {f.label}
          </button>
        ))}
        {total > 0 && (
          <span className="self-center text-sm text-gray-500 tabular-nums ml-1">
            {total}
          </span>
        )}
      </div>

      {noAccess ? (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="font-bold text-gray-900">No queue assigned</p>
          <p className="text-sm text-gray-600 mt-1">
            This area is for country coordinators and chapter leads.
          </p>
        </div>
      ) : cases.length === 0 ? (
        <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="font-bold text-emerald-900">Nothing waiting</p>
          <p className="text-sm text-emerald-800/80 mt-1">
            No open cases in your countries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <CaseCard key={`${c.kind}-${c.id}`} c={c} onDone={() => load(filter)} />
          ))}
        </div>
      )}
    </div>
  );
}
