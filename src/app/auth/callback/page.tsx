"use client";
import { useEffect, useState } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";


export default function AuthCallbackPage() {
  const router = useRouter();
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
      router.push("/app");
      router.refresh();
    }

    handleCallback();
  }, [router]);

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
