import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * /c/:shareId — the campaign link a member posts.
 *
 * Counts the click and forwards. The visitor is not asked to log in and
 * nothing about them is recorded beyond "this link was followed, at this
 * time" — register_click() writes only share_id and a timestamp. That is
 * deliberate: a public campaign link should not become a log of who read
 * party material.
 *
 * An unknown or deleted link sends the visitor to the home page rather
 * than showing an error. They clicked something a friend posted; a
 * stack trace is not a useful reply.
 */
export default function CampaignRedirect() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  // React 18 StrictMode mounts effects twice in development. Without
  // this guard every click would be counted twice locally, which is the
  // sort of thing that quietly doubles a campaign report.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    (async () => {
      if (!shareId) {
        navigate("/", { replace: true });
        return;
      }

      const { data, error } = await supabase.rpc("register_click", {
        p_share_id: shareId,
      });

      // A failure to count must never block the visitor — they came to
      // read something, and our analytics are not their problem.
      if (error) console.error("register_click failed:", error);

      const target = typeof data === "string" ? data : null;
      if (target) {
        window.location.replace(target);
      } else {
        navigate("/", { replace: true });
      }
    })();
  }, [shareId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent
                        rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Taking you there…</p>
      </div>
    </div>
  );
}
