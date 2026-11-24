import {OfflineEngine} from "@/components/offline-engine";
import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import {PwaRegistration} from "@/components/pwa-registration";
import { WebAnalytics } from "@/components/web-analytics";
export const metadata: Metadata = {
  manifest:"/manifest.json",
  icons:{icon:"/dearly-book.svg",apple:"/app-book-light-192.png"},
  metadataBase:new URL("https://dearly.com.ng"),
  openGraph:{title:"Dearly — Your days, held close",description:"Your days. Your people. Your little world.",images:["/opengraph-image"]},
  twitter:{card:"summary_large_image",images:["/opengraph-image"]},
  title: "Dearly — Your days, held close",
  description:
    "Your private journal. Your favorite people. Capture the little things that make a life.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Script src="/pwa-modal.js" strategy="beforeInteractive" />{children}<WebAnalytics /><PwaRegistration /><OfflineEngine /></body>
    </html>
  );
}
