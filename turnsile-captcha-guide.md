# Cloudflare Turnstile — Implementation Guide

A complete, framework-agnostic guide to adding Cloudflare Turnstile CAPTCHA to any web application. The pattern below uses **explicit execution** (challenge runs on submit rather than on page load), a **server-side siteverify** step, and optional **dev-mode test keys** so local development never requires real credentials.

---

## 1. What you are building

```
┌──────────────┐   1. user submits form       ┌────────────────────┐
│   Browser    │ ───────────────────────────▶ │  Your backend API  │
│              │ ◀─────── token ───────────── │  /verify-turnstile │
│  Turnstile   │                              └────────┬───────────┘
│   widget     │                                       │ 2. POST siteverify
└──────────────┘                                       ▼
                                         ┌─────────────────────────────┐
                                         │ challenges.cloudflare.com   │
                                         │ /turnstile/v0/siteverify    │
                                         └─────────────────────────────┘
```

1. Browser renders a Turnstile widget. Widget produces a short-lived token.
2. Frontend sends the token to your backend.
3. Backend POSTs the token + your secret to Cloudflare's `siteverify` endpoint.
4. Cloudflare returns `{ success: true|false }`. Backend decides whether to accept the action.

---

## 2. Prerequisites

1. Create a site in the Cloudflare dashboard → **Turnstile** → **Add site**.
2. Add the domains your widget will run on (include `localhost` for local dev if not using test keys).
3. Copy:
   - **Site key** (public, safe to ship to browser)
   - **Secret key** (server-only, never exposed)
4. Pick a widget mode: *Managed* (recommended), *Non-interactive*, or *Invisible*.

---

## 3. Environment variables

Use two environments: one set for production keys, one for dev test keys.

```bash
# Public — exposed to the browser
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
PUBLIC_TURNSTILE_DEV_MODE=always-pass   # optional; only read in non-production

# Server-only — never ship to the browser
TURNSTILE_SECRET_KEY=0x4AAAAAAA...
TURNSTILE_DEV_MODE=always-pass          # optional; only read in non-production
```

> **Framework naming:** Next.js uses `NEXT_PUBLIC_*`, Vite uses `VITE_*`, etc. Use whatever prefix your bundler exposes to the browser.

### Cloudflare-provided test keys

These bypass real verification and are safe to commit. They only work because Cloudflare special-cases them on the siteverify endpoint.

| Behavior            | Site key (public)           | Secret key (server)                   |
| ------------------- | --------------------------- | ------------------------------------- |
| Always passes       | `1x00000000000000000000AA`  | `1x0000000000000000000000000000000AA` |
| Always fails        | `2x00000000000000000000AB`  | `2x0000000000000000000000000000000AA` |
| Forces interaction  | `3x00000000000000000000FF`  | —                                     |
| Token already spent | —                           | `3x0000000000000000000000000000000AA` |

Full list: <https://developers.cloudflare.com/turnstile/troubleshooting/testing/>.

---

## 4. Frontend — rendering the widget

You can use the raw `<script>` loader or any framework wrapper. The React example below uses [`@marsidev/react-turnstile`](https://github.com/marsidev/react-turnstile), which is a thin typed wrapper around Cloudflare's script.

```bash
npm install @marsidev/react-turnstile
```

### 4a. Site-key resolution (dev-mode aware)

```ts
const DEV_SITEKEY_MAP: Record<string, string> = {
  'always-pass':       '1x00000000000000000000AA',
  'always-fail':       '2x00000000000000000000AB',
  'force-interaction': '3x00000000000000000000FF',
};

export const TURNSTILE_SITE_KEY = (() => {
  const devMode = process.env.PUBLIC_TURNSTILE_DEV_MODE;
  if (process.env.NODE_ENV !== 'production' && devMode && DEV_SITEKEY_MAP[devMode]) {
    return DEV_SITEKEY_MAP[devMode];
  }
  return process.env.PUBLIC_TURNSTILE_SITE_KEY;
})();
```

### 4b. The widget with *explicit execution*

The widget is mounted but idle. It only produces a token when `.execute()` is called on submit. This keeps the challenge out of the initial page render and tightly binds the token to the user's action.

```tsx
import { useCallback, useRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export function SignupForm() {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef  = useRef<((err: Error) => void) | null>(null);

  // Wrap the widget's async callback lifecycle in a promise so the
  // submit handler can simply `await executeTurnstile()`.
  const executeTurnstile = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!turnstileRef.current) {
        reject(new Error('Turnstile not ready'));
        return;
      }
      resolveRef.current = resolve;
      rejectRef.current = reject;
      turnstileRef.current.execute();
    });
  }, []);

  const handleSuccess = useCallback((token: string) => {
    resolveRef.current?.(token);
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  const handleError = useCallback(() => {
    rejectRef.current?.(new Error('Turnstile verification failed'));
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  const handleExpire = useCallback(() => {
    rejectRef.current?.(new Error('Turnstile token expired'));
    resolveRef.current = null;
    rejectRef.current = null;
    turnstileRef.current?.reset();
  }, []);

  const onSubmit = async (values: FormValues) => {
    let token: string;
    try {
      token = await executeTurnstile();
    } catch {
      // Show a generic error; reset widget so the user can retry.
      turnstileRef.current?.reset();
      return;
    }

    const res = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const { allowed } = await res.json();
    if (!allowed) {
      // Reject (or silently drop — see §7).
      turnstileRef.current?.reset();
      return;
    }

    // Proceed with the protected action (signup, checkout, etc.)
    await submitProtectedAction(values);
    turnstileRef.current?.reset(); // always reset after use; tokens are single-use
  };

  return (
    <form onSubmit={/* ... */}>
      {/* your form fields */}

      {TURNSTILE_SITE_KEY && (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          options={{
            execution:  'execute', // do not challenge until .execute() is called
            appearance: 'always',  // show the widget so users see a passive check
            theme:      'light',
            size:       'normal',
          }}
        />
      )}
    </form>
  );
}
```

### Key frontend facts

- **Tokens are single-use.** Always call `.reset()` after submit (success or failure) so the next submission gets a fresh token.
- **Tokens expire in ~5 minutes.** Handle `onExpire` by rejecting the pending promise and resetting.
- **Implicit vs explicit execution.** Use `execution: 'execute'` (explicit) for forms so the token is generated at the moment of submit, tightly coupled to user intent. Use implicit mode only for always-visible "prove you're human before you enter" gates.
- **Degrade gracefully.** If no site key is configured, skip rendering and skip the token requirement on the backend (useful for local dev).

### Vanilla JS equivalent

If you are not using React, load the script yourself:

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
<div id="cf-turnstile"></div>

<script>
  const widgetId = turnstile.render('#cf-turnstile', {
    sitekey:  window.TURNSTILE_SITE_KEY,
    callback: (token) => { window.__cfToken = token; },
    'error-callback':   () => turnstile.reset(widgetId),
    'expired-callback': () => turnstile.reset(widgetId),
    execution: 'execute',
  });

  async function submit() {
    turnstile.execute(widgetId);
    // …await the callback to set window.__cfToken, then POST it…
  }
</script>
```

---

## 5. Backend — verifying the token

The siteverify call is a standard `POST` of form-encoded data. Any language works; the pattern is identical.

### 5a. Endpoint contract

```
POST /api/verify-turnstile
Content-Type: application/json

{ "token": "<token from widget>" }

→ 200  { "allowed": true  }   // verified
→ 200  { "allowed": false }   // failed
→ 400  { error: "..."     }   // malformed input / misconfiguration
```

Keep the endpoint **unauthenticated** — the whole point is protecting sign-up / first-touch flows.

### 5b. Handler (TypeScript / Node / fetch)

```ts
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const DEV_SECRET_MAP: Record<string, string> = {
  'always-pass': '1x0000000000000000000000000000000AA',
  'always-fail': '2x0000000000000000000000000000000AA',
};

function resolveSecret(): string | undefined {
  const devMode = process.env.TURNSTILE_DEV_MODE;
  if (process.env.NODE_ENV !== 'production' && devMode && DEV_SECRET_MAP[devMode]) {
    return DEV_SECRET_MAP[devMode];
  }
  return process.env.TURNSTILE_SECRET_KEY;
}

export async function handleVerifyTurnstile(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return Response.json({ error: 'Token is required' }, { status: 400 });
  }

  const secret = resolveSecret();
  if (!secret) {
    return Response.json({ error: 'Verification is not configured' }, { status: 500 });
  }

  // Forwarded client IP improves accuracy when multiple IPs target a single site key.
  const userIp = getClientIp(req);

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (userIp) form.append('remoteip', userIp);

  let outcome: { success: boolean; 'error-codes'?: string[]; action?: string; cdata?: string };
  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body: form });
    outcome = await res.json();
  } catch (err) {
    // Network / Cloudflare outage: fail closed. Log to your error tracker.
    return Response.json({ error: 'Verification failed' }, { status: 502 });
  }

  return Response.json({ allowed: outcome.success === true });
}
```

### 5c. Extracting the client IP

```ts
function getClientIp(req: Request): string | null {
  // Behind a proxy/CDN, trust the first entry in X-Forwarded-For.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-real-ip')
      ?? null;
}
```

`remoteip` is optional but recommended — Cloudflare uses it to detect token re-use from different IPs.

### 5d. The siteverify response

```json
{
  "success": true,
  "challenge_ts": "2026-04-20T12:34:56.789Z",
  "hostname": "example.com",
  "action": "signup",
  "cdata": "optional-custom-data",
  "error-codes": []
}
```

Common `error-codes`:

| Code                              | Meaning                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `missing-input-secret`            | Your server didn't send `secret`.                                   |
| `invalid-input-secret`            | Secret is malformed or for the wrong site.                          |
| `missing-input-response`          | Your server didn't send `response`.                                 |
| `invalid-input-response`          | Token is malformed, never existed, or already used.                 |
| `timeout-or-duplicate`            | Token expired (>5 min) or was already redeemed. **Common.**         |
| `bad-request`                     | Request was malformed.                                              |
| `internal-error`                  | Cloudflare-side issue — safe to retry once.                         |

Treat `success !== true` as a rejection. Do not trust the rest of the payload until you have confirmed `success`.

### 5e. One-time-use enforcement

Cloudflare's own side-effect: a token can only be redeemed once. If you also call siteverify from a secondary risk-scoring pipeline, make sure **only one** code path redeems the token — the second call will fail with `timeout-or-duplicate`.

---

## 6. Wiring it into the protected flow

Two common patterns:

**A. Frontend calls `/verify-turnstile` first, then calls the protected endpoint.**
Simple, and the protected endpoint stays oblivious. Downside: a malicious client can skip the verification step and call the protected endpoint directly — so the protected endpoint MUST also enforce it (see B).

**B. Frontend passes the token through to the protected endpoint, which verifies internally.**
Strictly better. The token rides along in the same request that performs the action:

```ts
await fetch('/api/signup', {
  method: 'POST',
  body: JSON.stringify({ email, password, captchaToken: token }),
});
```

The signup handler calls `siteverify` before doing any real work and aborts on failure. Use pattern B whenever possible, or combine both.

---

## 7. Optional hardening

### 7a. Silent rejection ("shadow-ban" bots)

When verification fails on a signup flow, returning an obvious error teaches bots exactly where the gate is. Instead, return the same *success-looking* response you'd return on a real signup — but skip the account creation:

```ts
if (!verified) {
  // Don't create the account; don't send the email.
  // Return the UI state a successful signup would produce.
  return { step: 'check-your-email' };
}
```

Pair this with analytics so you can still see rejection counts, but attackers cannot distinguish rejection from success by response shape or timing.

### 7b. Runtime kill-switch

Store a boolean like `enable_captcha` in your config/DB so ops can disable the challenge instantly if Cloudflare has an outage or you need to unblock users:

```ts
if (!settings.enable_captcha) {
  return { allowed: true }; // bypass, but log it
}
```

### 7c. Layered defense

Turnstile is one layer. Pair it with:

- **Honeypot fields** — hidden inputs filled only by dumb bots; reject silently.
- **Rate limiting per IP / email** on the signup endpoint.
- **Risk scoring** (email reputation, disposable domains, velocity) as a second gate.
- **Action names** — Cloudflare supports an `action` param on the widget (`<Turnstile options={{ action: 'signup' }} />`) that is echoed back in the siteverify response. Verify it server-side to ensure the token was minted for the right flow.

### 7d. Analytics

Track `captcha_succeeded` / `captcha_rejected` events with device/IP context so you can observe attack patterns without coupling them to user identity.

---

## 8. Testing

### Unit tests (backend)

- **Rejects empty/missing token** → 400.
- **Missing secret** → 500 / throws configured error.
- **Network failure calling siteverify** → fails closed.
- **Cloudflare returns `success: false`** → `{ allowed: false }`.
- **Cloudflare returns `success: true`** → `{ allowed: true }`.
- **Forwards `remoteip`** when the request has a client IP header.

Mock `fetch` to return the siteverify JSON directly — do not hit Cloudflare from tests.

### E2E / manual

1. Set `TURNSTILE_DEV_MODE=always-fail` + `PUBLIC_TURNSTILE_DEV_MODE=always-fail`.
2. Submit the form → expect rejection path.
3. Flip both to `always-pass` → expect success path.
4. Use `force-interaction` (frontend only) to verify the UI behaves when a real challenge is rendered.

---

## 9. Production checklist

- [ ] Real site key set in frontend env (`PUBLIC_TURNSTILE_SITE_KEY`).
- [ ] Real secret key set in backend env (`TURNSTILE_SECRET_KEY`).
- [ ] Dev-mode env vars **unset** in production.
- [ ] Site domains (including www / apex) added to the Turnstile site in Cloudflare.
- [ ] Backend fails closed on network errors to siteverify.
- [ ] Widget is reset after every submit (success and failure).
- [ ] Token is verified on the server for the *action itself*, not only on a standalone endpoint.
- [ ] Errors from siteverify are logged to your error tracker with `error-codes`.
- [ ] A runtime kill-switch exists to disable CAPTCHA without a deploy.
- [ ] A test key path exists so CI/local dev never need real credentials.

---

## 10. References

- Turnstile docs: <https://developers.cloudflare.com/turnstile/>
- Client-side rendering API: <https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/>
- Server-side validation: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- Testing & dummy keys: <https://developers.cloudflare.com/turnstile/troubleshooting/testing/>
- React wrapper used above: <https://github.com/marsidev/react-turnstile>
