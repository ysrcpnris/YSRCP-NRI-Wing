/**
 * Chapter Events — built to docs/design/nri-wing-prototype.html
 * (screen `c-events`).
 *
 * `events` was wing-wide and admin-only before this slice
 * (20260806170000). Audience is REALLY enforced, not just stored —
 * a Frankfurt-only event is invisible to a Berlin member at the RLS
 * level, exploit-verified before this component was written. "Students
 * group only" from the mock is not offered: no student-cohort
 * membership concept exists anywhere in this schema.
 *
 * "Recurring" status and auto-generated join links from the mock are
 * not built — no recurrence concept and no meeting-provider
 * integration exist anywhere in this codebase.
 *
 * Attendance marking is a real addition the mock itself doesn't draw
 * a control for — its Past-events numbers would otherwise be
 * unproducable fiction. mark_event_attendance() makes them real.
 */

import { Fragment, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type Scheduled = {
  id: string; title: string; event_date: string | null; event_time: string | null;
  venue: string | null; virtual_link: string | null; chapter_id: string | null;
  chapter_name: string | null; audience: string | null; audience_city: string | null;
  called_by: string; is_mine: boolean; registered: number; capacity: number | null; status_label: string;
};
type Past = { id: string; title: string; event_date: string; registered: number; attended: number; turnout_pct: number };
type Registrant = { user_id: string; full_name: string; applied_at: string; attended_at: string | null };
type Chapter = { chapter_id: string; name: string; country: string; cities: string[] };

const emptyForm = {
  format: "in_person" as "in_person" | "online" | "both",
  title: "", date: "", time: "", venue: "", virtual_link: "",
  audience: "country" as "country" | "city" | "team", audience_city: "",
  capacity: "", details: "",
};

function AttendanceRow({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [rows, setRows] = useState<Registrant[] | null>(null);

  useEffect(() => {
    void supabase.rpc("chapter_event_registrants", { p_event_id: eventId }).then(({ data }) => {
      setRows((data as Registrant[]) ?? []);
    });
  }, [eventId]);

  const toggle = async (userId: string, attended: boolean) => {
    await supabase.rpc("mark_event_attendance", { p_event_id: eventId, p_user_id: userId, p_attended: attended });
    const { data } = await supabase.rpc("chapter_event_registrants", { p_event_id: eventId });
    setRows((data as Registrant[]) ?? []);
  };

  return (
    <tr>
      <td colSpan={5} style={{ background: "var(--card-2)", padding: "10px 14px" }}>
        {rows === null ? (
          <span style={{ fontSize: 12, color: "var(--ink-4)" }}>Loading registrants…</span>
        ) : rows.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--ink-4)" }}>Nobody registered.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => (
              <label key={r.user_id} className="row" style={{ gap: 8, fontSize: 12.5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!r.attended_at}
                  onChange={(e) => void toggle(r.user_id, e.target.checked)}
                />
                {r.full_name}
                {r.attended_at && <span className="pill p-green" style={{ marginLeft: "auto" }}>Attended</span>}
              </label>
            ))}
          </div>
        )}
        <button className="btn btn-out btn-sm" style={{ marginTop: 8 }} onClick={onClose}>Close</button>
      </td>
    </tr>
  );
}

export default function MyChapterEvents({ country }: { country: string }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [past, setPast] = useState<Past[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [ch, sc, ps] = await Promise.all([
      supabase.rpc("my_chapters_overview"),
      supabase.rpc("chapter_events_scheduled"),
      supabase.rpc("chapter_events_past"),
    ]);
    setChapters((ch.data as Chapter[]) ?? []);
    setScheduled((sc.data as Scheduled[]) ?? []);
    setPast((ps.data as Past[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const chapterId = chapters[0]?.chapter_id;
  const cities = chapters[0]?.cities ?? [];

  const submit = async () => {
    if (!chapterId) return;
    setError(null);
    if (!form.title.trim() || !form.date) {
      setError("Event name and date are required.");
      return;
    }
    if ((form.format === "in_person" || form.format === "both") && !form.venue.trim()) {
      setError("Venue is required for an in-person event.");
      return;
    }
    if ((form.format === "online" || form.format === "both") && !form.virtual_link.trim()) {
      setError("Paste a join link for an online event.");
      return;
    }
    if (form.audience === "city" && !form.audience_city) {
      setError("Choose which city this event is for.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.rpc("create_chapter_event", {
      p_chapter_id: chapterId,
      p_title: form.title.trim(),
      p_date: form.date,
      p_time: form.time || null,
      p_venue: form.format === "online" ? null : form.venue.trim() || null,
      p_virtual_link: form.format === "in_person" ? null : form.virtual_link.trim() || null,
      p_audience: form.audience,
      p_audience_city: form.audience === "city" ? form.audience_city : null,
      p_capacity: form.capacity ? Number(form.capacity) : null,
      p_details: form.details.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError("Couldn't schedule that event.");
      return;
    }
    setForm(emptyForm);
    void fetchAll();
  };

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }

  if (!chapterId) {
    return (
      <div className="pt-note" style={{ marginTop: 12 }}>
        No chapter assigned — events are scheduled per chapter.
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <p className="sec-note" style={{ marginBottom: 0 }}>
          Schedule and run your own events. These publish to {country} members only and need no
          approval from the secretariat.
        </p>
      </div>

      <div className="pt-page" style={{ gridTemplateColumns: "1fr 1.5fr" }}>
        <div className="card">
          <div className="card-h"><h3>New event or meeting</h3></div>
          <div className="card-b">
            <div className="field">
              <label>Format</label>
              <div className="radio-row">
                {(["in_person", "online", "both"] as const).map((f) => (
                  <label key={f} className={`chk ${form.format === f ? "on" : ""}`}>
                    <input type="radio" name="fmt" checked={form.format === f} onChange={() => setForm((s) => ({ ...s, format: f }))} />
                    {f === "in_person" ? "In person" : f === "online" ? "Online" : "Both"}
                  </label>
                ))}
              </div>
            </div>
            <div className="field"><label>Event name</label>
              <input className="inp" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Frankfurt Telugu Meet" />
            </div>
            <div className="grid g2" style={{ gap: "0 12px" }}>
              <div className="field"><label>Date</label>
                <input className="inp" type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} />
              </div>
              <div className="field"><label>Time</label>
                <input className="inp" type="time" value={form.time} onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))} />
              </div>
            </div>
            {form.format !== "online" && (
              <div className="field"><label>Where</label>
                <input className="inp" value={form.venue} onChange={(e) => setForm((s) => ({ ...s, venue: e.target.value }))} placeholder="Venue address" />
              </div>
            )}
            {form.format !== "in_person" && (
              <div className="field"><label>Join link</label>
                <input className="inp" value={form.virtual_link} onChange={(e) => setForm((s) => ({ ...s, virtual_link: e.target.value }))} placeholder="Your own Zoom / Meet link" />
              </div>
            )}
            <div className="field">
              <label>Who can see it</label>
              <select value={form.audience} onChange={(e) => setForm((s) => ({ ...s, audience: e.target.value as typeof s.audience }))}>
                <option value="country">All {country} members</option>
                <option value="city">One city only</option>
                <option value="team">Team leads only</option>
              </select>
              <span className="hint">You can only publish to {country}. Wing-wide events come from the secretariat.</span>
            </div>
            {form.audience === "city" && (
              <div className="field"><label>City</label>
                <select value={form.audience_city} onChange={(e) => setForm((s) => ({ ...s, audience_city: e.target.value }))}>
                  <option value="">Choose a city…</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="field"><label>Capacity</label>
              <input className="inp" type="number" style={{ maxWidth: 120 }} value={form.capacity} onChange={(e) => setForm((s) => ({ ...s, capacity: e.target.value }))} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}><label>Details</label>
              <textarea value={form.details} onChange={(e) => setForm((s) => ({ ...s, details: e.target.value }))} rows={3} />
            </div>
            {error && <p style={{ color: "var(--crimson)", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
            <button className="btn btn-go" style={{ marginTop: 12, width: "100%" }} disabled={saving} onClick={() => void submit()}>
              {saving ? "Scheduling…" : "Schedule event"}
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-h"><div style={{ flex: 1 }}><h3>Scheduled</h3>
              <div className="sub">Yours, plus anything Central Command has called for {country}</div></div></div>
            {scheduled.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>Nothing scheduled.</div>
            ) : (
              <div className="tbl-wrap"><table>
                <thead><tr><th>Event</th><th>When</th><th>Called by</th><th>Audience</th><th className="num">Registered</th><th>Status</th></tr></thead>
                <tbody>
                  {scheduled.map((e) => (
                    <tr key={e.id} style={!e.is_mine && !e.chapter_id ? { background: "var(--card-2)" } : undefined}>
                      <td className="t-name">{e.title}
                        {e.venue && <div className="t-sub">{e.venue}</div>}
                        {e.virtual_link && !e.venue && <div className="t-sub">Online</div>}
                      </td>
                      <td>{e.event_date}{e.event_time ? ` · ${e.event_time}` : ""}</td>
                      <td><span className={`pill ${e.chapter_id ? "p-green" : "p-navy"}`}>{e.called_by}</span></td>
                      <td>
                        {e.chapter_id ? (e.audience === "country" ? `All ${country}` : e.audience === "city" ? e.audience_city : "Team leads") : "All clusters"}
                      </td>
                      <td className="num">{e.registered}{e.capacity ? ` / ${e.capacity}` : ""}</td>
                      <td><span className={`pill ${e.status_label === "Open" ? "p-green" : e.status_label === "Draft" ? "p-navy" : "p-grey"}`}>{e.status_label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <div className="card-b" style={{ borderTop: "1px solid var(--line-2)" }}>
              <div className="note"><b>Central Command events are read-only to you.</b> They appear here and your
                members can join, but you can't edit or cancel them. Anything you scheduled is yours to run.</div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Past events</h3></div>
            {past.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No past events yet.</div>
            ) : (
              <div className="tbl-wrap"><table>
                <thead><tr><th>Event</th><th>When</th><th className="num">Registered</th><th className="num">Attended</th><th className="num">Turnout</th><th></th></tr></thead>
                <tbody>
                  {past.map((e) => (
                    <Fragment key={e.id}>
                      <tr>
                        <td className="t-name">{e.title}</td>
                        <td>{e.event_date}</td>
                        <td className="num">{e.registered}</td>
                        <td className="num">{e.attended}</td>
                        <td className="num">{e.turnout_pct}%</td>
                        <td>
                          <button className="btn btn-out btn-sm" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                            {expanded === e.id ? "Hide" : "Mark attendance"}
                          </button>
                        </td>
                      </tr>
                      {expanded === e.id && <AttendanceRow eventId={e.id} onClose={() => { setExpanded(null); void fetchAll(); }} />}
                    </Fragment>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
