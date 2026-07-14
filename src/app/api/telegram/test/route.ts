import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { chatId } = await req.json();

    if (!chatId || typeof chatId !== "string") {
      return NextResponse.json(
        { error: "chatId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN não configurado no servidor" },
        { status: 500 }
      );
    }

    const message =
      `🕐 *CHRONOS Test*\n\n` +
      `Olá, ${user.email?.split("@")[0]}! 👋\n\n` +
      `Esta é uma mensagem de teste do CHRONOS. ` +
      `Se você está vendo isso no Telegram, suas notificações estão funcionando perfeitamente! ✅\n\n` +
      `_Enviado em ${new Date().toLocaleString("pt-BR")}_`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      return NextResponse.json(
        {
          error: `Telegram: ${telegramData.description || "erro desconhecido"}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Mensagem enviada!" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
