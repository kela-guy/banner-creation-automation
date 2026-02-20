"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type FullScreenLayoutContextValue = {
  fullScreen: boolean;
  setFullScreen: (value: boolean) => void;
};

const FullScreenLayoutContext = createContext<FullScreenLayoutContextValue | null>(null);

export function FullScreenLayoutProvider({ children }: { children: ReactNode }) {
  const [fullScreen, setFullScreen] = useState(false);
  return (
    <FullScreenLayoutContext.Provider value={{ fullScreen, setFullScreen }}>
      {children}
    </FullScreenLayoutContext.Provider>
  );
}

export function useFullScreenLayout(): FullScreenLayoutContextValue {
  const ctx = useContext(FullScreenLayoutContext);
  if (!ctx) {
    return {
      fullScreen: false,
      setFullScreen: () => {},
    };
  }
  return ctx;
}
