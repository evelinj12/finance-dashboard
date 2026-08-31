import { TeamAccessLoginContent } from "./team-access-login-content";

export default function TeamAccessLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <TeamAccessLoginContent searchParams={searchParams} loginPath="/team-access/login" />;
}
