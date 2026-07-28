import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../chatgpt-auth";

const FALLBACK_COMMISSIONER_EMAILS = ["graysoncraw4d@gmail.com"];

function configuredEmails() {
  let configured = "";
  try {
    configured =
      (env as unknown as { COMMISSIONER_EMAILS?: string })
        .COMMISSIONER_EMAILS ?? "";
  } catch {
    configured = process.env.COMMISSIONER_EMAILS ?? "";
  }

  const emails = configured
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(
    emails.length ? emails : FALLBACK_COMMISSIONER_EMAILS,
  );
}

export function isCommissionerEmail(email: string) {
  return configuredEmails().has(email.trim().toLowerCase());
}

export function isCommissioner(user: ChatGPTUser | null) {
  return Boolean(user && isCommissionerEmail(user.email));
}
