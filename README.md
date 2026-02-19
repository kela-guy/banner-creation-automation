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
