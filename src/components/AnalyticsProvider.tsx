"use client";

import { useEffect } from 'react';
import { trackSession } from '@/store/useAnalytics';

/**
 * Client component that initializes analytics on app load.
 * Generates/retrieves device ID, creates session, starts heartbeat.
 */
export default function AnalyticsProvider() {
  useEffect(() => {
    trackSession();
  }, []);

  return null; // invisible component
}
