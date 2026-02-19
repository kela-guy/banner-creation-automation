"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const GEMINI_API_KEY_URL = "https://aistudio.google.com/apikey";

type Provider = "google" | "openai";

export interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<1 | 2 | 3>(1);
  const [provider, setProvider] = useState<Provider>("google");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleNext = () => {
    setSaveError(null);
    if (screen === 1) setScreen(2);
  };

  const handleSaveAndContinue = async () => {
    setSaveError(null);
    if (!apiKey.trim()) {
      setSaveError("Please enter your API key.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError((data as { error?: string }).error ?? "Failed to save. Try again.");
        return;
      }
      setScreen(3);
    } finally {
      setSaving(false);
    }
  };

  const handleGoToApp = () => {
    onComplete();
  };

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-8 shadow-lg">
        {screen === 1 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Banner Automation Pipeline
            </h1>
            <p className="mt-2 text-[var(--foreground)]/80">
              Generate Hebrew ad banners from your Avatar document.
            </p>
            <p className="mt-6 text-sm font-medium text-[var(--foreground)]">
              Which AI provider do you want to use?
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 has-[:checked]:border-accent has-[:checked]:ring-1 has-[:checked]:ring-accent">
                <input
                  type="radio"
                  name="provider"
                  value="google"
                  checked={provider === "google"}
                  onChange={() => setProvider("google")}
                  className="h-4 w-4 accent-accent"
                  aria-label="Google Gemini"
                />
                <span className="text-sm font-medium">Google (Gemini)</span>
              </label>
              <label className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)]/60 px-4 py-3 opacity-70">
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  disabled
                  className="h-4 w-4"
                  aria-label="OpenAI (coming soon)"
                />
                <span className="text-sm font-medium text-[var(--foreground)]/70">
                  OpenAI <span className="text-xs">(coming soon)</span>
                </span>
              </label>
            </div>
            <div className="mt-8 flex justify-end">
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </div>
          </>
        )}

        {screen === 2 && (
          <>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              Enter your API key
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/80">
              Enter your Google (Gemini) API key. It is stored only on this server and never sent elsewhere.
            </p>
            <div className="mt-6">
              <label htmlFor="onboarding-api-key" className="block text-sm font-medium text-[var(--foreground)]">
                API key
              </label>
              <input
                id="onboarding-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/50 focus:outline-none focus:ring-2 focus:ring-accent"
                autoComplete="off"
                aria-describedby="api-key-help"
              />
              <p id="api-key-help" className="mt-2 text-xs text-[var(--foreground)]/60">
                <a
                  href={GEMINI_API_KEY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline hover:no-underline"
                >
                  How to get an API key
                </a>{" "}
                (Google AI Studio)
              </p>
            </div>
            {saveError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
                {saveError}
              </p>
            )}
            <div className="mt-8 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? "Saving…" : "Save and continue"}
              </Button>
            </div>
          </>
        )}

        {screen === 3 && (
          <>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              You&apos;re all set
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground)]/80">
              Your API key is saved. You can start generating banners.
            </p>
            <div className="mt-8 flex justify-end">
              <Button type="button" onClick={handleGoToApp}>
                Go to app
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
