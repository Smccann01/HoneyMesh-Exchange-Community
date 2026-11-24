import { randomUUID } from "node:crypto";

import { json } from "@/app/api/_lib";
import { normalizeLicenseTier, validateVerifiedLicenseClaim } from "@/lib/auth";
import {
  appendAuditLog,
  consumeRateLimit,
  createMachineTenant,
  findTenantByID,
  registerNode,
  upsertLicense,
} from "@/lib/portal-store";
import { machineBootstrapSchema } from "@/lib/exchange-validation";
import { trustedClientIP } from "@/lib/edge-guard";

const privateHeaders = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

function tenantIdForCluster(clusterId: string) {
  return `tenant-machine-${clusterId}`;
}

function tenantNameForCluster(clusterId: string) {
  return `HoneyMesh ${clusterId}`;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const proto = process.env.EXCHANGE_TRUST_PROXY === "true" ? request.headers.get("x-forwarded-proto") : url.protocol.slice(0, -1);
  const localDev = (process.env.NODE_ENV !== "production" || process.env.NETTOOLS_TEST_INSECURE_LOOPBACK === "true") &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (proto !== "https" && !localDev) {
    return json({ error: "insecure_transport" }, { status: 403, headers: privateHeaders });
  }
  const ip = trustedClientIP(request);
  if (!consumeRateLimit(`bootstrap:${ip ?? "unattributed"}`, ip ? 60 : 120, 60).allowed) {
    return json({ error: "rate_limited" }, { status: 429, headers: privateHeaders });
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 16384) {
        await reader.cancel();
        return json({ error: "invalid_payload" }, { status: 413, headers: privateHeaders });
      }
      chunks.push(chunk.value);
    }
  }
  let input: unknown;
  try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return json({ error: "invalid_payload" }, { status: 400, headers: privateHeaders }); }
  const parsedPayload = machineBootstrapSchema.safeParse(input);
  if (!parsedPayload.success) {
    return json({ error: "invalid_payload", issues: parsedPayload.error.flatten() }, { status: 400, headers: privateHeaders });
  }

  const payload = parsedPayload.data;
  const rawLicense = typeof payload.licenseJson === "string" ? payload.licenseJson : JSON.stringify(payload.licenseJson);
  const tenantId = tenantIdForCluster(payload.clusterId);
  let bootstrapTier: "community" | "pro" = "community";
  try {
    bootstrapTier = normalizeLicenseTier(JSON.parse(rawLicense).tier ?? "community");
  } catch {
    return json({ error: "invalid_license_payload" }, { status: 400 });
  }

  let licenseRecord;
  try {
    if (!payload.licensePayload || !payload.licenseSignature) {
      return json({ error: "verified_license_claim_required" }, { status: 400 });
    }
    licenseRecord = validateVerifiedLicenseClaim({
      raw: rawLicense,
      tenantId,
      clusterId: payload.clusterId,
      licensePayload: payload.licensePayload,
      licenseSignature: payload.licenseSignature,
      licenseClaim: payload.licenseClaim,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "invalid_license" }, { status: 403 });
  }

  if (licenseRecord.tier !== "pro" || licenseRecord.status !== "active") {
    return json({ error: "pro_license_required" }, { status: 403 });
  }

  if (!findTenantByID(tenantId)) {
    createMachineTenant({
      id: tenantId,
      name: tenantNameForCluster(payload.clusterId),
      licenseStatus: "active",
      plan: bootstrapTier,
    });
  }
  upsertLicense(licenseRecord);

  // A signed license proves entitlement, but is not proof of node possession.
  // Never return a previously issued node secret through this bootstrap route.
  const secret = randomUUID().replaceAll("-", "");
  let node;
  try {
    node = registerNode(
      {
        id: payload.id ?? randomUUID(),
        tenantId,
        clusterId: payload.clusterId,
        nodeName: payload.nodeName,
        trustLevel: Number(payload.trustLevel ?? 75),
        publicKey: payload.publicKey,
        softwareVersion: payload.softwareVersion ?? "unknown",
        machineFingerprint: payload.machineFingerprint ?? null,
        revokedAt: null,
      },
      secret,
      licenseRecord.maxNodes,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "node_limit_or_identity_conflict") {
      return json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  appendAuditLog({
    actorType: "node",
    actorId: node.id,
    tenantId,
    action: "node.bootstrap",
    reasonCode: null,
    details: `Machine bootstrap registered node ${node.nodeName}`,
  });

  return json(
    {
      record: node,
      node_id: node.id,
      tenant_id: tenantId,
      api_base_url: new URL(request.url).origin,
      secret,
      bootstrap_mode: "created",
    },
    { status: 201, headers: privateHeaders },
  );
}
