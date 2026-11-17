"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh an open homepage when its next server sync window arrives. */
export default function SnapshotRefresh({
  nextSyncAt,
}: {
  nextSyncAt: string;
}) {
  const router = useRouter();
  useEffect(() => {
    let nextAttempt = Date.parse(nextSyncAt);
    if (!Number.isFinite(nextAttempt)) return;
    const timer = window.setInterval(() => {
      if (Date.now() < nextAttempt || document.visibilityState !== "visible")
        return;
      nextAttempt = Date.now() + 15 * 60 * 1000;
      router.refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [nextSyncAt, router]);
  return null;
}
