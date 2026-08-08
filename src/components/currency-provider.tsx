"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { DEFAULT_USD_IDR_RATE, type DisplayCurrency } from "@/lib/currency";

interface CurrencyContextValue {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  usdIdrRate: number;
  setUsdIdrRate: (r: number) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "finance-dashboard:display-currency";
const RATE_STORAGE_KEY = "finance-dashboard:usd-idr-rate";

function subscribeToLocalStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getStoredCurrency(): DisplayCurrency {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "IDR" || stored === "USD" ? stored : "IDR";
}

function getStoredUsdIdrRate(): number {
  const storedRate = window.localStorage.getItem(RATE_STORAGE_KEY);
  const parsedRate = storedRate ? Number(storedRate) : DEFAULT_USD_IDR_RATE;
  return Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : DEFAULT_USD_IDR_RATE;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const currency = useSyncExternalStore<DisplayCurrency>(
    subscribeToLocalStorage,
    getStoredCurrency,
    () => "IDR"
  );
  const usdIdrRate = useSyncExternalStore(
    subscribeToLocalStorage,
    getStoredUsdIdrRate,
    () => DEFAULT_USD_IDR_RATE
  );

  function setCurrency(c: DisplayCurrency) {
    window.localStorage.setItem(STORAGE_KEY, c);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }

  function setUsdIdrRate(r: number) {
    window.localStorage.setItem(RATE_STORAGE_KEY, String(r));
    window.dispatchEvent(new StorageEvent("storage", { key: RATE_STORAGE_KEY }));
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, usdIdrRate, setUsdIdrRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
