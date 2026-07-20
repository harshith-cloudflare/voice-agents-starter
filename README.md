# voice-agents-starter

Realtime voice agent on Cloudflare Workers (Workers AI only — no external API keys).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/harshith-cloudflare/voice-agents-starter)

## Config: `VOICE_AGENT_CONFIG`

Plain text Worker **var** (not a secret) — JSON agent settings shipped in `wrangler.jsonc`:

```json
{
  "agentName": "Aria",
  "instructions": "You are a warm and concise Cloudflare voice assistant. …",
  "sttModel": "flux",
  "sttLang": "en",
  "llmModel": "@cf/zai-org/glm-4.7-flash",
  "ttsModel": "aura-2",
  "ttsVoice": "asteria"
}
```

| Where | How |
| --- | --- |
| **Default** | `vars.VOICE_AGENT_CONFIG` in `wrangler.jsonc` |
| **Local override** | Optional `.dev.vars` (see `.dev.vars.example`) |
| **Production override** | Dashboard → Settings → Variables (plain text) |
| **Athena playground** | Deploy dialog copies session config to paste into Variables |

Omitted keys inside the JSON fall back to Aria / flux / glm / aura-2 / asteria. Invalid JSON → `/api/health` and `/api/config` return **500**.

> If you previously set this with `wrangler secret put`, delete that secret in the Dashboard so the plain var is used (secrets override vars).

## Run locally

```bash
npm install
npm run dev
```

## Deploy

```bash
npm install
npx wrangler login
npm run deploy
```
