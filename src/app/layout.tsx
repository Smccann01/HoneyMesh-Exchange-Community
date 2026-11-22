import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.EXCHANGE_PUBLIC_ORIGIN ?? "http://localhost:3000"),
  robots: { index: false, follow: false },
  title: {
    default: "HoneyMesh Exchange",
    template: "%s | HoneyMesh Exchange",
  },
  description:
    "Opt-in HoneyMesh network discovery, direct sharing, and short-lived defensive intelligence exchange.",
  icons: {
    icon: "/logo2.png",
    shortcut: "/logo2.png",
    apple: "/logo2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[var(--bg)] text-[var(--fg)]">{children}</body>
    </html>
  );
}
