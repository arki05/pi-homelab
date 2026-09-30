# pi-homelab

[![pi extension](https://img.shields.io/badge/pi-extension-5b4ee9)](https://pi.dev)

Homelab `llama-swap` pi extension. Auto-discovers models from a running
`llama-swap` server and registers them as the `homelab` provider in
[pi](https://pi.dev).

```bash
pi install git:github.com/<you>/pi-homelab
```

## Setup

Point at your box (defaults to `http://192.168.181.50:8080/v1`):

```bash
export HOMELAB_BASE_URL="http://<your-box>:8080/v1"
```

## Install

**From the shell:**

```bash
pi install git:github.com/<you>/pi-homelab
```

This clones the repo and adds an entry to your pi settings. Every future `pi`
invocation auto-loads it.

**From inside an interactive pi session:**

```
!pi install git:github.com/<you>/pi-homelab
```

Then run `/reload` (or restart pi) to load the extension.

**Dev mode:**

```bash
git clone https://github.com/<you>/pi-homelab ~/code/pi-homelab
pi -e ~/code/pi-homelab/index.ts
```

`-e` loads the extension only for the current session, useful while
developing.

## Notes

- The `-xhigh` / `-medium` / `-low` / `-nothink` alias ids are filtered out;
  thinking is chosen with `--model …:<level>` (`low`, `medium`, `xhigh`) and
  sent as chat-template kwargs, since the server ignores OpenAI's top-level
  `reasoning_effort`.
- GPU models sort before `-cpu` ones so pi's first-model default lands on the
  capable model.
- If the box is unreachable at startup the extension registers nothing rather
  than blocking pi from starting.
