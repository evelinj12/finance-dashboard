import { Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getTeamAccessProfile } from "@/lib/team-access";
import { signInTeamAccess, signInTeamAccessWithGoogle, signOutTeamAccess, signUpTeamAccess } from "../actions";

export default async function TeamAccessLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getTeamAccessProfile(supabase);
    if (profile) redirect("/team-access");

    return (
      <main className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,#dff7ff,transparent_42%),linear-gradient(180deg,#f7fcff,#e8f8ff)] p-4">
        <Card className="w-full max-w-sm border-sky-100 bg-white/90 shadow-xl shadow-sky-950/10">
          <CardHeader className="text-center">
            <CardTitle>Team access not linked</CardTitle>
            <CardDescription>
              This email is signed in, but it has not been added to a team member yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOutTeamAccess}>
              <Button type="submit" variant="outline" className="w-full bg-white">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,#dff7ff,transparent_42%),linear-gradient(180deg,#f7fcff,#e8f8ff)] p-4">
      <Card className="w-full max-w-sm border-sky-100 bg-white/90 shadow-xl shadow-sky-950/10">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-sky-700/20">
            <Mail className="size-7" />
          </div>
          <CardTitle className="text-3xl">Duiteve</CardTitle>
          <CardDescription>Team access for submitting work time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={signInTeamAccessWithGoogle}>
            <Button type="submit" variant="outline" className="h-12 w-full bg-white">
              Continue with Google
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form action={signInTeamAccess} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="team-email">Email</Label>
              <Input id="team-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-password">Password</Label>
              <Input id="team-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit" className="h-11">
                Sign in
              </Button>
              <Button formAction={signUpTeamAccess} variant="outline" className="h-11 bg-white">
                Sign up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
