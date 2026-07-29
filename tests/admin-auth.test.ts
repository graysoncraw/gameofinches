import assert from "node:assert/strict";
import test from "node:test";
import {
  isSameOrigin,
  isSecureRequest,
} from "../app/lib/request-security.ts";

test("same-origin checks honor Docker and reverse-proxy headers", () => {
  const direct = new Request("http://0.0.0.0:3000/api/admin/session", {
    headers: {
      host: "127.0.0.1:3100",
      origin: "http://127.0.0.1:3100",
    },
  });
  assert.equal(isSameOrigin(direct), true);
  assert.equal(isSecureRequest(direct), false);

  const proxied = new Request("http://app:3000/api/admin/session", {
    headers: {
      host: "app:3000",
      origin: "https://league.example.com",
      "x-forwarded-host": "league.example.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isSameOrigin(proxied), true);
  assert.equal(isSecureRequest(proxied), true);

  const crossOrigin = new Request("http://app:3000/api/admin/session", {
    headers: {
      host: "league.example.com",
      origin: "https://attacker.example",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isSameOrigin(crossOrigin), false);
});
