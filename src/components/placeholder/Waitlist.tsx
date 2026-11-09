import { useId, useState, type FormEvent } from "react";
import type { JoinResponse } from "../../lib/waitlist/contract";

type Phase = { name: "idle" } | { name: "sending" } | { name: "sent"; email: string } | { name: "error"; message: string };

function WaitlistCard({ onClose }: { onClose?: () => void }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPhase({ name: "sending" });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      const body = (await response.json()) as JoinResponse;
      setPhase(body.status === "pending" ? { name: "sent", email: email.trim() } : { name: "error", message: body.message });
    } catch {
      setPhase({ name: "error", message: "Something went wrong. Please try again in a moment." });
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="ph-card">
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="ph-card__close">
          ×
        </button>
      )}
      <h2 id={`${id}-title`} className="ph-card__title">
        We are still waking up
      </h2>
      <p className="ph-card__caption">Join the waitlist when we are ready</p>

      {phase.name === "sent" ? (
        <p role="status" className="ph-card__sent">
          Almost there. Please confirm your email address: we sent a link to {phase.email}. It is valid for 48 hours.
        </p>
      ) : (
        <form onSubmit={submit} className="ph-card__form">
          <label htmlFor={`${id}-email`} className="sr-only">
            Email address
          </label>
          <div className="ph-card__row">
            <input
              id={`${id}-email`}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ph-card__input"
            />
            <button type="submit" disabled={phase.name === "sending"} className="ph-card__submit">
              {phase.name === "sending" ? "Joining…" : "Join"}
            </button>
          </div>
          <label className="ph-card__consent">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree to receive emails from g10s, including news and marketing. Unsubscribe anytime. See the{" "}
              <a href="/privacy">privacy policy</a>.
            </span>
          </label>
          {phase.name === "error" && (
            <p role="alert" className="ph-card__error">
              {phase.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

/**
 * Desktop: a half-transparent card in the lower right, fully visible on hover or focus, above the logo.
 * Mobile: an underlined "Join the waitlist" link near the bottom centre that fades the card in.
 */
export default function Waitlist() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="ph-waitlist-desktop">
        <WaitlistCard />
      </div>

      <div className="ph-waitlist-mobile">
        {open ? (
          <div className="ph-waitlist-mobile__card">
            <WaitlistCard onClose={() => setOpen(false)} />
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="ph-waitlist-mobile__open">
            Join the waitlist
          </button>
        )}
      </div>
    </>
  );
}
