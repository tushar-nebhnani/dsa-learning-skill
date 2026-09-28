import type { Response } from "express";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const STYLES = `
:root {
  color-scheme: light dark;
  --bg: #f6f5f1; --card: #ffffff; --text: #1c1b18; --muted: #6b6960; --line: #e4e2da;
  --accent: #2f6f4f; --accent-soft: #e6f0ea;
  --g-bg: #ffffff; --g-border: #747775; --g-text: #1f1f1f; --g-hover: #f2f2f2;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #141412; --card: #1d1c1a; --text: #eeede8; --muted: #a3a197; --line: #2f2e2a;
    --accent: #7cc49d; --accent-soft: #1f2d25;
    --g-bg: #131314; --g-border: #8e918f; --g-text: #e3e3e3; --g-hover: #1f1f21;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
  background: var(--bg); color: var(--text);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.card {
  width: 100%; max-width: 400px; background: var(--card); border: 1px solid var(--line);
  border-radius: 16px; padding: 36px 32px 28px; box-shadow: 0 1px 2px rgb(0 0 0 / .04), 0 8px 24px rgb(0 0 0 / .06);
}
.mark {
  width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
  background: var(--accent-soft); color: var(--accent); margin-bottom: 20px;
}
h1 { font-size: 22px; line-height: 1.25; margin: 0 0 8px; letter-spacing: -0.01em; }
.lede { color: var(--muted); margin: 0 0 20px; }
.lede strong { color: var(--text); font-weight: 600; }
.google {
  display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 44px;
  border: 1px solid var(--g-border); border-radius: 22px; background: var(--g-bg); color: var(--g-text);
  font: 500 14px/1 Roboto, system-ui, sans-serif; text-decoration: none; transition: background .15s;
}
.google:hover { background: var(--g-hover); }
.google:focus-visible, .cancel:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cancel { display: block; text-align: center; margin-top: 14px; color: var(--muted); font-size: 14px; text-decoration: none; border-radius: 6px; }
.cancel:hover { color: var(--text); text-decoration: underline; }
.note { margin: 24px 0 0; font-size: 13px; color: var(--muted); text-align: center; }
`;

const MARK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M10.8 7.2 7.2 15.8M13.2 7.2l3.6 8.6"/></svg>`;


const GOOGLE_ICON = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="card">${body}</main>
</body>
</html>`;
}

function send(res: Response, status: number, html: string) {
  res
    .status(status)
    .set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      "X-Frame-Options": "DENY",
    })
    .send(html);
}

export function renderLoginPage(res: Response, options: { clientName: string; googleUrl: string; cancelUrl: string }) {
  const body = `
<div class="mark">${MARK_ICON}</div>
<h1>Sign in to DSA Progress</h1>
<p class="lede"><strong>${escapeHtml(options.clientName)}</strong> wants to connect to your DSA progress.</p>
<a class="google" href="${escapeHtml(options.googleUrl)}">${GOOGLE_ICON}<span>Continue with Google</span></a>
<a class="cancel" href="${escapeHtml(options.cancelUrl)}">Cancel</a>
<p class="note">First time here? Signing in creates your learner profile.</p>`;
  send(res, 200, page("Sign in · DSA Progress", body));
}

export function renderErrorPage(res: Response, status: number, message: string) {
  const body = `
<div class="mark">${MARK_ICON}</div>
<h1>Couldn't sign you in</h1>
<p class="lede">${escapeHtml(message)}</p>`;
  send(res, status, page("Sign-in problem · DSA Progress", body));
}
