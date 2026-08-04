import { useCallback, useEffect, useState } from "react";
import { MessageSquareWarning, GraduationCap, LifeBuoy, Plus, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";

/**
 * Assistance & grievances — the member's own cases.
 *
 * WHY THIS EXISTS
 *   JoinUs.tsx has advertised "Submit and track grievances" as a member
 *   benefit since launch. The grievances table was written by nothing
 *   and read by nothing, and student_requests had no UI at all. This is
 *   the screen that makes the promise true.
 *
 * Everything is scoped by my_requests(), which reads only auth.uid()'s
 * own rows. A member cannot change a case's status — verified against
 * the policy: filing and reading are theirs, adjudicating is not.
 */

type Kind = "grievance" | "student" | "service";

type Request = {
  kind: Kind;
  id: string;
  reference_no: string | null;
  title: string | null;
  detail: string | null;
  status: string;
  response: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
};

const KIND = {
  grievance: { label: "Grievance", Icon: MessageSquareWarning },
  student: { label: "Student assistance", Icon: GraduationCap },
  service: { label: "Service request", Icon: LifeBuoy },
} as const;

/* Status colour is semantic and deliberately separate from the brand
   accent: green means resolved, not "on brand". */
const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  in_progress: { label: "In progress", cls: "bg-primary-50 text-primary-800 border-primary-200" },
  resolved: { label: "Resolved", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  rejected: { label: "Not accepted", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

const GRIEVANCE_CATEGORIES = [
  "Membership or account",
  "Event or meeting",
  "Chapter or coordinator",
  "Website or app",
  "Other",
];

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NewGrievance({
  onClose,
  onFiled,
}: {
  onClose: () => void;
  onFiled: () => void;
}) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(GRIEVANCE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      setError("Please give the grievance a subject and a description.");
      return;
    }
    setSaving(true);
    setError(null);
    // status is left to the column default. Letting the client choose it
    // is how 'Open' / 'open' / 'OPEN' got into these tables originally;
    // the CHECK constraint would now reject it anyway.
    const { error: err } = await supabase.from("grievances").insert({
      profile_id: user?.id,
      subject: subject.trim(),
      category,
      description: description.trim(),
    });
    setSaving(false);
    if (err) {
      setError("We couldn’t file this just now. Please try again.");
      return;
    }
    onFiled();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Raise a grievance</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="input-label">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder="A one-line summary"
              className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-lg text-sm
                         focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="input-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-lg text-sm
                         focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {GRIEVANCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">What happened?</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Please include dates, names and anything that would help us look into it."
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm
                         focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 tabular-nums">
              {description.length}/2000
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <p className="text-xs text-gray-500">
            Your grievance goes to the coordinators for your country. You’ll get
            a reference number and can follow it here.
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-bold text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-primary-600 text-white text-sm font-bold
                       hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Filing…" : "File grievance"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyRequests() {
  const [rows, setRows] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_requests");
    if (error) {
      console.error("my_requests failed:", error);
      setFailed(true);
    } else {
      setRows((data as Request[]) ?? []);
      setFailed(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            Assistance &amp; grievances
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Everything you’ve raised with the wing, and where it stands.
          </p>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="shrink-0 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                     inline-flex items-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Raise a grievance</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {failed && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          We couldn’t load your cases just now. Please refresh the page.
        </div>
      )}

      {!failed && rows.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center">
          <p className="font-bold text-gray-900">Nothing raised yet</p>
          <p className="text-sm text-gray-600 mt-1 max-w-sm mx-auto">
            If something isn’t right, or you need help with studies, a job or a
            service, raise it here and a coordinator will pick it up.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const meta = KIND[r.kind];
            const status = STATUS[r.status] ?? {
              label: r.status,
              cls: "bg-gray-100 text-gray-600 border-gray-200",
            };
            return (
              <div
                key={`${r.kind}-${r.id}`}
                className="p-5 bg-white border border-gray-200 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 shrink-0 rounded-lg bg-primary-50 text-primary-600
                               flex items-center justify-center"
                  >
                    <meta.Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        {meta.label}
                      </span>
                      {r.reference_no && (
                        <span className="text-xs font-mono text-gray-400">
                          {r.reference_no}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${status.cls}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="font-bold text-gray-900 mt-1">
                      {r.title || "—"}
                    </p>
                    {r.detail && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {r.detail}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Raised {fmt(r.created_at)}
                      {r.resolved_at && ` · closed ${fmt(r.resolved_at)}`}
                    </p>

                    {/* A reply is the whole point of tracking. Give it real
                        visual weight rather than another grey line. */}
                    {r.response && (
                      <div className="mt-3 p-3 bg-primary-50 border-l-2 border-primary-500 rounded-r-lg">
                        <p className="text-xs font-bold text-primary-900 mb-0.5">
                          Reply from the team
                        </p>
                        <p className="text-sm text-primary-900/90">{r.response}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {composing && (
        <NewGrievance onClose={() => setComposing(false)} onFiled={load} />
      )}
    </div>
  );
}
