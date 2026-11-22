import type { Metadata } from "next";
import Link from "next/link";

import "../activity/activity.css";

export const metadata: Metadata = {
  title: "Set up a private HoneyMesh Exchange",
  description: "Run a free, self-hosted HoneyMesh Exchange with local administration and opt-in sharing.",
  alternates: { canonical: "/downloads" },
};

export default function DownloadsPage() {
  return (
    <main className="activity-page">
      <div className="activity-wrap">
        <header className="activity-header">
          <Link className="activity-brand" href="/" aria-label="HoneyMesh Exchange home">
            <span className="activity-brand-mark" aria-hidden="true" />
            <span><strong>HONEY MESH</strong><small>THE EXCHANGE</small></span>
          </Link>
          <nav className="exchange-nav" aria-label="Main navigation"><Link href="/console">Private console</Link><a href="https://github.com/Smccann01/HoneyMesh-Exchange-Community">Source ↗</a></nav>
        </header>

        <section className="activity-hero exchange-download-hero">
          <div className="activity-eyebrow">HONEY MESH · PRIVATE EXCHANGE</div>
          <h1>Run your Exchange.<br /><em>Keep your control.</em></h1>
          <p>Download the AGPL-3.0-only source, create your own administrator, and enroll compatible nodes at your HTTPS origin. This Exchange requires no Network Decode hosted subscription. Discovery and sharing start disabled.</p>
        </section>

        <section className="activity-explain exchange-download-resources">
          <div><p className="activity-kicker">GET STARTED</p><h2>Set up a private network.</h2></div>
          <div className="activity-explain-grid">
            <article><b>01</b><h3>Get the source</h3><p>Clone the public Exchange repository and build it with Node.js 22. Keep state and credentials outside the checkout.</p><a href="https://github.com/Smccann01/HoneyMesh-Exchange-Community">Open repository ↗</a></article>
            <article><b>02</b><h3>Follow self-hosting steps</h3><p>Set your HTTPS origin, create an administrator, run a single SQLite writer, and protect a tested backup.</p><a href="https://github.com/Smccann01/HoneyMesh-Exchange-Community/blob/main/docs/SELF_HOSTING.md">Read setup guide ↗</a></article>
            <article><b>03</b><h3>Enroll nodes</h3><p>Issue one-use tokens in the private console, then connect compatible nodes to your own TLS-verified Exchange. Sharing remains opt-in.</p><a href="https://github.com/Smccann01/HoneyMesh-Exchange-Community/blob/main/docs/MACHINE_API_V1.md">Read machine API ↗</a></article>
          </div>
        </section>

        <footer className="activity-footer"><span>HoneyMesh Exchange · self-hosted community</span><Link href="/">Exchange home ↗</Link></footer>
      </div>
    </main>
  );
}
