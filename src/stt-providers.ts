import {
  WorkersAIFluxSTT,
  WorkersAINova3STT,
  type Transcriber
} from "@cloudflare/voice";
import type { Connection } from "agents";
import { resolveAgentConfig } from "./agent-config";

const KEYTERMS = ["Cloudflare", "Workers", "Durable Objects"];

export function createVoiceTranscriber(
  connection: Connection,
  env: Env
): Transcriber {
  const { stt, sttLang } = resolveAgentConfig(env, connection.uri);

  if (stt === "nova-3") {
    return new WorkersAINova3STT(env.AI, {
      language: sttLang,
      keyterms: KEYTERMS
    });
  }

  return new WorkersAIFluxSTT(env.AI, {
    eotThreshold: 0.8,
    keyterms: KEYTERMS
  });
}
