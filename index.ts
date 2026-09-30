import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Homelab inference box (llama-swap, OpenAI-compatible).
// Models are read from the server at startup, so whatever llama-swap serves
// shows up here — no list to keep in sync by hand.
// Override with HOMELAB_BASE_URL when the box lives at another address.
const BASE_URL = process.env.HOMELAB_BASE_URL ?? "http://192.168.181.50:8080/v1";

// llama-swap advertises every alias as its own id. The -xhigh/-medium/-low/
// -nothink ids are the same weights with different chat_template_kwargs, and
// pi can send those itself (see thinkingLevelMap below), so only the base id
// is registered and the thinking level is chosen with `--model …:<level>`.
const ALIASES = /-(xhigh|medium|low|nothink)$/;

export default async function (pi: ExtensionAPI) {
  let served: Array<{ id: string }>;

  try {
    const response = await fetch(`${BASE_URL}/models`, {
      signal: AbortSignal.timeout(5000),
    });
    served = ((await response.json()) as { data: Array<{ id: string }> }).data;
  } catch {
    // The box is not always up: the model unloads after 3 minutes idle and the
    // node reboots. Registering nothing beats blocking pi from starting.
    return;
  }

  const models = served
    .filter((model) => !ALIASES.test(model.id))
    // pi picks the first model of a provider before consulting the saved
    // default (see model-resolver: "First model from scoped models"), and
    // /v1/models is alphabetical, which would start sessions on the small CPU
    // model. Put the GPU models first so the default is the capable one.
    .sort((a, b) => Number(a.id.includes("-cpu")) - Number(b.id.includes("-cpu")))
    .map((model) => {
      const cpu = model.id.includes("-cpu");
      return {
        id: model.id,
        name: model.id,
        reasoning: !cpu,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        // The 27B serves two slots of 256k; the small CPU model runs at 32k.
        contextWindow: cpu ? 32768 : 262144,
        maxTokens: cpu ? 8192 : 32768,
        // The model's own chat template accepts exactly three efforts — xhigh,
        // medium and low — and raises on anything else. Only those are offered;
        // pi's other levels map to null, which hides them rather than pretending
        // they exist. `off` needs no entry: the chat-template format sends
        // enable_thinking=false for it.
        ...(cpu
          ? {}
          : {
              thinkingLevelMap: {
                minimal: null,
                low: "low",
                medium: "medium",
                high: null,
                xhigh: "xhigh",
                max: null,
              },
              // compat belongs on the model, not the provider. This server
              // ignores OpenAI's top-level reasoning_effort: the chat template
              // reads its own kwargs, so thinking has to be sent that way.
              compat: {
                supportsReasoningEffort: false,
                thinkingFormat: "chat-template",
                chatTemplateKwargs: {
                  enable_thinking: { $var: "thinking.enabled" },
                  // Dropped when thinking is off, so the template never sees an
                  // effort value it would reject.
                  reasoning_effort: { $var: "thinking.effort", omitWhenOff: true },
                },
              },
            }),
      };
    });

  if (models.length === 0) return;

  pi.registerProvider("homelab", {
    baseUrl: BASE_URL,
    apiKey: "local", // llama-swap has no auth; pi requires a non-empty value
    api: "openai-completions",
    models,
  });
}
