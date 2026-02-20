"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";
import { useFullScreenLayout } from "@/components/FullScreenLayoutContext";

/**
 * Dedicated route to always show onboarding (for testing save flow).
 * Open http://localhost:3000/onboarding
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { setFullScreen } = useFullScreenLayout();

  useEffect(() => {
    setFullScreen(true);
    return () => setFullScreen(false);
  }, [setFullScreen]);

  return (
    <Onboarding
      onComplete={() => {
        router.push("/");
      }}
    />
  );
}
