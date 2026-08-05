/**
 * Assistance Board — built to docs/design/nri-wing-prototype.html
 * (screen `m-assist`).
 *
 * THE SCOPE DECISION, MADE WITH THE USER, NOT ASSUMED
 *   The mock describes a real public community board — "everyone in
 *   Germany sees these" — but the only thing that existed was
 *   student_requests: a private ticket visible to the requester, an
 *   assigned mentor, admin, and coordinators with scope. No board, no
 *   offers, no "N members responded". Presented three options; the
 *   user chose to build the real thing: 20260805238000 adds
 *   assistance_posts + assistance_offers as their own subsystem,
 *   deliberately separate from student_requests/service_requests,
 *   which keep their existing purpose (formal help routed to a named
 *   mentor/team).
 *
 * WHAT THIS DOES NOT BUILD
 *   No "Matches your skills" tag/filter — profession is free text with
 *   no structured skills taxonomy to match against reliably. Category
 *   filters (Student/Job) are real; that one tag is dropped.
 *   No "Answered this month" / "Median first reply" stats — nothing
 *   timestamps a first reply. Only counts this screen can actually
 *   compute are shown: open requests, your posts, and how many
 *   requests you've offered help on.
 *
 * CONTACT SHARING IS CONSENT-GATED, LITERALLY
 *   Offering help never reveals anything. share_contact_with_helper()
 *   is callable only by the post's own poster and flips one offer's
 *   contact_shared flag; assistance_contact() then lets only that one
 *   helper read the poster's mobile/whatsapp. Exploit-tested live on
 *   staging: a third member calling assistance_contact() on someone
 *   else's offer gets an empty result, before and after consent.
 *
 * TWO BYPASSES FOUND AND CLOSED BY DIRECT-REST TESTING (20260805239000)
 *   The INSERT policies here only ever checked profile_id/helper_id —
 *   nothing stopped a client posting straight to the table with a
 *   fabricated country, or a poster self-offering on their own post.
 *   Both are now closed by BEFORE INSERT triggers, not just the RPCs.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type Category = "student" | "job";

type BoardRow = {
  id: string;
  category: Category;
  title: string;
  description: string;
  poster_name: string;
  city: string | null;
  country: string;
  status: "open" | "resolved" | "closed";
  created_at: string;
  offer_count: number;
  is_own_post: boolean;
  my_offer_id: string | null;
  my_shared: boolean | null;
};

type OfferRow = {
  offer_id: string;
  helper_name: string;
  message: string | null;
  contact_shared: boolean;
  created_at: string;
};

const CATEGORY_LABEL: Record<Category, string> = { student: "Student", job: "Job" };
const CATEGORY_PILL: Record<Category, string> = { student: "pt-p-saf", job: "pt-p-green" };

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function MyAssistanceBoard() {
  const [posts, setPosts] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<"all" | Category>("all");

  const [showForm, setShowForm] = useState(false);
  const [postCategory, setPostCategory] = useState<Category>("student");
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [offerMessage, setOfferMessage] = useState("");
  const [offering, setOffering] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offersByPost, setOffersByPost] = useState<Record<string, OfferRow[]>>({});
  const [contactByOffer, setContactByOffer] = useState<Record<string, { mobile: string | null; whatsapp: string | null } | "hidden">>({});

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("my_assistance_board");
    if (error) {
      console.error(error);
      setFailed(true);
    } else {
      setPosts((data as BoardRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchBoard(); }, [fetchBoard]);

  const submitPost = useCallback(async () => {
    if (!postTitle.trim() || !postDescription.trim()) return;
    setPosting(true);
    setPostError(null);
    const { error } = await supabase.rpc("post_assistance_request", {
      p_category: postCategory,
      p_title: postTitle.trim(),
      p_description: postDescription.trim(),
    });
    if (error) {
      setPostError(error.message);
    } else {
      setPostTitle("");
      setPostDescription("");
      setShowForm(false);
      await fetchBoard();
    }
    setPosting(false);
  }, [postCategory, postTitle, postDescription, fetchBoard]);

  const submitOffer = useCallback(async (postId: string) => {
    setOffering(true);
    const { error } = await supabase.rpc("offer_help", {
      p_post_id: postId,
      p_message: offerMessage.trim() || null,
    });
    if (error) {
      console.error(error);
    } else {
      setOfferingId(null);
      setOfferMessage("");
      await fetchBoard();
    }
    setOffering(false);
  }, [offerMessage, fetchBoard]);

  const toggleOffers = useCallback(async (postId: string) => {
    if (expandedId === postId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(postId);
    if (!offersByPost[postId]) {
      const { data, error } = await supabase.rpc("offers_on_my_post", { p_post_id: postId });
      if (!error) {
        setOffersByPost((prev) => ({ ...prev, [postId]: (data as OfferRow[]) ?? [] }));
      }
    }
  }, [expandedId, offersByPost]);

  const shareContact = useCallback(async (postId: string, offerId: string) => {
    const { error } = await supabase.rpc("share_contact_with_helper", { p_offer_id: offerId });
    if (!error) {
      const { data } = await supabase.rpc("offers_on_my_post", { p_post_id: postId });
      setOffersByPost((prev) => ({ ...prev, [postId]: (data as OfferRow[]) ?? [] }));
    }
  }, []);

  const viewContact = useCallback(async (offerId: string) => {
    const { data, error } = await supabase.rpc("assistance_contact", { p_offer_id: offerId });
    const row = !error && data && (data as { mobile: string | null; whatsapp: string | null }[])[0];
    setContactByOffer((prev) => ({ ...prev, [offerId]: row || "hidden" }));
  }, []);

  const markResolved = useCallback(async (postId: string) => {
    const { error } = await supabase
      .from("assistance_posts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", postId);
    if (!error) await fetchBoard();
  }, [fetchBoard]);

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }
  if (failed) {
    return <div className="pt-note warn">We couldn't load the Assistance Board just now. Please refresh.</div>;
  }

  const openPosts = posts.filter((p) => p.status === "open");
  const yourPosts = posts.filter((p) => p.is_own_post).length;
  const youveHelped = posts.filter((p) => p.my_offer_id && !p.is_own_post).length;
  const studentCount = openPosts.filter((p) => p.category === "student").length;
  const jobCount = openPosts.filter((p) => p.category === "job").length;
  const visible = filter === "all" ? posts : posts.filter((p) => p.category === filter);
  const country = posts[0]?.country ?? null;

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div className="pt-sec-title">Assistance Board{country ? ` · ${country}` : ""}</div>
          <p className="pt-sec-note" style={{ marginBottom: 0 }}>
            Student and job requests from NRI members in your country. Replies go through the
            platform — your phone number and email are never shown until you choose to share them.
          </p>
        </div>
        <button className="pt-btn pt-btn-go" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Post a request"}
        </button>
      </div>

      {showForm && (
        <section className="pt-card" style={{ marginBottom: 16 }}>
          <div className="pt-card-b">
            <div className="pt-radio-row" style={{ marginBottom: 14 }}>
              {(["student", "job"] as Category[]).map((c) => (
                <label key={c} className={`pt-chk ${postCategory === c ? "on" : ""}`}>
                  <input type="radio" checked={postCategory === c} onChange={() => setPostCategory(c)} />
                  {CATEGORY_LABEL[c]}
                </label>
              ))}
            </div>
            <div className="pt-field">
              <label>Title</label>
              <input
                className="pt-inp" value={postTitle} maxLength={140}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="e.g. Blocked-account guarantor for university admission"
              />
            </div>
            <div className="pt-field">
              <label>Details</label>
              <textarea
                className="pt-inp" value={postDescription} rows={3}
                onChange={(e) => setPostDescription(e.target.value)}
                placeholder="What do you need help with, and by when?"
              />
            </div>
            {postError && <div className="pt-note warn" style={{ marginBottom: 12 }}>{postError}</div>}
            <button className="pt-btn pt-btn-go" disabled={posting || !postTitle.trim() || !postDescription.trim()} onClick={() => void submitPost()}>
              {posting ? "Posting…" : "Post to the board"}
            </button>
          </div>
        </section>
      )}

      <div className="pt-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Open in {country ?? "your country"}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{openPosts.length}</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>You've offered to help</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{youveHelped}</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Your posts</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{yourPosts}</div>
        </div>
      </div>

      <div className="row" style={{ gap: 7, marginBottom: 13, flexWrap: "wrap" }}>
        <button className="pt-btn pt-btn-sm" style={filter === "all" ? { background: "var(--navy)", color: "#fff" } : { background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-2)" }} onClick={() => setFilter("all")}>
          All {openPosts.length}
        </button>
        <button className="pt-btn pt-btn-out pt-btn-sm" style={filter === "student" ? { borderColor: "var(--navy)", color: "var(--navy)" } : undefined} onClick={() => setFilter("student")}>
          Student · {studentCount}
        </button>
        <button className="pt-btn pt-btn-out pt-btn-sm" style={filter === "job" ? { borderColor: "var(--navy)", color: "var(--navy)" } : undefined} onClick={() => setFilter("job")}>
          Job · {jobCount}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="pt-card" style={{ padding: 30, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>
          No requests here yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((p) => {
            const contact = p.my_offer_id ? contactByOffer[p.my_offer_id] : undefined;
            return (
              <div key={p.id} className="pt-card" style={{ display: "flex", overflow: "hidden" }}>
                <div style={{ width: 4, flex: "0 0 4px", background: p.category === "student" ? "var(--saffron)" : "var(--navy)" }} />
                <div style={{ flex: 1, padding: "14px 16px" }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className={`pt-pill ${CATEGORY_PILL[p.category]}`}>{CATEGORY_LABEL[p.category]}</span>
                    {p.status !== "open" && <span className="pt-pill" style={{ background: "var(--line-2)", color: "var(--ink-3)" }}>{p.status === "resolved" ? "Resolved" : "Closed"}</span>}
                  </div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>{p.title}</h4>
                  <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 8 }}>{p.description}</p>
                  <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                    {p.poster_name}
                    {p.city ? ` · ${p.city}` : ""} · {timeAgo(p.created_at)} ·{" "}
                    {p.offer_count === 0 ? "no offers yet" : `${p.offer_count} member${p.offer_count === 1 ? "" : "s"} offered`}
                  </div>

                  {p.is_own_post && (
                    <div style={{ marginTop: 10 }}>
                      <button className="pt-btn pt-btn-out pt-btn-sm" onClick={() => void toggleOffers(p.id)}>
                        {expandedId === p.id ? "Hide offers" : `View offers (${p.offer_count})`}
                      </button>
                      {p.status === "open" && (
                        <button className="pt-btn pt-btn-out pt-btn-sm" style={{ marginLeft: 8 }} onClick={() => void markResolved(p.id)}>
                          Mark resolved
                        </button>
                      )}
                      {expandedId === p.id && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          {(offersByPost[p.id] ?? []).length === 0 ? (
                            <div style={{ fontSize: 12, color: "var(--ink-4)" }}>No offers yet.</div>
                          ) : (
                            (offersByPost[p.id] ?? []).map((o) => (
                              <div key={o.offer_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "9px 11px", background: "var(--card-2)", borderRadius: "var(--r-sm)" }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>{o.helper_name}</div>
                                  {o.message && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{o.message}</div>}
                                </div>
                                {o.contact_shared ? (
                                  <span className="pt-pill pt-p-green">Contact shared</span>
                                ) : (
                                  <button className="pt-btn pt-btn-go pt-btn-sm" onClick={() => void shareContact(p.id, o.offer_id)}>
                                    Share my contact
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!p.is_own_post && p.my_offer_id && (
                    <div style={{ marginTop: 10 }}>
                      <span className="pt-pill" style={{ background: "var(--line-2)", color: "var(--ink-3)" }}>You offered to help</span>
                      {p.my_shared && (
                        contact ? (
                          <div style={{ marginTop: 8, fontSize: 12.5 }}>
                            {contact !== "hidden" && contact.whatsapp && <div>WhatsApp: {contact.whatsapp}</div>}
                            {contact !== "hidden" && contact.mobile && <div>Mobile: {contact.mobile}</div>}
                            {(contact === "hidden" || (!contact.whatsapp && !contact.mobile)) && (
                              <div style={{ color: "var(--ink-4)" }}>No phone number on file.</div>
                            )}
                          </div>
                        ) : (
                          <button className="pt-btn pt-btn-out pt-btn-sm" style={{ marginLeft: 8 }} onClick={() => void viewContact(p.my_offer_id!)}>
                            View shared contact
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {!p.is_own_post && !p.my_offer_id && p.status === "open" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14, justifyContent: "center" }}>
                    {offeringId === p.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 200 }}>
                        <textarea
                          className="pt-inp" rows={2} value={offerMessage} placeholder="A short note (optional)"
                          onChange={(e) => setOfferMessage(e.target.value)}
                        />
                        <button className="pt-btn pt-btn-go pt-btn-sm" disabled={offering} onClick={() => void submitOffer(p.id)}>
                          {offering ? "Sending…" : "Send offer"}
                        </button>
                        <button className="pt-btn pt-btn-out pt-btn-sm" onClick={() => { setOfferingId(null); setOfferMessage(""); }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button className="pt-btn pt-btn-go pt-btn-sm" onClick={() => setOfferingId(p.id)}>
                        Offer help
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-note" style={{ marginTop: 16 }}>
        <b>How this works.</b> Posting a request makes it visible to every NRI Wing member in your
        country, and to country coordinators. Your name and city are shown; your phone number and
        email are not. When you offer help, the requester decides whether to share contact details.
      </div>
    </div>
  );
}
