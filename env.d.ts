/* eslint-disable */
// Run `npm run types` after installing deps to regenerate from wrangler bindings.
interface __BaseEnv_Env {
  AI: Ai;
  MyVoiceAgent: DurableObjectNamespace<import("./src/server").MyVoiceAgent>;
  /** Plain text JSON var of voice agent settings (default in wrangler.jsonc). */
  VOICE_AGENT_CONFIG: string;
}
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("./src/server");
    durableNamespaces: "MyVoiceAgent";
  }
  interface Env extends __BaseEnv_Env {}
}
interface Env extends __BaseEnv_Env {}
