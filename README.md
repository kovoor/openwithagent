# OpenWithAgent

One-click badges that hand off installation to the user's AI coding assistant.

[![Open with Agent](https://openwithagent.dev/badge.svg)](https://openwithagent.dev/open?repo=kovoor/openwithagent)

## What is this?

Developer tools often require complex installation steps. **OpenWithAgent** gives your repo a badge that sends users to a tool picker — they choose Claude Code, Cursor, or Codex, and get a ready-to-paste command with your install instructions.

## How it works

1. **Create your link** — encode instructions directly in the URL, or add a `.openwithagent.md` file to your repo
2. **Add the badge** — paste the markdown into your README
3. **Users click and go** — they pick their AI tool and get a command

## Two ways to provide instructions

### Option A: Encode in the URL (no file needed)

Use the [link generator](https://openwithagent.dev/#generator) to encode your instructions into the URL. Nothing to add to your repo.

### Option B: `.openwithagent.md` file

Add a `.openwithagent.md` file to your repo root with AI-friendly install instructions:

```markdown
# Install MyTool

1. Clone: `git clone https://github.com/you/mytool.git`
2. Install: `cd mytool && npm install`
3. Setup: `npm run setup`
```

Then link to it:

```markdown
[![Open with Agent](https://openwithagent.dev/badge.svg)](https://openwithagent.dev/open?repo=you/mytool)
```

## Badge variants

| Variant | Markdown |
|---------|----------|
| Default | `[![Open with Agent](https://openwithagent.dev/badge.svg)](YOUR_URL)` |
| Dark | `[![Open with Agent](https://openwithagent.dev/badge-dark.svg)](YOUR_URL)` |

## Supported tools

- **Claude Code** — `claude -p '...'`
- **Cursor** — `cursor --prompt '...'`
- **OpenAI Codex** — `codex '...'`
- **Copy prompt** — raw text for any AI tool

## Development

Static site, no build step. Serve the `public/` directory:

```bash
cd public && python3 -m http.server 8080
```

## Deploy

Hosted on Cloudflare Pages. Build output directory: `public/`.

## License

MIT
