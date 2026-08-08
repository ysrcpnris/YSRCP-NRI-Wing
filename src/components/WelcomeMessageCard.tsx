import { renderParagraphs } from "../lib/richText";

export type WelcomeMessageData = {
  id: string;
  eyebrow: string | null;
  heading_te: string | null;
  subheading: string | null;
  body: string | null;
  signed_by_name: string | null;
  signed_by_title: string | null;
  signed_by_initials: string | null;
};

// Shared by the onboarding end-screen, the reshow banner, and the "read
// it again" surface in MyProfile — one rendering of a published welcome
// message, so all three look identical to what the admin editor preview
// already showed before publishing.
export default function WelcomeMessageCard({ message }: { message: WelcomeMessageData }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
    >
      <div
        className="px-7 pt-7 pb-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(122deg, var(--rail-bg) 0%, var(--navy) 52%, var(--green-deep) 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(circle at 82% 18%, #fff 0%, transparent 46%)" }}
        />
        <div className="relative">
          {message.eyebrow && (
            <div className="text-[11px] tracking-[0.22em] uppercase opacity-75 font-semibold">{message.eyebrow}</div>
          )}
          {message.heading_te && (
            <div
              className="text-2xl sm:text-3xl font-semibold mt-2"
              style={{ fontFamily: "var(--serif)", letterSpacing: "-0.015em", lineHeight: 1.2 }}
            >
              {message.heading_te}
            </div>
          )}
          {message.subheading && <div className="text-sm opacity-85 mt-2">{message.subheading}</div>}
        </div>
      </div>
      <div className="px-7 py-6" style={{ background: "var(--card)" }}>
        <div className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {renderParagraphs(message.body ?? "")}
        </div>
        {(message.signed_by_name || message.signed_by_title) && (
          <div
            className="flex items-center gap-3 pt-5 mt-5"
            style={{ borderTop: "1px solid var(--line-2)" }}
          >
            <div
              className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "linear-gradient(140deg, var(--navy) 0%, var(--green-deep) 100%)" }}
            >
              {message.signed_by_initials || "—"}
            </div>
            <div>
              {message.signed_by_name && (
                <div className="text-base font-semibold" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
                  {message.signed_by_name}
                </div>
              )}
              {message.signed_by_title && (
                <div className="text-xs" style={{ color: "var(--ink-4)" }}>{message.signed_by_title}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
