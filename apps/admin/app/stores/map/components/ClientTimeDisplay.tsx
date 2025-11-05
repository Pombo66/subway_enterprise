'use client';

import { useState, useEffect } from 'react';

interface ClientTimeDisplayProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side only wrapper to prevent hydration mismatches for time-sensitive content
 * This ensures that time-based content only renders on the client side
 */
export default function ClientTimeDisplay({ children, fallback = null }: ClientTimeDisplayProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}