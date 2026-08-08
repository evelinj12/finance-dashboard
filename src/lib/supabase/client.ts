import { createBrowserClient } from "@supabase/ssr";

// Not parameterized with the Database type yet -- our hand-written types.ts
// doesn't match the shape @supabase/supabase-js expects for full inference.
// Once the project is live, run `supabase gen types` and wire the generated
// type back in here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
