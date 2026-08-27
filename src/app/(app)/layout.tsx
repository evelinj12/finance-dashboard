import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/cozy-illustrations";
import { CurrencyToggle } from "@/components/currency-toggle";
import { NavShell } from "@/components/nav-shell";
import { StickyNotes } from "@/components/sticky-notes";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: stickyNotes, error: stickyNotesError } = await supabase
    .from("sticky_notes")
    .select("id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (stickyNotesError) throw new Error(`Failed to load sticky notes: ${stickyNotesError.message}`);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b border-sky-100/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight tracking-normal text-foreground sm:text-lg">
                  Finance Dashboard
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 pb-24 sm:px-6 sm:py-6 lg:py-8">
        {children}
      </main>
      <StickyNotes notes={stickyNotes ?? []} />
    </div>
  );
}
