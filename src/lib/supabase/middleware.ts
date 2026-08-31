import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isTeamAccessRoute = request.nextUrl.pathname.startsWith("/team-access");
  const isTeamAccessLoginPage = request.nextUrl.pathname.startsWith("/team-access/login");
  const isTeamLoginPage = request.nextUrl.pathname.startsWith("/team-login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");

  if (isAuthCallback) {
    return supabaseResponse;
  }

  if (!user && isTeamAccessRoute && !isTeamAccessLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/team-login";
    return NextResponse.redirect(url);
  }

  if (!user && !isLoginPage && !isTeamAccessLoginPage && !isTeamLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
