import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TabBar } from "@/components/glass/TabBar";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Life Drive",
    template: "%s · Life Drive",
  },
  description: "Your chief of staff for life. Three things, scheduled, today.",
  applicationName: "Life Drive",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Life Drive",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon-apple-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <div className="mx-auto max-w-xl pb-24">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
