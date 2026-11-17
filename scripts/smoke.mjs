import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const pages = [
  "/",
  "/teams",
  "/teams/retired",
  "/history",
  "/history/seasons",
  "/history/playoffs",
  "/records",
  "/records/rivalries",
  "/records/performances",
  "/records/superlatives",
  "/records/book",
  "/records/elo",
  "/drafts",
  "/moves",
  "/keepers",
  "/keepers/rules",
  "/keepers/lab",
  "/admin",
];

let home = "";
for (const path of pages) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(90_000),
  });
  const html = await response.text();
  assert.equal(response.status, 200, `${path} must render`);
  assert.ok(
    !html.includes("The data feed is taking a timeout."),
    `${path} must load its data`,
  );
  assert.ok(
    !html.includes("draft-clock"),
    `${path} must not contain the removed countdown`,
  );
  if (path === "/") home = html;
  console.log(`OK ${path}`);
}

assert.ok(
  home.includes("This week in inches."),
  "Homepage must include the weekly roundup",
);
const profilePath = home.match(/href="(\/teams\/\d+)"/)?.[1];
assert.ok(profilePath, "Homepage must link to a real team profile");
assert.equal(
  (await fetch(new URL(profilePath, base))).status,
  200,
  "Team profile must render",
);

const assets = [
  ...new Set(
    [
      ...home.matchAll(
        /(?:src|href)="(\/_next\/static\/[^"?]+(?:\?[^" ]*)?)"/g,
      ),
    ].map((match) => match[1]),
  ),
];
assert.ok(assets.length > 0, "Homepage must have build assets");
for (const asset of assets)
  assert.equal(
    (await fetch(new URL(asset.replaceAll("&amp;", "&"), base))).status,
    200,
    `Asset ${asset} must be served`,
  );

const season = home.replace(/<!--[\s\S]*?-->/g, "").match(/(\d{4}) SEASON/)?.[1];
assert.ok(season, "Homepage must identify the league season");
const transactionResponse = await fetch(
  new URL(`/api/transactions?season=${season}`, base),
);
assert.equal(
  transactionResponse.status,
  200,
  "Current transaction feed must load",
);
assert.ok(Array.isArray((await transactionResponse.json()).transactions));
assert.equal((await fetch(new URL("/not-a-section", base))).status, 404);
console.log(
  `OK profile, ${assets.length} assets, transactions, and unknown-route handling`,
);
