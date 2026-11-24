"use client";

import { Analytics } from "@vercel/analytics/next";

export function WebAnalytics() {
  return <Analytics beforeSend={(event) => {
    const url = new URL(event.url);
    // Keep invitation codes, searches, and other private parameters out of analytics.
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  }} />;
}
