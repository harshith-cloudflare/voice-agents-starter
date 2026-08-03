# voice-agents-starter

Realtime voice agent on Cloudflare Workers (Workers AI only — no external API keys).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/harshith-cloudflare/voice-agents-starter)

## Config: `VOICE_AGENT_CONFIG`

Plain text Worker **var** (not a secret) — default in `wrangler.jsonc`:

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
| **Default / DTOC / CLI** | `vars.VOICE_AGENT_CONFIG` in `wrangler.jsonc` |
| **Override** | Dashboard → Settings → Variables (plain text) |
| **Local override** | Optional gitignored `.dev.vars` |
| **Athena playground** | Deploy dialog copies session JSON to paste into Variables |

Omitted keys inside the JSON fall back to Aria / flux / glm / aura-2 / asteria.

> If you previously set this via DTOC or `wrangler secret put`, **delete the secret** in the Dashboard so the plain var is used (secrets override vars).

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
