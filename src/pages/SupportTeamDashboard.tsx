import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Inbox,
  LogOut,
  Mail,
  Phone,
  User as UserIcon,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useIdleLogout } from "../hooks/useIdleLogout";

type AssignedRequest = {
  id: string;
  applicant_name: string | null;
  service_type: string;
  service_category: string | null;
  service_option: string | null;
  current_location: string | null;
  description: string | null;
  status: string;
  assigned_to: string | null;
  action_taken: string | null;
  admin_comments: string | null;
  team_reply: string | null;
  team_resolved_at: string | null;
  created_at: string;
  user_id: string | null;
  // Joined from profiles via SECURITY DEFINER policy view? RLS allows
  // is_admin() to read profiles but not support_team. We'll fetch
  // user details separately by user_id list.
};

type RequesterProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
};

type TeamSeat = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export default function SupportTeamDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  // Auto sign-out after 1 hour idle.
  useIdleLogout({
    enabled: !!user,
    onLogout: async () => {
      try {
        await signOut();
      } finally {
        navigate("/support-teams", { replace: true });
      }
    },
  });

  const [team, setTeam] = useState<TeamSeat | null>(null);
  const [requests, setRequests] = useState<AssignedRequest[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, RequesterProfile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  // Per-card draft + busy state.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  const showToast = (tone: "ok" | "err", msg: string) => {
    setToast({ tone, msg });
    window.setTimeout(() => setToast(null), 2400);
  };

  // ------------ Fetch the seat ------------
  // The team this profile owns. RLS allows public read of support_teams so
  // a simple .eq is fine.
  const fetchTeam = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("support_teams")
      .select("id, name, description, is_active")
      .eq("claimed_by_profile_id", user.id)
      .maybeSingle();
    if (error) {
      console.error(error);
      setTeam(null);
      return;
    }
    setTeam(data as TeamSeat | null);
  };

  // ------------ Fetch assigned requests ------------
  // RLS on service_requests permits SELECT only for our team's rows.
  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select(
        "id, applicant_name, service_type, service_category, service_option, current_location, description, status, assigned_to, action_taken, admin_comments, team_reply, team_resolved_at, created_at, user_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setRequests([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as AssignedRequest[];
    setRequests(rows);

    // Pull requester contact info via the SECURITY DEFINER RPC. Falls back
    // gracefully if the RPC isn't available — UI will just show whatever
    // came in via assigned_to/applicant_name.
    const userIds = Array.from(
      new Set(rows.map((r) => r.user_id).filter(Boolean) as string[])
    );
    if (userIds.length > 0) {
      const { data: pData, error: pErr } = await supabase.rpc(
        "support_team_lookup_users",
        { p_user_ids: userIds }
      );
      if (!pErr && pData) {
        const m: Record<string, RequesterProfile> = {};
        (pData as RequesterProfile[]).forEach((p) => (m[p.id] = p));
        setProfilesById(m);
      }
    }

    // Seed drafts from existing team_reply text so editors persist between
    // refetches.
    setDrafts((d) => {
      const next = { ...d };
      for (const r of rows) {
        if (next[r.id] === undefined) next[r.id] = r.team_reply || "";
      }
      return next;
    });

    setLoading(false);
  };

  // ------------ Lifecycle ------------
  useEffect(() => {
    fetchTeam();
    fetchRequests();

    // Realtime: any insert/update on service_requests routed to our team
    // bumps the list.
    if (!user?.id) return;
    const channel = supabase
      .channel(`support-team-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => fetchRequests()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_teams" },
        () => fetchTeam()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ------------ Derived ------------
  const counts = useMemo(() => {
    const total = requests.length;
    const resolved = requests.filter((r) => r.status === "resolved").length;
    const pending = total - resolved;
    return { total, resolved, pending };
  }, [requests]);

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    if (filter === "resolved") return requests.filter((r) => r.status === "resolved");
    return requests.filter((r) => r.status !== "resolved");
  }, [requests, filter]);

  // ------------ Mutations ------------
  const saveReply = async (req: AssignedRequest) => {
    const reply = (drafts[req.id] || "").trim();
    setSavingId(req.id);
    const { data, error } = await supabase.rpc("support_team_save_reply", {
      p_request_id: req.id,
      p_reply: reply,
    });
    setSavingId(null);
    if (error) {
      console.error(error);
      showToast("err", "Could not save reply");
      return;
    }
    if (data && data.ok === false) {
      showToast("err", `Could not save (${data.reason})`);
      return;
    }
    showToast("ok", "Reply saved");
    fetchRequests();
  };

  const markResolved = async (req: AssignedRequest) => {
    const reply = (drafts[req.id] || "").trim();
    if (!reply) {
      showToast("err", "Write a reply before resolving");
      return;
    }
    if (!window.confirm("Mark this request as resolved? The user will see your reply.")) return;
    setResolvingId(req.id);
    const { data, error } = await supabase.rpc("support_team_mark_resolved", {
      p_request_id: req.id,
      p_reply: reply,
    });
    setResolvingId(null);
    if (error) {
      console.error(error);
      showToast("err", "Could not mark resolved");
      return;
    }
    if (data && data.ok === false) {
      showToast("err", `Could not resolve (${data.reason})`);
      return;
    }
    showToast("ok", "Marked resolved");
    fetchRequests();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/support-teams", { replace: true });
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const { data, error } = await supabase.rpc("delete_my_support_account");
    if (error || (data && data.ok === false)) {
      console.error(error || data);
      setDeletingAccount(false);
      showToast("err", "Could not delete account");
      return;
    }
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    navigate("/support-teams", { replace: true });
  };

  // ------------ Empty / orphan state ------------
  // If profile.role is support_team but no team is claimed, the seat was
  // released by admin, the team was deleted, or the claim never landed.
  const hasSeat = !!team;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Support Team
              </p>
              <p className="text-sm font-extrabold text-gray-900 truncate">
                {team?.name || (profile?.role === "support_team" ? "No seat" : "—")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50"
              title="Permanently delete account & release seat"
            >
              <Trash2 size={14} />
              Delete account
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* SEAT BANNER */}
        {!hasSeat ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-700 mt-0.5 shrink-0" size={18} />
            <div className="text-sm">
              <p className="font-bold text-amber-900">No team seat assigned</p>
              <p className="text-amber-800 mt-1">
                Your team was deleted or the seat was released by the admin. Click{" "}
                <strong>Delete account</strong> to free your email so you can register again
                under a different team, or wait for the admin to assign you a new seat.
              </p>
            </div>
          </div>
        ) : !team!.is_active ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-700 mt-0.5 shrink-0" size={18} />
            <div className="text-sm">
              <p className="font-bold text-amber-900">Team is currently inactive</p>
              <p className="text-amber-800 mt-1">
                The admin has disabled <strong>{team!.name}</strong>. New requests won't be routed here
                until it's reactivated.
              </p>
            </div>
          </div>
        ) : null}

        {/* COUNTERS */}
        <div className="grid grid-cols-3 gap-3">
          <Counter label="Total assigned" value={counts.total} icon={<Inbox size={16} />} />
          <Counter
            label="Pending"
            value={counts.pending}
            icon={<Clock size={16} />}
            tone="amber"
          />
          <Counter
            label="Resolved"
            value={counts.resolved}
            icon={<CheckCircle2 size={16} />}
            tone="emerald"
          />
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "resolved"] as const).map((k) => {
            const isActive = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                  isActive
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)}
              </button>
            );
          })}
        </div>

        {/* LIST */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-xl">
            {requests.length === 0
              ? "No requests routed to your team yet."
              : "Nothing matches that filter."}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => {
              const requester = (r.user_id && profilesById[r.user_id]) || null;
              const submittedName =
                requester
                  ? [requester.first_name, requester.last_name].filter(Boolean).join(" ") ||
                    requester.full_name ||
                    r.applicant_name
                  : r.applicant_name;
              const isResolved = r.status === "resolved";
              const draft = drafts[r.id] ?? "";
              const replyDirty = draft.trim() !== (r.team_reply || "").trim();
              const canResolve = !isResolved && draft.trim().length > 0;

              return (
                <article
                  key={r.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* HEADER */}
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-gray-900 capitalize truncate">
                        {r.service_type}
                        {r.service_category ? ` · ${r.service_category}` : ""}
                        {r.service_option ? ` · ${r.service_option}` : ""}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Submitted {new Date(r.created_at).toLocaleDateString()}
                        {r.current_location ? ` · ${r.current_location}` : ""}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                        isResolved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isResolved ? "Resolved" : "In progress"}
                    </span>
                  </div>

                  {/* BODY */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Requester + admin context */}
                    <div className="md:col-span-1 space-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Requester
                        </p>
                        <p className="font-bold text-gray-900 inline-flex items-center gap-2">
                          <UserIcon size={14} className="text-gray-400" />
                          {submittedName || "—"}
                        </p>
                        {requester?.email && (
                          <p className="text-[12px] text-gray-600 inline-flex items-center gap-2 mt-0.5">
                            <Mail size={12} className="text-gray-400" />
                            <a href={`mailto:${requester.email}`} className="hover:underline">
                              {requester.email}
                            </a>
                          </p>
                        )}
                        {requester?.mobile_number && (
                          <p className="text-[12px] text-gray-600 inline-flex items-center gap-2 mt-0.5">
                            <Phone size={12} className="text-gray-400" />
                            <a href={`tel:${requester.mobile_number}`} className="hover:underline">
                              {requester.mobile_number}
                            </a>
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Admin context
                        </p>
                        {r.action_taken ? (
                          <p className="text-[12px] text-gray-800">
                            <span className="font-semibold">Action:</span> {r.action_taken}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">No action recorded.</p>
                        )}
                        {r.admin_comments && (
                          <p className="text-[12px] text-gray-700 mt-1">
                            <span className="font-semibold">Notes:</span> {r.admin_comments}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Problem + reply */}
                    <div className="md:col-span-2 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Problem
                        </p>
                        <p className="text-[13px] text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-3">
                          {r.description || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Your reply to the user
                        </p>
                        <textarea
                          rows={3}
                          value={draft}
                          disabled={isResolved}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                          }
                          placeholder={
                            isResolved
                              ? "This request is resolved."
                              : "Type your reply — the user will see this in My Service Requests."
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg text-[13px] focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        {isResolved && r.team_resolved_at && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            Marked resolved on{" "}
                            {new Date(r.team_resolved_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {!isResolved && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => saveReply(r)}
                            disabled={savingId === r.id || !replyDirty}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-800 text-xs font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            {savingId === r.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : null}
                            Save reply
                          </button>
                          <button
                            onClick={() => markResolved(r)}
                            disabled={resolvingId === r.id || !canResolve}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                            title={
                              !canResolve
                                ? "Write a reply first"
                                : "Mark this request as resolved"
                            }
                          >
                            {resolvingId === r.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Mark resolved
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Delete account?</h3>
            </div>
            <div className="p-5 text-sm text-gray-700 space-y-2">
              <p>
                This permanently deletes your support-team profile and frees{" "}
                <strong>{team?.name || "your team seat"}</strong> for someone else.
              </p>
              <p className="text-[12px] text-gray-500">
                Existing requests routed to this team stay intact — they just won't be
                visible to you anymore.
              </p>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteAccount(false)}
                disabled={deletingAccount}
                className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-3 py-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deletingAccount ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-xs font-bold z-50 ${
            toast.tone === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "primary" | "amber" | "emerald";
}) {
  const palette = {
    primary: "bg-primary-50 text-primary-700 border-primary-100",
    amber:   "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${palette}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
