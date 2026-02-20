# Banner Automation Pipeline

A React + React Flow pipeline that generates Hebrew Facebook ad banners from an Avatar persona document. It extracts pain points, generates 15 copy variations (5 curiosity, 5 benefit, 5 scarcity), creates minimalistic 1:1 RTL banner concepts, and generates images using Google’s Gemini (Nano Banana Pro) image API.

## Features

- **Upload Avatar document**: PDF, DOCX, or plain text / Markdown
- **Extract insights**: Pain points, desires, USPs via Gemini
- **Generate Hebrew copy**: 15 variations for Facebook ads (SoTA marketer tone)
- **Banner concepts**: Typography-focused, RTL, Hebrew font suggestions (Heebo, Rubik, Assistant)
- **Generate banners**: Up to 10 images per run via Gemini image generation
- **Gallery & export**: View images, download single or ZIP

## Setup

1. **Clone and install**

   ```bash
   cd "banner creation automation"
   npm install
   ```

2. **Environment**

   Copy `.env.local.example` to `.env.local` and set your Gemini API key:

   ```bash
   cp .env.local.example .env.local
   ```

   Get an API key from [Google AI Studio](https://aistudio.google.com/). Set:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deployment (users supply their own API keys)

In production, **you do not set a Gemini API key**. Each user enters their own key in the app (onboarding); it is stored encrypted in a cookie. You only need:

| Variable | Required? | Purpose |
|----------|-----------|--------|
| `ENCRYPTION_SECRET` | **Yes** | Encrypts/decrypts the cookie that stores the user’s API key. Generate with: `openssl rand -base64 32` |
| `GEMINI_API_KEY` | **No** | Only for local dev so you can skip re-entering your key. Do **not** set in production. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional | Only if you want “Upload to Drive” in the Gallery. Create an OAuth 2.0 Client ID (Web) in Google Cloud. |

**Steps for deploy:**

1. Set `ENCRYPTION_SECRET` in your host’s environment (e.g. Vercel → Project → Settings → Environment Variables).
2. Do **not** set `GEMINI_API_KEY` in production.
3. Optionally set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` if you want Drive upload.

Use `.env.example` (or `.env.local.example`) as a reference; in production the only required secret is `ENCRYPTION_SECRET`.

## Usage

1. Click **Upload Avatar** in the pipeline and paste your persona document or upload a PDF/DOCX.
2. Click **Run pipeline** to run: Extract → Copy → Concepts → Generate Banners.
3. Open **Gallery & Export** to download images or a ZIP.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- React Flow (`@xyflow/react`) for the pipeline UI
- Tailwind CSS, `cn` (clsx + tailwind-merge)
- Google GenAI (`@google/genai`) for text and image generation
- Document parsing: `pdf-parse`, `mammoth` (PDF, DOCX)
- Export: `jszip` for ZIP download

## Image model

The app uses Gemini for image generation (`generateContent` with `responseModalities: ["image"]`). The model name is set in `lib/genai.ts` as `IMAGE_MODEL`. If your key or region use a different model (e.g. Imagen or a preview name), update that constant.

## Phase 2 (future)

- **Art style**: Store reference banners and pass `referenceImages` to the image API.
- **Performance**: Meta Marketing API or CSV import (CTR/ROAS) to rank copy and concepts.

## Skills (optional)

When extending this project you can use:

- `npx skills add ibelick/ui-skills`
- `npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices`
