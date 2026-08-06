/**
 * Feedback — built to docs/design/nri-wing-prototype.html (screen
 * `m-feedback`).
 *
 * ANONYMITY WAS ALREADY REAL — this screen is the first UI for it.
 *   20260804300000 already built a signed-in member submitting with no
 *   user_id (suggestions_member_insert: user_id IS NULL OR = auth.uid()).
 *   The old Dashboard.tsx form never exposed that choice — it always
 *   attached user_id, mobile_number and email. This screen's "Share my
 *   name / Anonymous" toggle is the first thing that actually uses the
 *   control that was already sound: choosing Anonymous omits user_id,
 *   mobile_number AND email, not just the id — attaching contact
 *   details would defeat the point even with user_id null. Exploit-
 *   tested: a member cannot attribute a submission to someone else's
 *   user_id (403), and an anonymous submission carries no identity at all.
 *
 * WHAT THIS SCREEN OMITS ON PURPOSE
 *   The mock's "Your submissions" list shows a green "Reviewed" pill.
 *   No review workflow exists anywhere in this schema — nothing ever
 *   writes a status onto a suggestion after it's filed. Showing that
 *   pill would be exactly the fabricated-status trap this project's
 *   CLAUDE.md warns about, so it isn't here. Only category, subject
 *   and date are shown — everything real, nothing invented.
 *
 *   An anonymous submission cannot appear in "Your submissions" — it
 *   carries no user_id, so there is nothing to look it up by. Real
 *   limitation of real anonymity, not a bug: documented in the
 *   migration, not silently hidden here either.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import "../styles/prototype-tokens.css";

type Head = "political" | "policies" | "governance";

type MySuggestion = {
  id: string;
  suggestion: string;
  subject: string | null;
  head: Head;
  suggestion_date: string;
};

const HEAD_LABEL: Record<Head, string> = { political: "Political", policies: "Policies", governance: "Governance" };
const HEAD_PILL: Record<Head, string> = { political: "pt-p-navy", policies: "pt-p-green", governance: "pt-p-saf" };
const HEAD_DESC: Record<Head, string> = {
  political: "Strategy, messaging, alliances, opposition response, diaspora mobilisation.",
  policies: "Welfare schemes, education, health, industry, agriculture — the substance of what is promised.",
  governance: "Delivery and administration — whether what was promised actually reaches people.",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MyFeedback() {
  const { user, profile } = useAuth();
  const [mine, setMine] = useState<MySuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [head, setHead] = useState<Head>("political");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const fetchMine = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("my_suggestions");
    if (!error) setMine((data as MySuggestion[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchMine(); }, [fetchMine]);

  const submit = async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setMsg({ text: "Please write your feedback.", kind: "err" });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    const { error } = await supabase.from("suggestions").insert({
      head,
      subject: subject.trim() || null,
      suggestion: trimmedBody,
      country: profile?.country_of_residence || null,
      // Anonymous means anonymous: no id, no way to reach them either.
      user_id: anonymous ? null : (user?.id ?? null),
      name: anonymous ? null : (profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null),
      mobile_number: anonymous ? null : (profile?.mobile_number ?? null),
      email: anonymous ? null : (profile?.email ?? null),
    });
    setSubmitting(false);
    if (error) {
      setMsg({ text: "Could not submit. Please try again.", kind: "err" });
      return;
    }
    setSubject("");
    setBody("");
    setMsg({ text: `Feedback submitted to the ${HEAD_LABEL[head]} desk.`, kind: "ok" });
    void fetchMine();
  };

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div className="pt-sec-title">Feedback</div>
      <p className="pt-sec-note">
        Tell the party what you're seeing from abroad. Feedback is grouped by head so it
        reaches the people who work on that subject.
      </p>

      <div className="pt-page">
        <section className="pt-card">
          <div className="pt-card-h"><h3>Share your view</h3></div>
          <div className="pt-card-b">
            <div className="pt-field">
              <label>Which head does this fall under?</label>
              <div className="pt-checks">
                {(["political", "policies", "governance"] as Head[]).map((h) => (
                  <label key={h} className={`pt-chk ${head === h ? "on" : ""}`}>
                    <input type="radio" name="head" checked={head === h} onChange={() => setHead(h)} />
                    {HEAD_LABEL[h]}
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-field">
              <label>Subject</label>
              <input className="pt-inp" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)}
                     placeholder="A one-line summary" />
            </div>
            <div className="pt-field">
              <label>Your feedback</label>
              <textarea className="pt-inp" style={{ minHeight: 130 }} value={body} maxLength={4000}
                        onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="pt-field">
              <label>How would you like this handled?</label>
              <div className="pt-radio-row" style={{ maxWidth: 400 }}>
                <label className={`pt-chk ${!anonymous ? "on" : ""}`}>
                  <input type="radio" name="fb" checked={!anonymous} onChange={() => setAnonymous(false)} />
                  Share my name
                </label>
                <label className={`pt-chk ${anonymous ? "on" : ""}`}>
                  <input type="radio" name="fb" checked={anonymous} onChange={() => setAnonymous(true)} />
                  Anonymous
                </label>
              </div>
            </div>
            {msg && <div className={`pt-note ${msg.kind === "ok" ? "go" : "warn"}`} style={{ marginBottom: 14 }}>{msg.text}</div>}
            <button className="pt-btn pt-btn-go" disabled={submitting || !body.trim()} onClick={submit}>
              {submitting ? "Submitting…" : "Submit feedback"}
            </button>
          </div>
        </section>

        <aside className="pt-rail" style={{ position: "sticky", top: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h"><h3>What the heads cover</h3></div>
            <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 13, fontSize: 12.5, color: "var(--ink-2)" }}>
              {(["political", "policies", "governance"] as Head[]).map((h) => (
                <div key={h}>
                  <span className={`pt-pill ${HEAD_PILL[h]}`}>{HEAD_LABEL[h]}</span>
                  <span style={{ display: "block", marginTop: 6 }}>{HEAD_DESC[h]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-card">
            <div className="pt-card-h"><h3>Your submissions</h3></div>
            <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {loading ? (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5, padding: 10 }}>Loading…</div>
              ) : mine.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5, padding: 10 }}>
                  Nothing submitted with your name yet. Anonymous submissions don't appear here.
                </div>
              ) : (
                mine.map((s, i) => (
                  <div key={s.id}>
                    {i > 0 && <div className="pt-divider" style={{ margin: "0 0 10px" }} />}
                    <div className="row" style={{ alignItems: "flex-start", gap: 9 }}>
                      <span className={`pt-pill ${HEAD_PILL[s.head]}`}>{HEAD_LABEL[s.head]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.subject || s.suggestion.slice(0, 60)}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 2 }}>
                          Submitted {fmtDate(s.suggestion_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
