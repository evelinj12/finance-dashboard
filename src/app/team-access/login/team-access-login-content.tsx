import { Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getTeamAccessProfile } from "@/lib/team-access";
import { signInTeamAccess, signInTeamAccessWithGoogle, signOutTeamAccess, signUpTeamAccess } from "../actions";

interface TeamAccessLoginContentProps {
  searchParams: Promise<{ error?: string; message?: string }>;
  loginPath?: "/team-login" | "/team-access/login";
}

export async function TeamAccessLoginContent({
  searchParams,
  loginPath = "/team-login",
}: TeamAccessLoginContentProps) {
  const { error, message } = await searchParams;
  const googleEnabled = process.env.NEXT_PUBLIC_TEAM_ACCESS_GOOGLE_ENABLED === "true";
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
          <CardDescription>Team access for submitting work time. Use the email added by Evelin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleEnabled ? (
            <>
              <form action={signInTeamAccessWithGoogle}>
                <input type="hidden" name="login_path" value={loginPath} />
                <Button type="submit" variant="outline" className="h-12 w-full bg-white">
                  Continue with Google
                </Button>
              </form>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <form action={signInTeamAccess} className="space-y-3">
            <input type="hidden" name="login_path" value={loginPath} />
            <div className="space-y-2">
              <Label htmlFor="team-email">Email</Label>
              <Input id="team-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-password">Password</Label>
              <Input id="team-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit" className="h-11">
                Sign in
              </Button>
              <button
                type="submit"
                formAction={signUpTeamAccess}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 bg-white")}
              >
                Sign up
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
