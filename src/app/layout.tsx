import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/components/currency-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Finance Dashboard",
  description: "Private budget, income, and net worth dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <CurrencyProvider>
          {children}
          <Toaster />
        </CurrencyProvider>
      </body>
    </html>
  );
}
