import { useRouter } from 'next/router';
import { useEffect, type ReactNode } from 'react';
import { useUser } from '@services/user-service';

const PUBLIC_ROUTES = new Set<string>(['/login']);

/**
 * Top-level auth gate. Calls the BFF's /me on mount via UserProvider; if the
 * user isn't logged in (and the current route isn't public), redirects to
 * /login with the original path as `successRedirect` so the SAML round-trip
 * brings them back here.
 */
export function LoginGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useUser();

  const isPublic = PUBLIC_ROUTES.has(router.pathname);

  useEffect(() => {
    if (loading || isPublic || user) return;
    const target = encodeURIComponent(window.location.pathname + window.location.search);
    router.replace(`/login?path=${target}`);
  }, [loading, isPublic, user, router]);

  if (isPublic) return <>{children}</>;
  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }
  return <>{children}</>;
}

export default LoginGuard;
