# Postern

Your private AI inbox. Postern reads the email available to it, ranks it,
extracts tasks and deadlines, tracks unanswered threads, drafts replies and
presents a daily briefing — with all AI inference running locally through
Ollama.

> Status: scaffold. See `Postern — Project Specification` for the full plan.

## The core design rule

AI suggests; ordinary application logic and the user decide. The model never
sends mail, invents deadlines, or triggers actions on its own.

## Requirements

- Node.js 20 or newer
- [Ollama](https://ollama.com) running locally with a Qwen model pulled

## Setup

```bash
npm install
cp .env.example .env
```

## Running

```bash
npm run dev      # client and server together
npm test         # run the test suites
npm run build    # build the client
```

The API listens on `http://localhost:4000`, the client on
`http://localhost:5173`.

## Layout

```
postern/
├── client/   React + Vite + Tailwind
├── server/   Node.js + Express
└── cli/      postern doctor (later)
```

The frontend never touches SQLite, Gmail tokens, or Ollama directly.

## Privacy

Analysis runs on your own machine. Email bodies and tokens are never logged.
Local inference is not the same as fully offline or fully secure — see the
specification's honest trade-offs.
