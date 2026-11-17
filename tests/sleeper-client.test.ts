import assert from "node:assert/strict";
import test from "node:test";
import { createSleeperClient } from "../app/lib/sleeper/client.ts";
import { createRefreshCache } from "../app/lib/sleeper/refresh-cache.ts";

test("aborts hanging requests and stops after three attempts", async () => {
  let calls = 0;
  const client = createSleeperClient({
    timeoutMs: 5,
    sleep: async () => {},
    fetcher: async (_url, options) => {
      calls++;
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(
          () => resolve(Response.json({ late: true })),
          500,
        );
        options!.signal!.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(options!.signal!.reason);
          },
          { once: true },
        );
      });
    },
  });
  await assert.rejects(client("/hanging"), /request failed/);
  assert.equal(calls, 3);
});

test("retries throttling with a bounded Retry-After and rejects permanent errors immediately", async () => {
  const delays: number[] = [];
  let calls = 0;
  const client = createSleeperClient({
    fetcher: async () =>
      ++calls === 1
        ? new Response("", { status: 429, headers: { "retry-after": "999" } })
        : Response.json({ ok: true }),
    sleep: async (delay) => {
      delays.push(delay);
    },
  });
  assert.deepEqual(await client("/test"), { ok: true });
  assert.deepEqual(delays, [10_000]);
  let permanentCalls = 0;
  const permanent = createSleeperClient({
    fetcher: async () => {
      permanentCalls++;
      return new Response("", { status: 404 });
    },
  });
  await assert.rejects(permanent("/missing"), /404/);
  assert.equal(permanentCalls, 1);
});

test("retries network failures without exhausting the request slots", async () => {
  let calls = 0;
  const client = createSleeperClient({
    concurrency: 1,
    sleep: async () => {},
    fetcher: async (_url, options) => {
      assert.ok(options?.signal);
      if (++calls <= 3) throw new TypeError("Network unavailable");
      return Response.json({ recovered: true });
    },
  });
  await assert.rejects(client("/unavailable"), /request failed/);
  assert.deepEqual(await client("/recovered"), { recovered: true });
});

test("request concurrency includes JSON body reads and hands queued callers their slots", async () => {
  let active = 0;
  let peak = 0;
  const client = createSleeperClient({
    concurrency: 2,
    fetcher: async () => {
      peak = Math.max(peak, ++active);
      const response = Response.json({ ok: true });
      response.json = async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        active--;
        return { ok: true };
      };
      return response;
    },
  });
  const first = client("/first").then(() => client("/late-arrival"));
  await Promise.all([
    first,
    ...Array.from({ length: 12 }, () => client("/queued")),
  ]);
  assert.equal(peak, 2);
  assert.equal(active, 0);
});

test("snapshot cache coalesces concurrent callers and refreshes once per slot", async () => {
  let calls = 0;
  const cache = createRefreshCache(async (previous: number | null) => {
    calls++;
    return (previous ?? 0) + 1;
  });
  assert.deepEqual(
    await Promise.all([cache("morning"), cache("morning")]),
    [1, 1],
  );
  assert.equal(await cache("morning"), 1);
  assert.equal(await cache("evening"), 2);
  assert.equal(calls, 2);
});

test("snapshot cache serves the previous successful value during an outage, then retries", async () => {
  let fail = false;
  let calls = 0;
  const cache = createRefreshCache(async (previous: number | null) => {
    calls++;
    if (fail) throw new Error("offline");
    return (previous ?? 0) + 1;
  }, 100);
  assert.equal(await cache("morning", 0), 1);
  fail = true;
  assert.equal(await cache("evening", 10), 1);
  assert.equal(await cache("evening", 20), 1);
  assert.equal(calls, 2);
  fail = false;
  assert.equal(await cache("evening", 111), 2);
});
