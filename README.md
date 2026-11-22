# HoneyMesh Exchange Community

A free, self-hosted Exchange for networks you operate. It provides a private administrator console, one-use node enrollment, signed machine APIs, and opt-in sharing of eligible observations. Each installation owns its database, credentials, policies, and node trust. **No Network Decode account, hosted subscription, or payment key is required to run this Exchange.**

The source is [AGPL-3.0-only](LICENSE). This repository is a clean snapshot of [Exchange source already published](PROVENANCE.md) in HoneyMesh Open Source. It does not contain Network Decode's hosted billing service, customer data, or production configuration.

## Start a private Exchange

Use Node.js 22 and a trusted HTTPS reverse proxy on a noncritical Ubuntu 24.04 AMD64 host. The app currently uses a durable SQLite file and one writer process. The commands and recovery steps are in [Self-hosting](docs/SELF_HOSTING.md).

```sh
git clone https://github.com/Smccann01/HoneyMesh-Exchange-Community.git
cd HoneyMesh-Exchange-Community
npm ci
npm run lint
npm run build
```

Initialize your own database and administrator with the scripts described in the self-hosting guide. After signing in at `/console`, an administrator can create a ten-minute, one-use token through `POST /api/admin/enrollment-token`. A compatible node enrolls through `POST /api/hm/enroll` and receives its secret once. Discovery and publication start disabled. Received observations do not by themselves authorize a host to enforce a block.

The older signed-license `/api/hm/bootstrap` route is retained for compatibility; the **community enrollment path is `/api/hm/enroll`**. See the [machine API contract](docs/MACHINE_API_V1.md) when implementing a node client.

## Product boundaries

| Path | Payment for this Exchange | What it is |
|---|---:|---|
| Customer-operated Exchange | None | This repository; you run and secure it |
| Network Decode hosted Exchange | Separate hosted subscription | Network Decode operates the service and controls admission |
| HoneyMesh 2.0 node package | Separate node purchase | Local node software; a purchase does not buy a hosted Exchange seat |

The free Core pilot is also available separately. These paths are explained in [Deployment modes](docs/DEPLOYMENT_MODES.md). A private Exchange does not automatically federate with the hosted service; that gateway remains planned.

## Verify and contribute

```sh
npm run lint
npm run test:network-admin
npm run test:discovery
npm run test:protocol
npm run test:activity
npm run test:edge-guard
npm run test:bootstrap
npm run build
```

See [Security](SECURITY.md) for private vulnerability reporting and [Contributing](CONTRIBUTING.md) for pull requests. The Snap recipe is an unpublished developer pilot, not a general production release. High availability, restore on another host, and a general production installer remain qualification work.
