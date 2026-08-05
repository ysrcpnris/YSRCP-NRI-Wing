/**
 * Service Requests — built to docs/design/nri-wing-prototype.html
 * (screen `m-service`).
 *
 * WHAT THE MOCK SHOWS THAT THE SCHEMA DOESN'T HAVE
 *   Two of its four stat tiles are not backed by anything real:
 *     - a reference number (SRV-2026-0771 style) — service_requests has
 *       none. grievances/student_requests got one in 20260804260000;
 *       service_requests did not. Rather than fabricate one from the
 *       row id, the Reference column is simply not shown here.
 *     - a satisfaction rating ("4.5 of 5, from 4 ratings") — there is no
 *       ratings table anywhere in the schema. Omitted rather than faked.
 *   "Median turnaround" IS real — computed client-side from created_at
 *   to team_resolved_at over resolved requests, not stored anywhere,
 *   because it doesn't need to be.
 *
 * CREATION
 *   The category/option lists are fetched live from service_categories
 *   / service_options — the admin-editable tables that already power
 *   the pre-mock creation flow in Dashboard.tsx. Only the top-level
 *   type labels (Student Support, Legal Advisor, ...) are a fixed
 *   constant, matching how the rest of the app treats them. Same
 *   insert shape, same table.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import { SERVICE_TYPE_LABELS } from "../lib/serviceConfig";
import "../styles/prototype-tokens.css";

type ServiceKey = string;
type Taxonomy = Record<string, Record<string, string[]>>;

type ServiceRequestRow = {
  id: string;
  service_type: string | null;
  service_category: string | null;
  service_option: string | null;
  description: string | null;
  status: string | null;
  assigned_to: string | null;
  team_reply: string | null;
  team_resolved_at: string | null;
  created_at: string;
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending: { label: "In progress", cls: "pt-p-saf" },
  resolved: { label: "Completed", cls: "pt-p-green" },
  rejected: { label: "Rejected", cls: "" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MyServiceRequests() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const [svc, setSvc] = useState<ServiceKey | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [option, setOption] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({});

  // Live from service_categories / service_options — see the header
  // comment. Fetched once on mount, same as the flow this replaces.
  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: opts }] = await Promise.all([
        supabase.from("service_categories").select("id, service_type, name, sort_order")
          .eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("service_options").select("id, category_id, name, sort_order")
          .eq("is_active", true).order("sort_order", { ascending: true }),
      ]);
      const grouped: Taxonomy = {};
      const catById: Record<string, { service_type: string; name: string }> = {};
      for (const c of cats || []) {
        grouped[c.service_type] ??= {};
        grouped[c.service_type][c.name] = [];
        catById[c.id] = { service_type: c.service_type, name: c.name };
      }
      for (const o of opts || []) {
        const c = catById[o.category_id];
        if (!c) continue;
        grouped[c.service_type]?.[c.name]?.push(o.name);
      }
      setTaxonomy(grouped);
    })();
  }, []);

  const fetchRows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select(
        "id, service_type, service_category, service_option, description, status, assigned_to, team_reply, team_resolved_at, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data as ServiceRequestRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchRows(); }, [fetchRows]);

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status === "pending").length;
    const completed = rows.filter((r) => r.status === "resolved").length;
    const turnarounds = rows
      .filter((r) => r.status === "resolved" && r.team_resolved_at)
      .map((r) => (new Date(r.team_resolved_at!).getTime() - new Date(r.created_at).getTime()) / 86_400_000)
      .sort((a, b) => a - b);
    const median = turnarounds.length
      ? turnarounds[Math.floor((turnarounds.length - 1) / 2)]
      : null;
    return { open, completed, median };
  }, [rows]);

  const resetForm = () => {
    setSvc(null); setSub(null); setOption(null); setDescription("");
  };

  const submit = async () => {
    if (!user || !svc || !sub || !option) {
      setMsg({ text: "Complete every step of the service selection.", kind: "err" });
      return;
    }
    const desc = description.trim();
    if (!desc) {
      setMsg({ text: "Describe your requirement.", kind: "err" });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("service_requests").insert({
        user_id: user.id,
        applicant_name: profile?.full_name || null,
        current_location: profile?.country_of_residence || "India",
        service_type: svc,
        service_category: sub,
        service_option: option,
        description: desc,
        status: "pending",
      });
      if (error) throw error;
      resetForm();
      setCreating(false);
      setMsg({ text: "Service request submitted.", kind: "ok" });
      await fetchRows();
    } catch (e) {
      console.error(e);
      setMsg({ text: "Could not submit. Nothing was sent.", kind: "err" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div className="pt-sec-title">Service Requests</div>
          <p className="pt-sec-note" style={{ marginBottom: 0 }}>
            Anything else you need from the wing that isn't a grievance — documents,
            introductions, verification, event support.
          </p>
        </div>
        <button className="pt-btn pt-btn-go" onClick={() => { setCreating((c) => !c); setMsg(null); }}>
          {creating ? "Cancel" : "New request"}
        </button>
      </div>

      {msg && (
        <div className={`pt-note ${msg.kind === "ok" ? "go" : "warn"}`} style={{ marginBottom: 14 }}>
          {msg.text}
        </div>
      )}

      {creating && (
        <section className="pt-card" style={{ marginBottom: 16 }}>
          <div className="pt-card-h"><h3>New service request</h3></div>
          <div className="pt-card-b">
            <div className="pt-field">
              <label>What kind of help do you need?</label>
              <div className="pt-checks">
                {Object.keys(taxonomy).map((key) => (
                  <label key={key} className={`pt-chk ${svc === key ? "on" : ""}`}>
                    <input
                      type="radio" name="svc" checked={svc === key}
                      onChange={() => { setSvc(key); setSub(null); setOption(null); }}
                    />
                    {SERVICE_TYPE_LABELS[key] ?? key}
                  </label>
                ))}
              </div>
            </div>

            {svc && (
              <div className="pt-field">
                <label>Category</label>
                <div className="pt-checks">
                  {Object.keys(taxonomy[svc] ?? {}).map((s) => (
                    <label key={s} className={`pt-chk ${sub === s ? "on" : ""}`}>
                      <input
                        type="radio" name="sub" checked={sub === s}
                        onChange={() => { setSub(s); setOption(null); }}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {svc && sub && (
              <div className="pt-field">
                <label>Specifically</label>
                <div className="pt-checks">
                  {(taxonomy[svc]?.[sub] ?? []).map((o) => (
                    <label key={o} className={`pt-chk ${option === o ? "on" : ""}`}>
                      <input
                        type="radio" name="option" checked={option === o}
                        onChange={() => setOption(o)}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-field" style={{ marginBottom: 0 }}>
              <label>Describe your requirement</label>
              <textarea
                className="pt-inp" value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <button className="pt-btn pt-btn-go" onClick={submit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="pt-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Open</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats.open}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Awaiting the wing</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Completed</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats.completed}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>All time</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Median turnaround</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>
            {stats.median === null ? "—" : `${Math.round(stats.median)}d`}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Across completed requests</div>
        </div>
      </div>

      <section className="pt-card">
        <div className="pt-card-h"><h3>All requests</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Request", "Type", "Owner", "Raised", "Status"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
                    color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                    borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>No service requests yet.</td></tr>
              ) : rows.map((r) => {
                const pill = STATUS_PILL[r.status ?? ""] ?? { label: r.status ?? "—", cls: "" };
                return (
                  <tr key={r.id}>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      <div style={{ fontWeight: 600 }}>{r.service_option || r.service_category || "Service request"}</div>
                      {r.description && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>
                          {r.description.length > 80 ? r.description.slice(0, 80) + "…" : r.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      {r.service_type && (
                        <span className="pt-pill" style={{ background: "var(--navy-soft)", color: "var(--navy-ink)" }}>
                          {SERVICE_TYPE_LABELS[r.service_type ?? ""] ?? r.service_type}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      {r.assigned_to || <span style={{ color: "var(--ink-4)" }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{fmtDate(r.created_at)}</td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      <span className={`pt-pill ${pill.cls}`}>{pill.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
