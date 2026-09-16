import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

import { anthropic, CHAT_MODEL } from "@/lib/anthropic";
import { consumeFreeQuestion } from "@/lib/quota";
import { getCurrentUser, isPremium } from "@/lib/session";

export const runtime = "nodejs";

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});

const QuizSchema = z.object({
  topic: z.string(),
  questions: z.array(QuizQuestionSchema).length(5),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Generating a quiz counts as one "domanda" against the same daily free
  // allowance as the chat, per the product brief (5 free questions/day/user).
  const premium = isPremium(user.subscription);
  if (!premium) {
    const { allowed } = await consumeFreeQuestion(user.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Hai esaurito le 5 domande gratuite di oggi. Passa a Premium per generare altri quiz.",
        },
        { status: 429 },
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const topic =
    typeof body?.topic === "string" && body.topic.trim()
      ? body.topic.trim().slice(0, 100)
      : "calcio italiano e Serie A";

  const response = await anthropic.beta.messages.parse({
    model: CHAT_MODEL,
    max_tokens: 2048,
    system:
      "Sei un generatore di quiz calcistici per l'app Il Mister. Crea domande accurate, verificabili e non ambigue, con una sola risposta corretta tra le 4 opzioni.",
    messages: [
      {
        role: "user",
        content: `Genera un quiz di 5 domande a risposta multipla sul tema: ${topic}.`,
      },
    ],
    output_format: betaZodOutputFormat(QuizSchema),
  });

  if (!response.parsed_output) {
    return NextResponse.json(
      { error: "Non sono riuscito a generare il quiz, riprova." },
      { status: 502 },
    );
  }

  return NextResponse.json(response.parsed_output);
}
