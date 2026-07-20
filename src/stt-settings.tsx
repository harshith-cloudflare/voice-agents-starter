import { Surface } from "@cloudflare/kumo";
import { DEFAULT_STT, type VoiceSttKey } from "./agent-config";

export type SttSettings = {
  stt: VoiceSttKey;
};

export const DEFAULT_STT_SETTINGS: SttSettings = {
  stt: DEFAULT_STT
};

export function getSttQuery(settings: SttSettings): Record<string, string> {
  return { stt: settings.stt };
}

export function ProviderSettings({
  settings,
  disabled,
  onChange
}: {
  settings: SttSettings;
  disabled: boolean;
  onChange: (settings: SttSettings) => void;
}) {
  return (
    <Surface className="mb-4 rounded-xl p-3 ring ring-kumo-line">
      <div className="mb-2 flex flex-col gap-2">
        <span className="text-xs text-kumo-secondary">Speech-to-text</span>
        <select
          aria-label="Speech-to-text model"
          value={settings.stt}
          disabled={disabled}
          onChange={(event) =>
            onChange({ stt: event.target.value as VoiceSttKey })
          }
          className="w-full rounded-lg border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default"
        >
          <option value="flux">Workers AI Flux (default)</option>
          <option value="nova-3">Workers AI Nova 3</option>
        </select>
      </div>
      <p className="text-xs text-kumo-secondary">
        Workers AI only — no external STT keys. Override via connection query or
        VOICE_AGENT_CONFIG.
      </p>
    </Surface>
  );
}
