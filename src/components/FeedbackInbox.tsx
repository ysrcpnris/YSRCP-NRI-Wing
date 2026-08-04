import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Mail, Phone, UserCheck, UserX } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Feedback for the coordinator's own countries.
 *
 * Scope comes from feedback_for_my_countries(), which reads
 * my_countries(). Until now only admin could read feedback at all, so
 * a Germany coordinator had no way to see what their own chapter was
 * saying without going through central admin — which defeats the point
 * of having chapters.
 *
 * The country a row is scoped by is taken from the submitter's profile
 * by trigger, never from the form field. A member who types a different
 * country does not land in that coordinator's queue.
 */

type Feedback = {
  id: string;
  name: string | null;
  suggestion: string | null;
  country: string | null;
  email: string | null;
  mobile_number: string | null;
  is_member: boolean;
  submitted_at: string | null;
  total_count: number;
};

const PAGE = 50;

export default function FeedbackInbox() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  const load = useCallback(async (p: number) => {
    const { data, error } = await supabase.rpc("feedback_for_my_countries", {
      p_limit: PAGE,
      p_offset: p * PAGE,
    });
    if (error) {
      console.error("feedback_for_my_countries failed:", error);
      setLoading(false);
      return;
    }
    const list = (data as Feedback[]) ?? [];
    setRows(list);
    if (p === 0) setNoAccess(list.length === 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const total = rows[0]?.total_count ?? 0;
  const pages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Feedback</h2>
        <p className="text-sm text-gray-600 mt-1">
          What members and visitors in your countries are telling us.
        </p>
      </div>

      {noAccess ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center">
          <MessageSquare size={22} className="mx-auto text-gray-400 mb-2" />
          <p className="font-bold text-gray-900">No feedback yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Suggestions from your chapter will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((f) => (
              <div
                key={f.id}
                className="p-5 bg-white border border-gray-200 rounded-xl"
              >
                <p className="text-gray-800 whitespace-pre-line">
                  {f.suggestion || "—"}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {f.name || "Anonymous"}
                  </span>

                  {/* Whether this came from a member matters: a member can
                      be followed up with and their history looked at, a
                      passer-by cannot. */}
                  <span
                    className={`inline-flex items-center gap-1 ${
                      f.is_member ? "text-primary-700" : "text-gray-400"
                    }`}
                  >
                    {f.is_member ? <UserCheck size={11} /> : <UserX size={11} />}
                    {f.is_member ? "Member" : "Visitor"}
                  </span>

                  {f.country && <span>{f.country}</span>}

                  {f.email && (
                    <a
                      href={`mailto:${f.email}`}
                      className="inline-flex items-center gap-1 hover:text-primary-600"
                    >
                      <Mail size={11} />
                      {f.email}
                    </a>
                  )}
                  {f.mobile_number && (
                    <a
                      href={`tel:${f.mobile_number}`}
                      className="inline-flex items-center gap-1 hover:text-primary-600"
                    >
                      <Phone size={11} />
                      {f.mobile_number}
                    </a>
                  )}

                  {f.submitted_at && (
                    <span className="tabular-nums">
                      {new Date(f.submitted_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 tabular-nums">
                {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold
                             disabled:opacity-40 hover:border-primary-300"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages - 1}
                  onClick={() => setPage(page + 1)}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold
                             disabled:opacity-40 hover:border-primary-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
