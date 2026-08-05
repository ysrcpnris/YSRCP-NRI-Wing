/**
 * Grievances — built to docs/design/nri-wing-prototype.html (screen
 * `m-griev`).
 *
 * This did not exist as a screen before tonight. Per Dashboard.tsx's
 * own prior comment: "grievances is written by nothing and read by
 * nothing. The only mentions in the app are marketing copy." The
 * table and its RLS were sound; nothing above them was.
 *
 * The mock's stage-by-stage progress log is backed by a real table —
 * grievance_progress (20260805232000) — not fabricated client-side.
 * Two stages are system-generated (Received on insert, Resolved/Closed
 * on the status transition); anything in between comes from
 * add_grievance_progress(), callable by admin, the assigned handler,
 * or someone with write scope over the case's country — verified by
 * exploit, including that the filer themselves cannot add a stage to
 * their own case.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import "../styles/prototype-tokens.css";

type GrievanceRow = {
  id: string;
  reference_no: string | null;
  subject: string | null;
  category: string | null;
  description: string | null;
  country: string | null;
  status: string;
  response: string | null;
  created_at: string;
  resolved_at: string | null;
};

type ProgressStage = {
  stage_label: string;
  actor_label: string | null;
  note: string | null;
  occurred_at: string;
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "" },
  in_progress: { label: "In progress", cls: "pt-p-saf" },
  resolved: { label: "Resolved", cls: "pt-p-green" },
  closed: { label: "Closed", cls: "" },
  rejected: { label: "Rejected", cls: "" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StageDot({ done, active }: { done: boolean; active: boolean }) {
  return (
    <div style={{
      width: 9, height: 9, borderRadius: "50%", marginTop: 4, flex: "0 0 9px",
      background: done ? "var(--green)" : active ? "var(--saffron)" : "var(--line)",
    }} />
  );
}

export default function Grievances() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<GrievanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, ProgressStage[]>>({});
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("grievances")
      .select("id, reference_no, subject, category, description, country, status, response, created_at, resolved_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRows(data as GrievanceRow[]);
      const open = (data as GrievanceRow[]).find((g) => !["resolved", "closed"].includes(g.status));
      if (open) {
        const { data: stages } = await supabase.rpc("grievance_progress", { p_grievance_id: open.id });
        if (stages) setProgress((p) => ({ ...p, [open.id]: stages as ProgressStage[] }));
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const submit = async () => {
    if (!user) return;
    const subj = subject.trim();
    const desc = description.trim();
    if (!subj || !desc) {
      setMsg({ text: "Subject and description are both required.", kind: "err" });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("grievances").insert({
        profile_id: user.id,
        subject: subj,
        category,
        description: desc,
        country: profile?.country_of_residence || null,
        status: "open",
      });
      if (error) throw error;
      setSubject(""); setCategory("general"); setDescription("");
      setCreating(false);
      setMsg({ text: "Grievance raised. You'll see a reference number below.", kind: "ok" });
      await fetchAll();
    } catch (e) {
      console.error(e);
      setMsg({ text: "Could not submit. Nothing was sent.", kind: "err" });
    } finally {
      setSubmitting(false);
    }
  };

  const open = rows.find((g) => !["resolved", "closed"].includes(g.status));
  const closed = rows.filter((g) => ["resolved", "closed"].includes(g.status));
  const openStages = open ? progress[open.id] ?? [] : [];

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div className="pt-sec-title">Grievances</div>
          <p className="pt-sec-note" style={{ marginBottom: 0 }}>
            A problem you or your family are facing that needs the party's help. Every
            grievance gets a reference number and a named owner.
          </p>
        </div>
        <button className="pt-btn pt-btn-go" onClick={() => { setCreating((c) => !c); setMsg(null); }}>
          {creating ? "Cancel" : "Raise a grievance"}
        </button>
      </div>

      {msg && (
        <div className={`pt-note ${msg.kind === "ok" ? "go" : "warn"}`} style={{ marginBottom: 14 }}>
          {msg.text}
        </div>
      )}

      {creating && (
        <section className="pt-card" style={{ marginBottom: 16 }}>
          <div className="pt-card-h"><h3>Raise a grievance</h3></div>
          <div className="pt-card-b">
            <div className="pt-field">
              <label>Subject</label>
              <input className="pt-inp" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="pt-field">
              <label>Category</label>
              <select className="pt-inp" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="general">General</option>
                <option value="welfare">Welfare</option>
                <option value="civic">Civic</option>
                <option value="land">Land records</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="pt-field" style={{ marginBottom: 0 }}>
              <label>What happened?</label>
              <textarea className="pt-inp" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="pt-btn pt-btn-go" onClick={submit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit grievance"}
              </button>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="pt-card"><div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div></div>
      ) : (
        <>
          {open && (
            <section className="pt-card" style={{ marginBottom: 14 }}>
              <div className="pt-card-h">
                <div style={{ flex: 1 }}>
                  <h3>Open · {open.reference_no ?? open.id.slice(0, 8)}</h3>
                  <div className="sub">Raised {fmtDate(open.created_at)}{open.category ? ` · ${open.category}` : ""}</div>
                </div>
                <span className={`pt-pill ${STATUS_PILL[open.status]?.cls ?? ""}`}>
                  {STATUS_PILL[open.status]?.label ?? open.status}
                </span>
              </div>
              <div className="pt-card-b">
                <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>
                  {open.description}
                </p>
                <div className="pt-divider" />
                <div style={{ fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, marginBottom: 11 }}>
                  Progress
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {openStages.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", paddingBottom: 13 }}>
                      <StageDot done active={false} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.stage_label}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                          {fmtDate(s.occurred_at)}{s.actor_label ? ` · ${s.actor_label}` : ""}
                        </div>
                        {s.note && <div className="pt-note" style={{ marginTop: 8 }}>{s.note}</div>}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <StageDot done={false} active />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--ink-4)" }}>Resolution</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>Not yet resolved</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {!open && rows.length === 0 && (
            <div className="pt-card"><div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>No grievances filed.</div></div>
          )}

          {closed.length > 0 && (
            <section className="pt-card">
              <div className="pt-card-h"><h3>Closed</h3></div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Reference", "Subject", "Category", "Raised", "Closed", "Outcome"].map((h) => (
                        <th key={h} style={{
                          textAlign: "left", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
                          color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                          borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closed.map((g) => (
                      <tr key={g.id}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", fontFamily: "var(--mono, monospace)", fontSize: 12 }}>
                          {g.reference_no ?? g.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", fontWeight: 600 }}>{g.subject}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{g.category}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{fmtDate(g.created_at)}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          {g.resolved_at ? fmtDate(g.resolved_at) : "—"}
                        </td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          <span className={`pt-pill ${STATUS_PILL[g.status]?.cls ?? ""}`}>
                            {STATUS_PILL[g.status]?.label ?? g.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
