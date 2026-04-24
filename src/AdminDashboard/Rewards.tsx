import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

type Reward = { reason: string; credits: number };
type Perk = {
  id: string;
  name: string;
  description: string | null;
  cost_credits: number;
  is_active: boolean;
  created_at: string;
};
type Redemption = {
  id: string;
  user_id: string;
  perk_name: string;
  cost_credits: number;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  // joined from profiles
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  public_user_code?: string | null;
  credits_balance?: number | null;
};

type Tab = "values" | "perks" | "redemptions";

export default function Rewards() {
  const [tab, setTab] = useState<Tab>("redemptions");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /* ---------------- REWARD VALUES ---------------- */
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardEdits, setRewardEdits] = useState<Record<string, number>>({});

  const fetchRewards = async () => {
    const { data } = await supabase
      .from("referral_rewards")
      .select("reason, credits")
      .order("reason", { ascending: true });
    if (data) {
      setRewards(data as Reward[]);
      const map: Record<string, number> = {};
      (data as Reward[]).forEach((r) => (map[r.reason] = r.credits));
      setRewardEdits(map);
    }
  };

  const saveReward = async (reason: string) => {
    setErr(null);
    setInfo(null);
    const credits = rewardEdits[reason];
    if (!Number.isFinite(credits) || credits < 0) {
      setErr("Credits must be a non-negative number.");
      return;
    }
    const { error } = await supabase
      .from("referral_rewards")
      .update({ credits, updated_at: new Date().toISOString() })
      .eq("reason", reason);
    if (error) setErr(error.message);
    else {
      setInfo(`Updated "${reason}" → ${credits} credits`);
      fetchRewards();
    }
  };

  /* ---------------- PERKS ---------------- */
  const [perks, setPerks] = useState<Perk[]>([]);
  const [perkName, setPerkName] = useState("");
  const [perkDesc, setPerkDesc] = useState("");
  const [perkCost, setPerkCost] = useState<number>(100);
  const [editingPerkId, setEditingPerkId] = useState<string | null>(null);

  const fetchPerks = async () => {
    const { data } = await supabase
      .from("reward_perks")
      .select("id, name, description, cost_credits, is_active, created_at")
      .order("cost_credits", { ascending: true });
    if (data) setPerks(data as Perk[]);
  };

  const resetPerkForm = () => {
    setEditingPerkId(null);
    setPerkName("");
    setPerkDesc("");
    setPerkCost(100);
  };

  const savePerk = async () => {
    setErr(null);
    setInfo(null);
    const trimmed = perkName.trim();
    if (!trimmed) {
      setErr("Perk name is required.");
      return;
    }
    if (!Number.isFinite(perkCost) || perkCost <= 0) {
      setErr("Cost must be a positive number of credits.");
      return;
    }
    if (editingPerkId) {
      const { error } = await supabase
        .from("reward_perks")
        .update({
          name: trimmed,
          description: perkDesc.trim() || null,
          cost_credits: perkCost,
        })
        .eq("id", editingPerkId);
      if (error) return setErr(error.message);
      setInfo("Perk updated.");
    } else {
      const { error } = await supabase.from("reward_perks").insert({
        name: trimmed,
        description: perkDesc.trim() || null,
        cost_credits: perkCost,
      });
      if (error) return setErr(error.message);
      setInfo("Perk added.");
    }
    resetPerkForm();
    fetchPerks();
  };

  const startEditPerk = (p: Perk) => {
    setEditingPerkId(p.id);
    setPerkName(p.name);
    setPerkDesc(p.description || "");
    setPerkCost(p.cost_credits);
    setErr(null);
    setInfo(null);
  };

  const togglePerkActive = async (p: Perk) => {
    const { error } = await supabase
      .from("reward_perks")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) setErr(error.message);
    else fetchPerks();
  };

  const removePerk = async (p: Perk) => {
    if (!confirm(`Delete perk "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("reward_perks").delete().eq("id", p.id);
    if (error) setErr(error.message);
    else {
      setInfo(`Deleted "${p.name}".`);
      fetchPerks();
    }
  };

  /* ---------------- REDEMPTIONS ---------------- */
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchRedemptions = async () => {
    // Two-step: load redemptions, then load profile info for display.
    const baseQuery = supabase
      .from("redemptions")
      .select("id, user_id, perk_name, cost_credits, status, admin_note, created_at")
      .order("created_at", { ascending: false });

    const { data: rows } = showAll
      ? await baseQuery.limit(100)
      : await baseQuery.eq("status", "pending").limit(100);

    if (!rows) {
      setRedemptions([]);
      return;
    }
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, public_user_code, credits_balance")
        .in("id", userIds);
      (profs || []).forEach((p: any) => (profileMap[p.id] = p));
    }
    setRedemptions(
      rows.map((r: any) => ({
        ...r,
        first_name: profileMap[r.user_id]?.first_name,
        last_name: profileMap[r.user_id]?.last_name,
        email: profileMap[r.user_id]?.email,
        public_user_code: profileMap[r.user_id]?.public_user_code,
        credits_balance: profileMap[r.user_id]?.credits_balance,
      }))
    );
  };

  const decide = async (r: Redemption, status: "approved" | "rejected") => {
    setErr(null);
    setInfo(null);
    setDeciding(r.id);
    const { error } = await supabase
      .from("redemptions")
      .update({
        status,
        admin_note: noteDraft[r.id]?.trim() || null,
      })
      .eq("id", r.id);
    setDeciding(null);
    if (error) {
      // trigger will RAISE EXCEPTION on insufficient balance; surface it clearly
      setErr(error.message);
      return;
    }
    setInfo(
      status === "approved"
        ? `Approved "${r.perk_name}" — ${r.cost_credits} credits deducted.`
        : `Rejected "${r.perk_name}".`
    );
    setNoteDraft((d) => ({ ...d, [r.id]: "" }));
    fetchRedemptions();
  };

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    fetchRewards();
    fetchPerks();
    fetchRedemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRedemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  /* ---------------- UI ---------------- */
  const tabBtn = (key: Tab, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`px-4 py-2 text-sm font-semibold rounded-lg border ${
        tab === key
          ? "bg-primary-600 text-white border-primary-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary-600 mb-1">Rewards</h1>
      <p className="text-gray-500 mb-6">
        Configure referral payouts, manage the perks catalogue, and approve redemptions.
      </p>

      <div className="flex gap-2 mb-5">
        {tabBtn("redemptions", "Redemptions")}
        {tabBtn("perks", "Perks")}
        {tabBtn("values", "Reward Values")}
      </div>

      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded mb-4">
          {err}
        </p>
      )}
      {info && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded mb-4">
          {info}
        </p>
      )}

      {/* ============ REDEMPTIONS ============ */}
      {tab === "redemptions" && (
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {showAll ? "All Redemptions (100)" : "Pending Redemptions"}
            </h2>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show all
            </label>
          </div>

          {redemptions.length === 0 ? (
            <p className="text-sm text-gray-500">
              {showAll ? "No redemptions yet." : "No pending redemptions."}
            </p>
          ) : (
            <div className="space-y-3">
              {redemptions.map((r) => {
                const userLabel =
                  [r.first_name, r.last_name].filter(Boolean).join(" ") ||
                  r.email ||
                  r.user_id;
                const badge =
                  r.status === "approved"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : r.status === "rejected"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200";

                return (
                  <div
                    key={r.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">
                          {r.perk_name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {userLabel}
                          {r.public_user_code && (
                            <span className="font-mono">
                              {" · "}
                              {r.public_user_code}
                            </span>
                          )}
                          {" · "}
                          balance: ⚡ {r.credits_balance ?? 0}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Requested {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-bold text-sm">
                          ⚡ {r.cost_credits}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${badge}`}
                        >
                          {r.status}
                        </span>
                      </div>
                    </div>

                    {r.admin_note && r.status !== "pending" && (
                      <p className="text-[12px] text-gray-700 bg-gray-50 border border-gray-100 rounded p-2 mt-2">
                        <span className="font-bold">Admin note:</span> {r.admin_note}
                      </p>
                    )}

                    {r.status === "pending" && (
                      <div className="mt-3 flex flex-wrap gap-2 items-center">
                        <input
                          className="flex-1 min-w-[200px] border p-2 rounded text-sm"
                          placeholder="Optional note (shown to user)"
                          value={noteDraft[r.id] || ""}
                          onChange={(e) =>
                            setNoteDraft((d) => ({ ...d, [r.id]: e.target.value }))
                          }
                        />
                        <button
                          onClick={() => decide(r, "approved")}
                          disabled={deciding === r.id}
                          className="bg-green-600 text-white px-3 py-2 rounded text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          onClick={() => decide(r, "rejected")}
                          disabled={deciding === r.id}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ PERKS ============ */}
      {tab === "perks" && (
        <>
          <div className="bg-white border rounded-xl shadow-sm p-5 mb-5">
            <h2 className="text-lg font-semibold mb-4">
              {editingPerkId ? "Edit Perk" : "Add New Perk"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input
                className="border p-2 rounded"
                placeholder="Perk name (e.g. Meet & Greet Invite)"
                value={perkName}
                onChange={(e) => setPerkName(e.target.value)}
              />
              <input
                type="number"
                className="border p-2 rounded"
                placeholder="Cost in credits (e.g. 500)"
                value={perkCost}
                onChange={(e) => setPerkCost(Number(e.target.value))}
              />
            </div>
            <textarea
              className="w-full border p-2 rounded mb-3"
              rows={2}
              placeholder="Description (shown to user)"
              value={perkDesc}
              onChange={(e) => setPerkDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={savePerk}
                className="bg-primary-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
              >
                <Plus size={16} />
                {editingPerkId ? "Save Changes" : "Add Perk"}
              </button>
              {editingPerkId && (
                <button
                  onClick={resetPerkForm}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-4">All Perks</h2>
            {perks.length === 0 ? (
              <p className="text-sm text-gray-500">
                No perks yet. Add one to let users redeem credits.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perks.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-blue-50">
                        <td className="px-3 py-2 font-semibold">{p.name}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-sm truncate">
                          {p.description || "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-amber-700">
                          ⚡ {p.cost_credits}
                        </td>
                        <td className="px-3 py-2">
                          {p.is_active ? (
                            <span className="text-green-700 text-xs font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs font-semibold">
                              Hidden
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-3">
                            <button
                              onClick={() => startEditPerk(p)}
                              className="text-blue-600 text-xs inline-flex items-center gap-1"
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => togglePerkActive(p)}
                              className="text-gray-700 text-xs"
                            >
                              {p.is_active ? "Hide" : "Show"}
                            </button>
                            <button
                              onClick={() => removePerk(p)}
                              className="text-red-600 text-xs inline-flex items-center gap-1"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ REWARD VALUES ============ */}
      {tab === "values" && (
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-1">Referral Reward Values</h2>
          <p className="text-xs text-gray-500 mb-4">
            Credits posted automatically by triggers. Changes take effect immediately
            for future signups and referrals; past entries in the ledger are unchanged.
          </p>
          <div className="space-y-3">
            {rewards.map((r) => (
              <div
                key={r.reason}
                className="flex items-center gap-3 border rounded-lg p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold capitalize">
                    {r.reason === "active"
                      ? "Active referral (direct signup)"
                      : r.reason === "passive"
                      ? "Passive referral (one level up)"
                      : r.reason === "signup"
                      ? "Signup bonus (new user)"
                      : r.reason}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Current value: {r.credits} credits
                  </p>
                </div>
                <input
                  type="number"
                  className="border p-2 rounded w-28 text-center font-bold"
                  value={rewardEdits[r.reason] ?? r.credits}
                  onChange={(e) =>
                    setRewardEdits((m) => ({
                      ...m,
                      [r.reason]: Number(e.target.value),
                    }))
                  }
                />
                <button
                  onClick={() => saveReward(r.reason)}
                  className="bg-primary-600 text-white px-3 py-2 rounded text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
