import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/currency-toggle";
import { NavShell } from "@/components/nav-shell";
import { signOut } from "@/app/login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Finance Dashboard</h1>
            <div className="flex items-center gap-2">
              <CurrencyToggle />
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
          <NavShell />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
