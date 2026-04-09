import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

const ERROR_MESSAGES: Record<string, string> = {
  NO_USER: 'SAML login completed but no user profile was returned.',
  SAML_UNKNOWN_ERROR: 'SAML login failed. Please try again.',
  SAML_MISSING_ATTRIBUTES: 'Required user attributes are missing from the SAML profile.',
};

export default function Login() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const failKey = (router.query.failMessage as string) || (router.query.failed === '1' ? 'SAML_UNKNOWN_ERROR' : '');
    if (failKey) setErrorMessage(ERROR_MESSAGES[failKey] ?? 'Login failed.');
  }, [router.isReady, router.query]);

  const onLogin = () => {
    const path = (router.query.path as string) || '/';
    const successRedirect = `${window.location.origin}${decodeURIComponent(path)}`;
    const failureRedirect = `${window.location.origin}/login`;
    const url = `${API_URL}/saml/login?successRedirect=${encodeURIComponent(successRedirect)}&failureRedirect=${encodeURIComponent(failureRedirect)}`;
    window.location.href = url;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="mb-4 text-3xl font-semibold">Operaton BPMN Modeler</h1>
        <p className="mb-6 text-gray-600">Sign in with your Sundsvallskommun account to publish BPMN/DMN to the central engine.</p>
        <button
          type="button"
          onClick={onLogin}
          className="inline-block rounded-md bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
          autoFocus
        >
          Sign in
        </button>
        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}
      </div>
    </main>
  );
}
