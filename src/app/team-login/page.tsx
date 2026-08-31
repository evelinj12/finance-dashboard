import { TeamAccessLoginContent } from "../team-access/login/team-access-login-content";

export default function TeamLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <TeamAccessLoginContent searchParams={searchParams} loginPath="/team-login" />;
}
