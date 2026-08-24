"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export type AnalyticsRange = "90d" | "180d" | "365d" | "all";

// Wider ranges do more backend work per request (more days of data,
// more ARIMA re-fits even with the 7-day refit interval), so they poll
// less frequently. Narrow ranges stay near-real-time.
const POLL_INTERVAL_MS: Record<AnalyticsRange, number> = {
  "90d":  60_000,   // 1 min
  "180d": 120_000,  // 2 min
  "365d": 180_000,  // 3 min
  "all":  300_000,  // 5 min
};

// How long a cached range is considered "fresh enough" to show without
// immediately kicking off a background refetch when you switch back to it.
const CACHE_STALE_MS = 30_000; // 30s

interface CacheEntry {
  data: any;
  fetchedAt: number;
}

export function useAnalyticsData() {
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);      // true only when no cached data exists yet for the range
  const [isRefreshing, setIsRefreshing] = useState(false); // background polls / silent refetches
  const [error, setError]           = useState<string | null>(null);
  const [range, setRange]           = useState<AnalyticsRange>("90d");

  // Per-range cache, kept for the lifetime of the component (session-scoped).
  const cacheRef = useRef<Partial<Record<AnalyticsRange, CacheEntry>>>({});

  // Tracks whether a fetch was missed while the tab was hidden, so we
  // can catch up immediately when the tab regains focus instead of
  // waiting for the next interval tick.
  const missedWhileHidden = useRef(false);

  // Guards against a slow response for a range the user has since
  // switched away from overwriting the currently-displayed data.
  const requestRangeRef = useRef<AnalyticsRange>(range);

  const fetchAnalytics = useCallback((forRange: AnalyticsRange, isBackground = false) => {
    if (isBackground) setIsRefreshing(true);

    fetch(`http://localhost:8000/api/dashboard-data?range=${forRange}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        cacheRef.current[forRange] = { data: json, fetchedAt: Date.now() };

        // Only update visible state if the user is still on this range.
        if (requestRangeRef.current === forRange) {
          setData(json);
          setLoading(false);
          setIsRefreshing(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (requestRangeRef.current === forRange) {
          setError(err.message);
          setLoading(false);
          setIsRefreshing(false);
        }
      });
  }, []);

  // Range-change / initial-load effect: serve from cache instantly if we have it,
  // otherwise show the loading state.
  useEffect(() => {
    requestRangeRef.current = range;

    const cached = cacheRef.current[range];

    if (cached) {
      // Instant display from cache — no spinner.
      setData(cached.data);
      setLoading(false);
      setError(null);

      const age = Date.now() - cached.fetchedAt;
      if (age > CACHE_STALE_MS) {
        // Cache is a bit old — refresh quietly in the background.
        fetchAnalytics(range, true);
      }
    } else {
      // Never fetched this range before — genuine loading state.
      setLoading(true);
      fetchAnalytics(range, false);
    }
  }, [range, fetchAnalytics]);

  // Polling effect: independent of cache, keeps refreshing whichever range is active.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchAnalytics(range, true);
        } else {
          // Tab is hidden — skip this tick, but note it so we can
          // refresh immediately once the tab is visible again.
          missedWhileHidden.current = true;
        }
      }, POLL_INTERVAL_MS[range]);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && missedWhileHidden.current) {
        missedWhileHidden.current = false;
        fetchAnalytics(range, true);
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAnalytics, range]);

  return { data, loading, isRefreshing, error, range, setRange };
}