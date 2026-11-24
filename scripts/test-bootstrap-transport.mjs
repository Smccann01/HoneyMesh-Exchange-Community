import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync("src/app/api/hm/bootstrap/route.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText;
const record = { exports: {} };
let rateLimitCalls = 0;
const localRequire = (name) => {
  if (name === "@/app/api/_lib") return {
    json: (data, init) => Response.json(data, init),
    publicExchangeOrigin: () => "https://exchange.example",
  };
  if (name === "@/lib/edge-guard") return { trustedClientIP: () => "192.0.2.1" };
  if (name === "@/lib/portal-store") return {
    consumeRateLimit: () => { rateLimitCalls++; return { allowed: true }; },
  };
  if (name === "@/lib/exchange-validation") return {
    machineBootstrapSchema: { safeParse: () => ({ success: false, error: { flatten: () => ({}) } }) },
  };
  if (name.startsWith("@/")) return {};
  return require(name);
};
new Function("require", "module", "exports", compiled)(localRequire, record, record.exports);

test("bootstrap refuses insecure transport before parsing or issuing a node secret", async () => {
  const route = record.exports;
  const previous = process.env.EXCHANGE_TRUST_PROXY;
  try {
    process.env.EXCHANGE_TRUST_PROXY = "false";
    const insecure = await route.POST(new Request("http://exchange.example/api/hm/bootstrap", {
      method: "POST", body: "{}",
    }));
    assert.equal(insecure.status, 403);
    assert.deepEqual(await insecure.json(), { error: "insecure_transport" });
    assert.equal(insecure.headers.get("cache-control"), "no-store");
    assert.equal(rateLimitCalls, 0, "insecure requests should stop before database work");

    const secure = await route.POST(new Request("https://exchange.example/api/hm/bootstrap", {
      method: "POST", body: "{}",
    }));
    assert.equal(secure.status, 400, "secure requests should reach payload validation");

    process.env.EXCHANGE_TRUST_PROXY = "true";
    const spoofedScheme = await route.POST(new Request("https://exchange.example/api/hm/bootstrap", {
      method: "POST", headers: { "x-forwarded-proto": "http" }, body: "{}",
    }));
    assert.equal(spoofedScheme.status, 403, "the trusted proxy scheme must control admission");
    const trustedScheme = await route.POST(new Request("http://exchange.example/api/hm/bootstrap", {
      method: "POST", headers: { "x-forwarded-proto": "https" }, body: "{}",
    }));
    assert.equal(trustedScheme.status, 400);
  } finally {
    if (previous === undefined) delete process.env.EXCHANGE_TRUST_PROXY;
    else process.env.EXCHANGE_TRUST_PROXY = previous;
  }
});

test("bootstrap rejects an oversized request before parsing it", async () => {
  const response = await record.exports.POST(new Request("https://exchange.example/api/hm/bootstrap", {
    method: "POST", body: "x".repeat(16385),
  }));
  assert.equal(response.status, 413);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
