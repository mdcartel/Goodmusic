'use client';

import { useEffect } from 'react';
import { Privacy } from '@/lib/privacyInit';

export default function PrivacyInitializer() {
  useEffect(() => {
    // Initialize privacy system on app startup
    Privacy.init();
  }, []);

  // This component doesn't render anything
  return null;
}