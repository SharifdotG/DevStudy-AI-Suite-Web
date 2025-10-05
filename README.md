# DevStudy AI Suite Web

![DevStudy AI Suite banner](public/banner.gif)

DevStudy AI Suite is a student-focused productivity hub that bundles three lightweight experiences inside a responsive Next.js 15 application:

- **Chatbot** – Markdown-capable AI chat powered by free OpenRouter models that users access with their own API keys.
- **Tools** – Quick utilities (JSON/YAML formatter, UUID generator, Base64 encoder/decoder, Markdown ⇄ HTML) plus AI-assisted helpers for SQL, code explanation, and scaffolding.
- **Notes** – Upload PDFs/TXT/Markdown, summarize with OpenRouter, and persist structured study notes to Supabase.

The full product requirements live in [`PRD.md`](PRD.md). This repository captures the working implementation described there.

---

## Tech Stack

- **Framework**: Next.js 15 App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4, themed via `app/globals.css`
- **Data**: Supabase Auth + Postgres (client and server helpers under `lib/supabase/*`)
- **AI Provider**: OpenRouter free-tier models (streamed via route handlers under `app/api/*`)
- **Tooling**: ESLint (flat config), Turbopack dev/build, TypeScript strict mode

---

## Prerequisites

- Node.js 20+
- npm 10+ (repo uses `package-lock.json`)
- Supabase project with auth enabled
- Personal OpenRouter API key (request validation in the UI requires it)

---

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Copy environment template**

   ```bash
   cp .env.example .env.local
   ```

3. **Populate `.env.local`** with your Supabase REST credentials and site URL (see [Environment](#environment-variables)).

4. **Run the app**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` and sign up/log in using Supabase auth.

---

## Environment Variables

Variables are documented in `.env.example` and consumed in `lib/supabase/*`, `middleware.ts`, and auth actions.

| Name                          | Required | Description |
|------------------------------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | Yes      | Supabase project REST URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes    | Supabase anon key for client-side auth. |
| `NEXT_PUBLIC_SITE_URL`        | No       | Public base URL (defaults to `http://localhost:3000`). |

Supabase CLI configuration lives in `supabase/config.toml`. See `GOOGLE_OAUTH_SETUP.md` for Google provider wiring.

---

## Available Scripts

| Command        | Description |
|----------------|-------------|
| `npm run dev`  | Start the Turbopack development server on `http://localhost:3000`. |
| `npm run build`| Generate a production build with Turbopack. |
| `npm run start`| Serve the production build. |
| `npm run lint` | Run ESLint using the flat config defined in `eslint.config.mjs`. |
| `npx tsc --noEmit` | Optional explicit type check using project `tsconfig.json`. |

---

## Project Structure

```text
app/
 ├─ (suite)/layout.tsx        # Shell for authenticated experience
 ├─ (suite)/(chatbot)/chat/   # Chat surface routed through App Router
 ├─ (suite)/(tools)/tools/    # Tools directory with AI + utility flows
 ├─ (suite)/(notes)/notes/    # Notes ingestion and summarization UI
 ├─ api/                      # Route handlers that proxy to OpenRouter
 └─ _components/              # Shared UI components and contexts
lib/
 ├─ pdf.ts                    # pdf.js helpers for Notes module
 └─ supabase/                 # Supabase client/server utilities and types
supabase/                     # Supabase CLI configuration and migrations
```

Additional shared configuration:

- `app/_data/free-model-groups.ts` – curated list of OpenRouter free-tier models.
- `app/_styles/*.css` – theme extensions compatible with Tailwind v4 `@import` APIs.
- `middleware.ts` – guards authenticated routes and bootstraps Supabase session.

---

## Development Workflow

1. Run `npm run dev` for iterative work.
2. Use `npm run lint` before opening a pull request.
3. Type-check with `npx tsc --noEmit` when editing shared types or API handlers.
4. Keep comments concise and only for non-obvious logic (see `.github/copilot-instructions.md`).

Refer to [`CONTRIBUTING.md`](CONTRIBUTING.md) for branching, commit, and pull request guidelines.

---

## Deployment

The project targets Vercel. Configure the following environment variables in the deployment provider:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Enable Supabase OAuth providers and storage as described in `GOOGLE_OAUTH_SETUP.md` and `supabase/config.toml`.

---

## Security

- User-supplied OpenRouter API keys are stored client-side only (Settings dialog).
- Route handlers validate that an API key is supplied before proxying requests.
- Supabase Auth protects the `(suite)` routes; guests are limited to local-only flows according to `PRD.md`.

See [`SECURITY.md`](SECURITY.md) for reporting instructions.

---

## License

Released under the [MIT License](LICENSE).

---

## Contributing

Community contributions are welcome. Review [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md) before submitting issues or pull requests.

If you are new to the codebase, start with the architectural overview in `PRD.md` and the Supabase/Google OAuth notes.

---

## Acknowledgements

- Built with Next.js 15, Tailwind CSS v4, and Supabase.
- Uses free-tier OpenRouter models listed in `free-models.json`.
- Project strategy inspired by coursework for CSE 410: Software Development Lab.
