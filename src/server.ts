import {
  Agent,
  routeAgentRequest,
  type Connection,
  type WSMessage
} from "agents";
import {
  withVoice,
  WorkersAITTS,
  type VoiceTurnContext,
  type Transcriber
} from "@cloudflare/voice";
import { streamText } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { createVoiceTranscriber } from "./stt-providers";
import {
  buildSystemPrompt,
  configFromEnv,
  getTtsModelId,
  resolveAgentConfig,
  type AgentConfig
} from "./agent-config";

const VoiceAgent = withVoice(Agent, { historyLimit: 10 });

export class MyVoiceAgent extends VoiceAgent<Env> {
  /** Built from `VOICE_AGENT_CONFIG`; refreshed when a call starts. */
  tts!: WorkersAITTS;

  #activeSpeakerId: string | null = null;

  #buildTts(config: AgentConfig): WorkersAITTS {
    const model = getTtsModelId(config.ttsModel);
    if (config.ttsModel === "aura-1") {
      return new WorkersAITTS(this.env.AI, { model });
    }
    return new WorkersAITTS(this.env.AI, {
      model,
      speaker: config.ttsSpeaker
    });
  }

  #config(connectionUri?: string | null): AgentConfig {
    const config = resolveAgentConfig(this.env, connectionUri);
    this.tts = this.#buildTts(config);
    return config;
  }

  createTranscriber(connection: Connection): Transcriber {
    return createVoiceTranscriber(connection, this.env);
  }

  beforeCallStart(connection: Connection): boolean {
    if (this.#activeSpeakerId && this.#activeSpeakerId !== connection.id) {
      connection.send(
        JSON.stringify({
          type: "error",
          message:
            "Another session is currently the active speaker. End the other call or take over."
        })
      );
      return false;
    }

    try {
      this.#config(connection.uri);
    } catch (err) {
      connection.send(
        JSON.stringify({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "VOICE_AGENT_CONFIG is missing or invalid."
        })
      );
      return false;
    }

    this.#activeSpeakerId = connection.id;
    return true;
  }

  onCallEnd(connection: Connection) {
    if (this.#activeSpeakerId === connection.id) {
      this.#activeSpeakerId = null;
    }
  }

  onClose(connection: Connection) {
    if (this.#activeSpeakerId === connection.id) {
      this.#activeSpeakerId = null;
    }
  }

  onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") return;
    try {
      const parsed = JSON.parse(message) as { type?: string };
      if (parsed.type === "kick_speaker") {
        this.#handleKick(connection);
      }
    } catch {
      // ignore non-JSON
    }
  }

  #handleKick(requester: Connection) {
    if (!this.#activeSpeakerId) return;

    const activeConn = [...this.getConnections()].find(
      (c) => c.id === this.#activeSpeakerId
    );

    if (activeConn) {
      activeConn.send(
        JSON.stringify({
          type: "error",
          message: "Another session has taken over as the active speaker."
        })
      );
      this.forceEndCall(activeConn);
    }

    this.#activeSpeakerId = null;
    requester.send(
      JSON.stringify({
        type: "speaker_available",
        message: "Previous speaker has been disconnected. You can start a call."
      })
    );
  }

  async onTurn(transcript: string, context: VoiceTurnContext) {
    const workersAi = createWorkersAI({ binding: this.env.AI });
    const config = resolveAgentConfig(this.env, context.connection.uri);

    const result = streamText({
      model: workersAi(config.llmModelId as Parameters<typeof workersAi>[0], {
        sessionAffinity: this.sessionAffinity
      }),
      system: buildSystemPrompt(config),
      messages: this.getConversationHistory(10).map(({ role, content }) => ({
        role: role as "user" | "assistant",
        content
      })),
      abortSignal: context.signal
    });

    return result.fullStream;
  }

  async onCallStart(connection: Connection) {
    const { agentName } = resolveAgentConfig(this.env, connection.uri);
    await this.speak(
      connection,
      `Hi, I'm ${agentName}. Ask me anything about Cloudflare.`
    );
  }
}

function configErrorResponse(err: unknown): Response {
  const message =
    err instanceof Error ? err.message : "VOICE_AGENT_CONFIG is invalid.";
  return Response.json({ error: message }, { status: 500 });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config") {
      try {
        return Response.json(configFromEnv(env));
      } catch (err) {
        return configErrorResponse(err);
      }
    }

    if (url.pathname === "/api/health") {
      try {
        configFromEnv(env);
        return Response.json({ ok: true, agent: "voice-agents-starter" });
      } catch (err) {
        return configErrorResponse(err);
      }
    }

    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
