import { NextResponse } from "next/server";
import { z } from "zod";

import { anthropic, CHAT_MODEL, MISTER_SYSTEM_PROMPT } from "@/lib/anthropic";
import { consumeFreeQuestion } from "@/lib/quota";
import { getCurrentUser, isPremium } from "@/lib/session";

export const runtime = "nodejs";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const premium = isPremium(user.subscription);
  if (!premium) {
    const { allowed } = await consumeFreeQuestion(user.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Hai esaurito le 5 domande gratuite di oggi. Passa a Premium per continuare a chattare con Il Mister.",
        },
        { status: 429 },
      );
    }
  }

  const claudeStream = anthropic.messages.stream({
    model: CHAT_MODEL,
    max_tokens: 1024,
    system: MISTER_SYSTEM_PROMPT,
    messages: parsed.data.messages,
  });

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(encoder.encode("\n\n[Il Mister ha perso il segnale. Riprova tra poco.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(responseStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
