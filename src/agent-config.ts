/**
 * Runtime config from plain text Worker var `VOICE_AGENT_CONFIG` (JSON string).
 * Default ships in wrangler.jsonc `vars`. Missing/invalid JSON throws.
 * Field names match Athena playground `VoiceConfig`.
 */

export type VoiceSttKey = "flux" | "nova-3";
export type VoiceTtsModelKey = "aura-1" | "aura-2";

export const DEFAULT_AGENT_NAME = "Aria";
export const DEFAULT_INSTRUCTIONS =
  "You are a warm and concise Cloudflare voice assistant. Answer questions about Cloudflare products, keep replies short and natural for speech, and cite sources when you use them.";
export const DEFAULT_STT: VoiceSttKey = "flux";
export const DEFAULT_STT_LANG = "en";
export const DEFAULT_LLM_MODEL_ID = "@cf/zai-org/glm-4.7-flash";
export const DEFAULT_TTS_MODEL: VoiceTtsModelKey = "aura-2";
export const DEFAULT_TTS_SPEAKER = "asteria";
export const MAX_INSTRUCTIONS_LENGTH = 1000;

/** Short aliases accepted in JSON or connection query (`?llm=glm`). */
export const LLM_ALIASES: Record<string, string> = {
  glm: "@cf/zai-org/glm-4.7-flash",
  "gpt-oss-20b": "@cf/openai/gpt-oss-20b",
  kimi: "@cf/moonshotai/kimi-k2.7-code"
};

export const TTS_MODEL_IDS: Record<VoiceTtsModelKey, string> = {
  "aura-2": "@cf/deepgram/aura-2-en",
  "aura-1": "@cf/deepgram/aura-1"
};

export const AURA2_SPEAKERS = new Set([
  "amalthea",
  "andromeda",
  "apollo",
  "arcas",
  "aries",
  "asteria",
  "athena",
  "atlas",
  "aurora",
  "callista",
  "cora",
  "cordelia",
  "delia",
  "draco",
  "electra",
  "harmonia",
  "helena",
  "hera",
  "hermes",
  "hyperion",
  "iris",
  "janus",
  "juno",
  "jupiter",
  "luna",
  "mars",
  "minerva",
  "neptune",
  "odysseus",
  "ophelia",
  "orion",
  "orpheus",
  "pandora",
  "phoebe",
  "pluto",
  "saturn",
  "thalia",
  "theia",
  "vesta",
  "zeus"
]);

/** Accepted keys in `VOICE_AGENT_CONFIG` (playground names + short aliases). */
export type VoiceAgentConfigJson = {
  agentName?: string;
  instructions?: string;
  sttModel?: string;
  stt?: string;
  sttLang?: string;
  llmModel?: string;
  llm?: string;
  ttsModel?: string;
  ttsVoice?: string;
  ttsSpeaker?: string;
};

export type AgentConfig = {
  agentName: string;
  instructions: string;
  stt: VoiceSttKey;
  sttLang: string;
  llmModelId: string;
  ttsModel: VoiceTtsModelKey;
  ttsSpeaker: string;
};

export function getTtsModelId(ttsModel: VoiceTtsModelKey): string {
  return TTS_MODEL_IDS[ttsModel];
}

function asStt(value: string | null | undefined): VoiceSttKey | null {
  return value === "flux" || value === "nova-3" ? value : null;
}

function asTtsModel(value: string | null | undefined): VoiceTtsModelKey | null {
  return value === "aura-1" || value === "aura-2" ? value : null;
}

function asLlmModelId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (LLM_ALIASES[trimmed]) return LLM_ALIASES[trimmed];
  if (trimmed.startsWith("@cf/")) return trimmed;
  return null;
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveTtsSpeaker(
  ttsModel: VoiceTtsModelKey,
  speaker: string | undefined
): string {
  const requested = speaker?.trim() || DEFAULT_TTS_SPEAKER;
  if (ttsModel === "aura-2") {
    return AURA2_SPEAKERS.has(requested) ? requested : DEFAULT_TTS_SPEAKER;
  }
  return requested || DEFAULT_TTS_SPEAKER;
}

/** Normalize a parsed JSON object. Throws if `raw` is not a plain object. */
export function parseVoiceAgentConfig(raw: unknown): AgentConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      "VOICE_AGENT_CONFIG must be a JSON object (agentName, instructions, sttModel, …)."
    );
  }

  const obj = raw as VoiceAgentConfigJson;
  const ttsModel = asTtsModel(obj.ttsModel) ?? DEFAULT_TTS_MODEL;
  const llmModelId =
    asLlmModelId(obj.llmModel ?? obj.llm) ?? DEFAULT_LLM_MODEL_ID;
  const stt = asStt(obj.sttModel ?? obj.stt) ?? DEFAULT_STT;
  const sttLang = asTrimmedString(obj.sttLang) ?? DEFAULT_STT_LANG;
  const agentName = asTrimmedString(obj.agentName) ?? DEFAULT_AGENT_NAME;
  const instructions =
    asTrimmedString(obj.instructions) ?? DEFAULT_INSTRUCTIONS;
  const speaker = asTrimmedString(obj.ttsVoice ?? obj.ttsSpeaker);

  return {
    agentName: agentName.slice(0, 120),
    instructions: instructions.slice(0, MAX_INSTRUCTIONS_LENGTH),
    stt,
    sttLang: sttLang.slice(0, 8),
    llmModelId,
    ttsModel,
    ttsSpeaker: resolveTtsSpeaker(ttsModel, speaker)
  };
}

/** Read `VOICE_AGENT_CONFIG` var. Throws if missing/empty/invalid JSON. */
export function configFromEnv(env: {
  VOICE_AGENT_CONFIG?: string;
}): AgentConfig {
  const value = env.VOICE_AGENT_CONFIG;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      "VOICE_AGENT_CONFIG is missing. Set vars.VOICE_AGENT_CONFIG in wrangler.jsonc or override in .dev.vars / Dashboard Variables."
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error("VOICE_AGENT_CONFIG must be valid JSON.");
  }
  return parseVoiceAgentConfig(parsed);
}

/** Env config + optional per-connection query overrides. */
export function resolveAgentConfig(
  env: { VOICE_AGENT_CONFIG?: string },
  connectionUri?: string | null
): AgentConfig {
  const base = configFromEnv(env);
  const url = new URL(connectionUri ?? "http://localhost");

  const agentName = url.searchParams.get("agentName")?.trim();
  const instructions = url.searchParams.get("instructions")?.trim();
  const stt = asStt(url.searchParams.get("stt"));
  const sttLang = url.searchParams.get("sttLang")?.trim();
  const llmModelId = asLlmModelId(url.searchParams.get("llm"));
  const ttsModel = asTtsModel(url.searchParams.get("ttsModel"));
  const ttsSpeaker = url.searchParams.get("ttsSpeaker")?.trim();
  const resolvedTts = ttsModel ?? base.ttsModel;

  return {
    agentName: agentName ? agentName.slice(0, 120) : base.agentName,
    instructions: instructions
      ? instructions.slice(0, MAX_INSTRUCTIONS_LENGTH)
      : base.instructions,
    stt: stt ?? base.stt,
    sttLang: sttLang ? sttLang.slice(0, 8) : base.sttLang,
    llmModelId: llmModelId ?? base.llmModelId,
    ttsModel: resolvedTts,
    ttsSpeaker: resolveTtsSpeaker(resolvedTts, ttsSpeaker ?? base.ttsSpeaker)
  };
}

export function buildSystemPrompt(config: AgentConfig): string {
  return [
    config.instructions,
    `Your name is ${config.agentName}.`,
    "Keep responses concise and conversational — this is a spoken conversation.",
    "Do not use markdown, bullet points, code blocks, or emoji; reply in plain sentences."
  ].join(" ");
}
