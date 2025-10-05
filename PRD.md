# Product Requirements Document (PRD): DevStudy AI Suite

**Version**: 1.0
**Date**: September 30, 2025
**Course**: CSE 410: Software Development Lab
**Project Type**: Web Application

---

## 1. Vision & Outcomes

Create a student-friendly web app that bundles three lightweight experiences—**DevStudy Chatbot**, **DevStudy Tools**, and **DevStudy Notes**—inside a single responsive interface. Focus on:

- Fast path to a working demo for coursework.
- Smooth, mobile-ready UI that feels familiar to users of ChatGPT or Gemini.
- AI features powered by free OpenRouter models, with users supplying their own API keys.
- Maintainable scope that a small student team can deliver within one semester.

Success looks like: a polished demo, core workflows functioning end-to-end, and a codebase that classmates can understand and extend.

---

## 2. Audience & Core Use Cases

- **Primary**: Computer science undergrads juggling coding assignments and theory-heavy lectures.
  - Ask natural-language coding questions and get Markdown-formatted answers.
  - Summarize lecture PDFs into concise study notes on mobile.
  - Use quick utility tools (format JSON, generate UUIDs) during lab sessions.
- **Secondary**: Self-taught developers or bootcamp students needing structured help.
  - Translate snippets between languages, review code for common issues, and create practice quizzes.

Out-of-scope for this release: enterprise-grade privacy controls, complex collaboration, or AI model fine-tuning.

---

## 3. Product Scope

### 3.1 Modules

- **DevStudy Chatbot**
  - Chat UI with message history, Markdown rendering, and code syntax highlighting.
  - Model picker limited to OpenRouter free-tier models (start with at least two presets such as `openrouter/auto:free` and `deepseek/deepseek-r1:free`).
  - Streaming responses via standard `fetch`/ReadableStream APIs; no Vercel AI SDK.
  - Attachments for small text-based files (.txt, .md, .pdf up to 5MB) with inline preview.
  - Settings modal for entering personal OpenRouter API key (required for all users, including guests).

- **DevStudy Tools** (focus on breadth, low implementation cost)
  - AI-backed: code explanation, code generation scaffold, and SQL query builder (reuse chatbot backend with tailored prompts).
  - Non-AI utilities: JSON/YAML formatter, UUID generator, Base64 encoder/decoder, Markdown ⇄ HTML converter.
  - Category browsing with search and favorites stored in local storage.

- **DevStudy Notes**
  - Upload PDF/Markdown/TXT files; extract text with pdf.js or native browser APIs.
  - Chunk text client-side, send relevant context to OpenRouter for summaries or flashcard generation.
  - Store processed documents, note summaries, and flashcards in Supabase (per user) with simple tagging.
  - Provide Markdown preview and export to `.md`.

### 3.2 Non-Goals (Defer or Drop)

- Real-time collaboration, shared workspaces, or live cursors.
- Advanced analytics dashboards or detailed progress tracking.
- OCR for complex images, audio transcription, or video ingestion.
- Full-blown security hardening beyond basic best practices necessary for demo purposes.

---

## 4. Experience Principles & UI Guidelines

- **Effortless**: Core actions (ask question, upload note, run tool) must be reachable within two taps on mobile.
- **Familiar**: Chat layout mirrors mainstream AI chat products with clear role separation and inline Markdown rendering (use `react-markdown` + syntax highlighting).
- **Responsive-first**: Design mobile layout first (375px baseline), then scale up. Sidebar collapses to bottom sheet on small screens.
- **Built-in before bespoke**: Favor Next.js App Router layouts, `next/image`, `next/font`, and headless HTML elements styled with Tailwind before adding extra libraries.
- **Motion with purpose**: Limit animations to loading skeletons and micro-interactions that clarify state; avoid heavy transitions.

Visual system (lean):

- Typography: load one display font (Bricolage Grotesque) via `next/font`, fallback to system sans; use a single monospace (Google Sans Code).
- Colors: light/dark theme toggles with soft neutrals and a single accent color (indigo or purple) for primary actions.
- Spacing: 4px baseline grid, max content width 1200px on desktop.

---

## 5. Simplified Technical Architecture

> **Implementation rule:** Always retrieve the latest official docs for frameworks and APIs via `#mcp_context7_get-library-docs` before building or updating modules to stay aligned with current features.

### 5.1 Frontend

- **Framework**: Next.js 15 (App Router) with TypeScript and React 19 (`/vercel/next.js` docs via Context7).
- **Styling**: Tailwind CSS v4 + CSS variables for theming; minimal custom components, optionally enhance with Headless UI for accessibility if needed.
- **State**: React Context + hooks for shared state (chat history, tool settings). LocalStorage for client-side persistence (favorites, API keys—encrypted at rest via Web Crypto if time permits).
- **Markdown Rendering**: `react-markdown` with syntax plugins for code blocks.

### 5.2 Backend & API layer

- **Route Handlers** (`app/api/*`):
  - `/api/chat`: proxies user prompts to OpenRouter with streaming response.
  - `/api/notes/summarize`: accepts extracted text chunk IDs, fetches relevant content, calls OpenRouter summarization prompt.
  - `/api/tools/*`: lightweight endpoints that wrap shared prompt templates for AI-backed tools.
- Each handler validates API key presence in request headers (provided by client) and returns helpful errors when missing.
- Use standard `fetch` to call OpenRouter; stream with `ReadableStream` per [OpenRouter API streaming docs](https://openrouter.ai/docs/api-reference/streaming) retrieved via Context7 (`/llmstxt/openrouter_ai_llms-full_txt`).

### 5.3 Data & Storage

- **Supabase (Free Tier)**: Auth (email/password + Google OAuth) and Postgres tables for:
  - `profiles`: user metadata and feature flags.
  - `documents`: uploaded files metadata, processed text, tags.
  - `notes`: generated summaries/flashcards linked to documents.
  - `chat_sessions`: optional saved conversations (limit per user to stay within quota).
- **Supabase Storage**: optional for raw file uploads; otherwise store processed text only to minimize usage.
- **Guest experience**: limited to session-based storage (browser only); prompt for API key before first AI request.

### 5.4 AI Integration

- Provider: **OpenRouter** free models only; no paid keys shipped with app.
- Streaming: use `fetch` with `ReadableStream` (`POST /api/chat` blueprint from Next.js docs) to stream tokens to UI.
- Markdown-first output enforced via system prompt instructions.
- Allow user to set default model, temperature, and max tokens in settings stored locally.
- Future-proof by keeping model list configurable (pulled from static JSON or Supabase table).

### 5.5 Document Processing

- **pdf.js** for PDFs; `FileReader` for Markdown/TXT.
- Basic client-side chunking (e.g., 800-token segments) using `js-tiktoken` or simple word count heuristics.
- Store embeddings only if time permits; otherwise, rely on keyword filters + user-selected sections to keep scope manageable.
- For extended time, integrate Supabase pgvector with small footprint (optional milestone).

### 5.6 Deployment & Tooling

- Hosted on Vercel (free tier) with GitHub auto-deploy.
- ESLint + Prettier + TypeScript strict mode.
- Testing priority: smoke tests for API routes and React component snapshots (Vitest + Testing Library) if schedule allows.
- MCP Server references for future integrations:
  - [Openrouterai MCP](https://github.com/heltonteixeira/openrouterai) for tooling inspiration.
  - [Any-Chat-Completions-MCP](https://github.com/pyroprompts/any-chat-completions-mcp) as reference for multi-provider routing.

Simplified diagram:

```plain
┌────────────────────────────┐
│        Client (Next.js)    │
│  - App Router pages        │
│  - Tailwind UI             │
│  - React Context           │
│  - LocalStorage settings   │
└───────────┬────────────────┘
            │ fetch / stream
┌───────────▼────────────────┐
│    Next.js Route Handlers  │
│  /api/chat, /api/notes/... │
│  Validate user API key      │
└───────────┬────────────────┘
            │ HTTPS
┌───────────▼────────────────┐
│        OpenRouter API       │
│   Free model endpoints      │
└───────────┬────────────────┘
            │ Supabase client
┌───────────▼────────────────┐
│        Supabase (Auth + DB)│
│  Profiles, documents, notes│
└────────────────────────────┘
```

---

## 6. Functional Requirements

### 6.1 Shared

- Mobile-responsive layouts with accessible navigation (hamburger + bottom sheet on small screens).
- Dark/light theme toggle with system default detection.
- Keyboard shortcuts for desktop (`Ctrl/⌘ + /` to focus prompt, `Ctrl/⌘ + K` to open command palette).
- Settings drawer for user preferences and API key entry; block AI actions until key is provided.

### 6.2 DevStudy Chatbot

- Rich text input with support for multiline prompts and copy/paste code.
- Conversation list with recent five sessions (Supabase for authenticated users; indexedDB or localStorage for guests).
- Streaming answer renderer with Markdown preview, math (KaTeX) optional stretch.
- Quick actions: “Regenerate”, “Copy Markdown”, “Insert into Notes”.
- Basic token usage indicator (estimate via word count).

### 6.3 DevStudy Tools

- Tools index page with filters (AI Tools vs Utilities vs Favorites).
- Shared result panel with Markdown output and copy/download controls.
- AI-backed tools reuse chatbot API with prefilled system prompts.
- Non-AI utilities run entirely client-side; provide instant feedback.

### 6.4 DevStudy Notes

- Upload flow with progress indicator, page count, and text preview.
- Summaries in three presets: concise bullets, detailed outline, flashcard set (Q/A pairs stored per document).
- Manual highlight selection: user can copy/paste text to focus summarization.
- Export options: download Markdown, copy to clipboard, send to Chatbot context.

---

## 7. Non-Functional Priorities (Lean)

- **Performance**: Initial page load < 2s on broadband; chatbot streaming starts < 1s after model response begins.
- **Reliability**: Handle OpenRouter errors gracefully (display friendly banner, allow retry).
- **Accessibility**: Semantic HTML, focus management, screen reader-friendly labels (WCAG Level A as minimum target).
- **Cost Awareness**: Stay within Vercel + Supabase + OpenRouter free tiers; throttle heavy workloads if needed.
- **Security (basic)**: HTTPS enforced via hosting; store API keys client-side only; document responsibility disclaimer for user-supplied keys.

---

## 8. Implementation Notes & Dependencies

- Before coding new sections, fetch current guidance via `#mcp_context7_get-library-docs` for Next.js, React, OpenRouter, Tailwind to avoid outdated patterns.
- When integrating OpenRouter, review streaming reference and authentication requirements (per docs above) to ensure compatibility with free models.
- Keep code comments minimal and purposeful (only for non-obvious logic or architectural decisions).
- Prefer built-in APIs (Web Streams, FileReader, Intl) over third-party packages where viable.

---

## 9. Milestones (11-week Semester)

| Week | Deliverable |
|------|-------------|
| 1 | Project scaffolding, Tailwind theme, responsive shell |
| 2 | Chatbot basic prompt/response flow with streaming |
| 3 | Chat history persistence (auth vs guest), Markdown renderer |
| 4 | Tools index + first three utilities (JSON formatter, UUID, Base64) |
| 5 | AI-backed tools via shared API endpoint |
| 6 | Notes upload pipeline (PDF/TXT) + summary generation |
| 7 | Flashcard generator + Markdown export |
| 8 | Mobile polish, settings drawer, API key UX |
| 9 | Supabase integration hardening, simple analytics logging |
| 10 | Usability testing, bug fixes, demo script |
| 11 | Final polish, documentation, presentation prep |

---

## 10. Metrics & Evaluation

- **Demo readiness**: All core flows tested on Chrome desktop + mobile emulator.
- **User satisfaction**: Collect qualitative feedback from ≥5 peers, target average rating ≥4/5 for usability and visual appeal.
- **AI performance**: ≥90% successful OpenRouter calls during testing week (log errors to Supabase table for monitoring).
- **Notes effectiveness**: Aim for generated summaries covering ≥80% of highlighted key points (subjective review by project team).

---

## 11. Risks & Mitigations

- **OpenRouter rate limiting or outages** → Provide clear fallback message, allow manual retry, document alternative free models.
- **Team bandwidth** → Prioritize Chatbot and 3–4 utilities before expanding features; treat Notes enhancements as stretch goals if behind schedule.
- **Supabase quota limits** → Regularly purge demo data, cap document uploads in UI, and encourage test users to delete old files.
- **API key misuse** → Remind users that keys are stored client-side and they are responsible for management; provide clear instructions on revocation.

---

## 12. Future Enhancements (Post-V1)

- Expand file support (audio transcription, slides) if time permits.
- Introduce lightweight spaced-repetition reminders for flashcards.
- Add collaborative sharing (link-based view) once authentication is stable.
- Explore local inference using WebLLM or edge models for offline demo.

---

**Document Status**: ✅ Ready for implementation using simplified scope.

**Next Steps**: Set up Next.js project, configure Tailwind, integrate Supabase auth, and prototype chatbot streaming with OpenRouter free models.

**Reminder**: No project-owned API keys—prompt every user (including guests) to supply their own OpenRouter key before accessing AI features.

---

*Prepared with reference to current Next.js and OpenRouter documentation via `#mcp_context7_get-library-docs`, ensuring alignment with latest APIs.*
