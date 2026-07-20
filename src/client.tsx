import { useVoiceAgent, type VoiceStatus } from "@cloudflare/voice/react";
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  PhoneIcon,
  PhoneDisconnectIcon,
  WaveformIcon,
  SpinnerGapIcon,
  SpeakerHighIcon,
  ChatCircleDotsIcon,
  WifiHighIcon,
  WifiSlashIcon,
  PaperPlaneRightIcon,
  MoonIcon,
  SunIcon
} from "@phosphor-icons/react";
import {
  Button,
  Input,
  Surface,
  Text,
  PoweredByCloudflare
} from "@cloudflare/kumo";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  DEFAULT_STT_SETTINGS,
  ProviderSettings,
  getSttQuery,
  type SttSettings
} from "./stt-settings";
import { LLM_ALIASES } from "./agent-config";
import { createRoot } from "react-dom/client";
import "./styles.css";

type LlmAlias = keyof typeof LLM_ALIASES;

function getSessionId(): string {
  const KEY = "voice-agents-starter-session-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function getStatusDisplay(status: VoiceStatus) {
  switch (status) {
    case "idle":
      return { text: "Ready", icon: PhoneIcon, color: "text-kumo-secondary" };
    case "listening":
      return {
        text: "Listening...",
        icon: WaveformIcon,
        color: "text-kumo-success"
      };
    case "thinking":
      return {
        text: "Thinking...",
        icon: SpinnerGapIcon,
        color: "text-kumo-warning"
      };
    case "speaking":
      return {
        text: "Speaking...",
        icon: SpeakerHighIcon,
        color: "text-kumo-info"
      };
  }
}

function ModeToggle() {
  const [mode, setMode] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    document.documentElement.style.colorScheme = mode;
    localStorage.setItem("theme", mode);
  }, [mode]);

  return (
    <Button
      variant="ghost"
      shape="square"
      aria-label="Toggle theme"
      onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
      icon={mode === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    />
  );
}

function getAudioOutputLabel(device: MediaDeviceInfo, index: number) {
  if (device.deviceId === "default") return "System default";
  if (device.deviceId === "communications") return "Communications default";
  return device.label || `Speaker ${index + 1}`;
}

function App() {
  const sessionId = useRef(getSessionId()).current;
  const [sttSettings, setSttSettings] =
    useState<SttSettings>(DEFAULT_STT_SETTINGS);
  const [llmModel, setLlmModel] = useState<LlmAlias>("glm");
  const [outputDeviceId, setOutputDeviceId] = useState("default");
  const [textInput, setTextInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceInfo[]
  >([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    status,
    transcript,
    interimTranscript,
    metrics,
    audioLevel,
    isMuted,
    connected,
    error,
    outputDeviceError,
    startCall,
    endCall,
    toggleMute,
    sendText
  } = useVoiceAgent({
    agent: "my-voice-agent",
    name: sessionId,
    query: { llm: llmModel, ...getSttQuery(sttSettings) },
    outputDeviceId,
    onReconnect: () => setToast("Reconnected to agent.")
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshAudioOutputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setAudioOutputDevices(
      devices.filter((device) => device.kind === "audiooutput")
    );
  }, []);

  useEffect(() => {
    void refreshAudioOutputs().catch(() => {
      setToast("Could not list speakers for this browser.");
    });
    navigator.mediaDevices?.addEventListener(
      "devicechange",
      refreshAudioOutputs
    );
    return () => {
      navigator.mediaDevices?.removeEventListener(
        "devicechange",
        refreshAudioOutputs
      );
    };
  }, [refreshAudioOutputs]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimTranscript]);

  const handleStartCall = useCallback(async () => {
    await startCall();
    await refreshAudioOutputs().catch(() => {});
  }, [refreshAudioOutputs, startCall]);

  const isInCall = status !== "idle";
  const statusDisplay = getStatusDisplay(status);
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <Surface className="w-full max-w-lg rounded-2xl p-8 ring ring-kumo-line">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChatCircleDotsIcon
              size={28}
              weight="duotone"
              className="text-kumo-brand"
            />
            <Text variant="heading1" as="h1">
              Voice Agent
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 text-xs ${connected ? "text-kumo-success" : "text-kumo-secondary"}`}
            >
              {connected ? (
                <WifiHighIcon size={14} weight="bold" />
              ) : (
                <WifiSlashIcon size={14} weight="bold" />
              )}
              {connected ? "Connected" : "Connecting..."}
            </span>
            <ModeToggle />
          </div>
        </div>

        <ProviderSettings
          settings={sttSettings}
          disabled={isInCall}
          onChange={setSttSettings}
        />

        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="text-xs text-kumo-secondary">LLM:</span>
          {(
            [
              ["glm", "GLM"],
              ["gpt-oss-20b", "GPT-OSS 20B"],
              ["kimi", "Kimi"]
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant={llmModel === id ? "primary" : "ghost"}
              size="sm"
              disabled={isInCall}
              onClick={() => setLlmModel(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        {toast && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600 dark:text-blue-400">
            {toast}
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Surface className="rounded-xl px-4 py-3 text-center ring ring-kumo-line mb-4">
          <div
            className={`flex items-center justify-center gap-2 ${statusDisplay.color}`}
          >
            <StatusIcon
              size={20}
              weight="bold"
              className={status === "thinking" ? "animate-spin" : ""}
            />
            <span className={`text-lg ${statusDisplay.color}`}>
              {statusDisplay.text}
            </span>
          </div>
          {isInCall && status === "listening" && (
            <div className="mt-2 h-1.5 bg-kumo-fill rounded-full overflow-hidden">
              <div
                className="h-full bg-kumo-success rounded-full transition-all duration-75"
                style={{ width: `${Math.min(audioLevel * 500, 100)}%` }}
              />
            </div>
          )}
        </Surface>

        {metrics && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-kumo-secondary font-mono">
            <span>
              LLM <span className="text-kumo-default">{metrics.llm_ms}ms</span>
            </span>
            <span className="text-kumo-line">/</span>
            <span>
              TTS <span className="text-kumo-default">{metrics.tts_ms}ms</span>
            </span>
            <span className="text-kumo-line">/</span>
            <span>
              First audio{" "}
              <span className="text-kumo-default">
                {metrics.first_audio_ms}ms
              </span>
            </span>
          </div>
        )}

        <Surface className="rounded-xl ring ring-kumo-line mb-6 h-72 overflow-y-auto">
          {transcript.length === 0 ? (
            <div className="h-full flex items-center justify-center text-kumo-secondary">
              <Text size="sm">
                {isInCall
                  ? "Start speaking..."
                  : connected
                    ? "Click Call to start a conversation"
                    : "Connecting to agent..."}
              </Text>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex flex-col gap-0.5 max-w-[80%]">
                    <div
                      className={`rounded-xl px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-kumo-brand/15 text-kumo-default"
                          : "bg-kumo-fill text-kumo-default"
                      }`}
                    >
                      {msg.text || (
                        <span className="text-kumo-secondary italic">...</span>
                      )}
                    </div>
                    {msg.timestamp && (
                      <span
                        className={`text-[10px] text-kumo-secondary px-1 ${msg.role === "user" ? "text-right" : "text-left"}`}
                      >
                        {formatTime(new Date(msg.timestamp))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {interimTranscript && (
                <div className="flex justify-end">
                  <div className="rounded-xl px-3 py-2 text-sm bg-kumo-brand/10 text-kumo-secondary italic border border-kumo-brand/20 border-dashed max-w-[80%]">
                    {interimTranscript}
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </Surface>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="flex flex-col items-center gap-1">
            <select
              aria-label="Audio output"
              value={outputDeviceId}
              onChange={(event) => setOutputDeviceId(event.target.value)}
              className="min-w-0 rounded-lg border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default"
            >
              <option value="default">System default</option>
              {audioOutputDevices
                .filter((device) => device.deviceId !== "default")
                .map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {getAudioOutputLabel(device, index)}
                  </option>
                ))}
            </select>
            {outputDeviceError && (
              <span className="max-w-48 text-center text-xs text-kumo-warning">
                {outputDeviceError}
              </span>
            )}
          </div>
          {!isInCall ? (
            <Button
              onClick={() => void handleStartCall()}
              className="px-8 justify-center"
              variant="primary"
              disabled={!connected}
              icon={<PhoneIcon size={20} weight="fill" />}
            >
              {connected ? "Start Call" : "Connecting..."}
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "secondary"}
                icon={
                  isMuted ? (
                    <MicrophoneSlashIcon size={20} weight="fill" />
                  ) : (
                    <MicrophoneIcon size={20} weight="fill" />
                  )
                }
              >
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                onClick={endCall}
                variant="destructive"
                icon={<PhoneDisconnectIcon size={20} weight="fill" />}
              >
                End Call
              </Button>
            </>
          )}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (textInput.trim() && connected) {
              sendText(textInput.trim());
              setTextInput("");
            }
          }}
        >
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={!connected || status === "thinking"}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={!connected || !textInput.trim() || status === "thinking"}
            icon={<PaperPlaneRightIcon size={16} weight="fill" />}
          >
            Send
          </Button>
        </form>

        <div className="mt-4 text-center text-[10px] text-kumo-secondary font-mono">
          Session: {sessionId.slice(0, 8)}...
        </div>

        <div className="mt-4 flex justify-center">
          <PoweredByCloudflare href="https://developers.cloudflare.com/agents/" />
        </div>
      </Surface>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
