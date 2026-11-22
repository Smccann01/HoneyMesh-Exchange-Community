# Self-host a private HoneyMesh Exchange

This is a source-based pilot for an operator-controlled Exchange. It is free to run and needs no Network Decode billing account. Use a noncritical Ubuntu 24.04 AMD64 host, Node.js 22, an HTTPS domain you control, and a reverse proxy. The current storage implementation is SQLite with one writer process; do not scale it by starting multiple app writers against one file.

## 1. Prepare a private state directory

Clone this repository, install its locked dependencies, and create a directory outside the checkout for the database and credentials. Keep that directory readable only by the service operator. Replace the example domain, email, tenant, and cluster IDs with your own values.

```sh
git clone https://github.com/Smccann01/HoneyMesh-Exchange-Community.git
cd HoneyMesh-Exchange-Community
npm ci
install -d -m 0700 ../honeymesh-exchange-state
HM_EXCHANGE_STATE_DIR="$(realpath ../honeymesh-exchange-state)"
node scripts/init-private-exchange.mjs \
  --origin=https://exchange.example.org \
  --output="$HM_EXCHANGE_STATE_DIR/exchange.env" \
  --db="$HM_EXCHANGE_STATE_DIR/exchange.db"
node scripts/provision-network-admin.mjs \
  --db="$HM_EXCHANGE_STATE_DIR/exchange.db" \
  --credentials-out="$HM_EXCHANGE_STATE_DIR/admin-credentials.txt" \
  --email=admin@example.org \
  --tenant=example \
  --cluster=example-cluster \
  --origin=https://exchange.example.org
```

Both setup scripts refuse to overwrite their output. The administrator file contains the generated password and authenticator setup key. Store a recovery copy securely, enroll the authenticator, and protect or retire the plaintext file according to your credential policy. Never commit the environment file, database, backup, or credentials.

## 2. Build and serve behind HTTPS

Build with the private configuration and run only on loopback. Configure your reverse proxy to terminate TLS, forward the original `Host`, set `X-Forwarded-Proto` to `https`, and **overwrite** `X-Real-IP` from the actual client connection. Do not pass an untrusted client-supplied `X-Real-IP` header. Keep port 8790 unreachable from the public network. The generated environment enables trusted proxy parsing; that is safe only with this proxy boundary.

```sh
node --env-file="$HM_EXCHANGE_STATE_DIR/exchange.env" node_modules/next/dist/bin/next build
node --env-file="$HM_EXCHANGE_STATE_DIR/exchange.env" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 8790
```

For a persistent service, use your supervisor to run the same `next start` command with a restricted service account and a working directory at the repository checkout. Install TLS, restart policy, logs, and resource limits before public access. On the HTTPS origin, open `/console` and sign in with the generated email, password, and current authenticator code. The console cookie is secure and requires HTTPS.

## 3. Enroll compatible nodes

The administrator creates a one-use token that expires in ten minutes using `POST /api/admin/enrollment-token` from the signed-in console session. The node submits its `nodeName`, `clusterId`, `enrollToken`, and public key to `POST /api/hm/enroll` at this Exchange's TLS-verified origin. The response returns a node secret once. Store it in the node's protected configuration. The [machine API contract](MACHINE_API_V1.md) defines subsequent signed requests.

On compatible HoneyMesh 2.0 nodes, open the local **Trusted Peers** panel, find **Use a custom HoneyMesh Exchange**, enter your HTTPS origin and the one-use token, then select **Enroll Custom Exchange**. The node clears its previous Exchange feed cursor and sharing selection when it changes Exchanges. Verify the selected origin and explicitly enable sharing only if you intend to publish observations. The node's local detection and enforcement remain under its own configuration.

The community enrollment route does **not** ask for a hosted subscription. The older `/api/hm/bootstrap` route expects a separate signed trial entitlement and is not the community setup route. Configure nodes to point at your own Exchange origin; a private Exchange neither registers with nor shares data to Network Decode by default.

Discovery and publication start off. A receiving node must explicitly trust a source and apply its own policy. Do not enable automatic enforcement based only on an Exchange observation.

## 4. Back up and prove restore

The backup script uses SQLite's backup API and checks the copy's integrity. Put backups on protected storage outside the app and test a restore on a separate pilot host. For example:

```sh
install -d -m 0700 ../honeymesh-exchange-backups
node --env-file="$HM_EXCHANGE_STATE_DIR/exchange.env" scripts/backup-daily.mjs "$(realpath ../honeymesh-exchange-backups)"
```

To restore, stop the app, copy a verified backup to a **new** private database path, change `DATABASE_URL` in the private environment file to that path, then start the app and verify administrator login, node count, policy, and a signed machine request. Keep the prior database and environment file until the restore is proven. Backups contain sensitive node and administrator state; encrypt and restrict access.

## Current limits

- Single SQLite writer; no qualified multi-instance or high-availability deployment.
- Snap packaging is an unpublished strictly confined developer pilot. The source-based path above is the current reproducible setup.
- No supported private-to-hosted federation gateway yet.
- Test an exact node and Exchange version pair before depending on machine APIs. This repository is not a claim of production performance or availability.

Report security issues privately as described in [Security](../SECURITY.md).
