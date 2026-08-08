"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>("IDR");
  const [usdIdrRate, setUsdIdrRateState] = useState<number>(DEFAULT_USD_IDR_RATE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "IDR" || stored === "USD") setCurrencyState(stored);
    const storedRate = window.localStorage.getItem(RATE_STORAGE_KEY);
    if (storedRate) setUsdIdrRateState(Number(storedRate));
  }, []);

  function setCurrency(c: DisplayCurrency) {
    setCurrencyState(c);
    window.localStorage.setItem(STORAGE_KEY, c);
  }

  function setUsdIdrRate(r: number) {
    setUsdIdrRateState(r);
    window.localStorage.setItem(RATE_STORAGE_KEY, String(r));
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
