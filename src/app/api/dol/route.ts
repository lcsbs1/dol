import { NextResponse, type NextRequest } from "next/server";
import { getFinanceInterpreter } from "@/lib/ai";
import { MAX_AUDIO_BYTES, normalizeAudioMimeType } from "@/lib/ai/audio";
import { assertCsrfAndOrigin, requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { executeDolIntent, loadFullMonthState } from "@/lib/finance/executor";
import {
  getCurrentBillingMonth,
  getTodayISO,
  isValidBillingMonth,
} from "@/lib/finance/money";
import type { InputMode } from "@/lib/finance/types";

export async function POST(request: NextRequest) {
  if (!assertCsrfAndOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }

  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const interpreter = getFinanceInterpreter();

    let activeMonth = getCurrentBillingMonth();
    let inputMode: InputMode = "text";
    let textInput: string | undefined;
    let audioPayload: { base64: string; mimeType: ReturnType<typeof normalizeAudioMimeType> } | undefined;

    if (contentType.includes("multipart/form-data")) {
      inputMode = "voice";
      const formData = await request.formData();
      const rawMonth = formData.get("activeMonth");
      if (typeof rawMonth === "string" && isValidBillingMonth(rawMonth)) {
        activeMonth = rawMonth;
      }

      const file = formData.get("audio");
      if (!(file instanceof Blob) || file.size === 0) {
        return NextResponse.json({ error: "Áudio vazio." }, { status: 400 });
      }
      if (file.size > MAX_AUDIO_BYTES) {
        return NextResponse.json(
          { error: "Áudio excede o limite de 2 MB." },
          { status: 413 }
        );
      }

      const normalizedMime = normalizeAudioMimeType(file.type || "audio/webm");
      if (!normalizedMime) {
        return NextResponse.json(
          { error: `Formato de áudio não suportado: ${file.type}` },
          { status: 415 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      audioPayload = {
        base64: buffer.toString("base64"),
        mimeType: normalizedMime,
      };
    } else {
      const body = (await request.json()) as { text?: string; activeMonth?: string };
      if (typeof body.activeMonth === "string" && isValidBillingMonth(body.activeMonth)) {
        activeMonth = body.activeMonth;
      }
      textInput = typeof body.text === "string" ? body.text.trim() : "";
      if (!textInput || textInput.length > 500) {
        return NextResponse.json(
          { error: "Digite entre 1 e 500 caracteres." },
          { status: 400 }
        );
      }
    }

    const intent = await interpreter.interpret({
      text: textInput,
      audio: audioPayload?.mimeType
        ? { base64: audioPayload.base64, mimeType: audioPayload.mimeType }
        : undefined,
      activeMonth,
      todayISO: getTodayISO(),
    });

    const repo = getRepository();
    const execution = await executeDolIntent(repo, session.userId, intent, activeMonth);

    const event = await repo.createChatEvent(session.userId, {
      billing_month: execution.targetMonth,
      user_input_text: textInput ?? intent.transcript,
      input_mode: inputMode,
      card_type: execution.cardType,
      payload_json: execution.payload,
    });

    const state = await loadFullMonthState(repo, session.userId, activeMonth);

    return NextResponse.json({
      event,
      ...state,
      highlightCategory: execution.highlightCategory,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar solicitação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
