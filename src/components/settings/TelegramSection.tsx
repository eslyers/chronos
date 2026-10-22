"use client";

import { Bell, Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TelegramSectionProps {
  chatId: string | null;
  onChatIdChange: (value: string) => void;
  onSave: () => void;
  onTest: () => void;
  loading: boolean;
  testing: boolean;
}

export function TelegramSection({ chatId, onChatIdChange, onSave, onTest, loading, testing }: TelegramSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Telegram
        </CardTitle>
        <CardDescription>
          Receba notificações de prazos e transições direto no Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div>
          <label htmlFor="chat-id" className="block text-sm font-medium mb-1.5">
            Telegram Chat ID
          </label>
          <Input
            id="chat-id"
            value={chatId || ""}
            onChange={(e) => onChatIdChange(e.target.value)}
            placeholder="Ex: 123456789"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Pra descobrir: abra o Telegram → procure <span className="font-mono">@userinfobot</span> → mande /start.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={testing || !chatId}
          >
            <Send className="mr-2 h-4 w-4" />
            {testing ? "Enviando..." : "Enviar teste"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
