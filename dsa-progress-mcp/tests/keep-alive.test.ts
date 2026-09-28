import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { MAX_DELAY_MS, MIN_DELAY_MS, startKeepAlive } from "../src/keep-alive.js";

describe("keep-alive", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
  afterEach(() => mock.timers.reset());

  it("pings the URL between 1 and 14 minutes after starting", () => {
    const calls: string[] = [];
    const fakeFetch = (async (url: string) => {
      calls.push(url);
      return new Response("ok");
    }) as typeof fetch;

    const stop = startKeepAlive("https://example.com/ping", fakeFetch);
    mock.timers.tick(MIN_DELAY_MS - 1);
    assert.equal(calls.length, 0);
    mock.timers.tick(MAX_DELAY_MS - MIN_DELAY_MS + 1);
    assert.deepEqual(calls, ["https://example.com/ping"]);
    stop();
  });

  it("stops pinging once stopped", () => {
    let calls = 0;
    const fakeFetch = (async () => {
      calls++;
      return new Response("ok");
    }) as typeof fetch;

    const stop = startKeepAlive("https://example.com/ping", fakeFetch);
    stop();
    mock.timers.tick(MAX_DELAY_MS);
    assert.equal(calls, 0);
  });
});
