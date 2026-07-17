"use client";
import { useEffect, useState } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";


function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSPAClient();

    async function handleCallback() {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );
      if (error) {
        setError(error.message);
        return;
      }
      // Respeita ?redirect=<path> passado pelo Google OAuth
      const redirectTo = searchParams.get("redirect") || "/app";
      router.push(redirectTo);
      router.refresh();
    }

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">❌</div>
        <h2 className="text-2xl font-semibold">Erro no login</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push("/auth/login")}
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
      <p className="text-sm text-muted-foreground">
        Confirmando login, aguarde...
      </p>
    </div>
  );
}

// useSearchParams() exige Suspense boundary no Next.js 15
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div></div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}
