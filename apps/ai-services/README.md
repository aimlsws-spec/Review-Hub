# VIRAL KAR — AI Services

FastAPI service that verifies task submissions on behalf of the NestJS
backend. **No paid AI API key is used or required anywhere in this
service** — every capability is either a local rule-based heuristic or an
optional call to a tool that runs entirely on your own machine.

## What it does

1. Polls the backend for queued `AIVerificationJob` rows
   (`GET /internal/ai/verification-jobs/next`).
2. Downloads the submission's evidence file, if any
   (`GET /internal/ai/verification-jobs/:jobId/evidence`).
3. Runs verification:
   - **OCR** (optional) — reads text out of the screenshot/proof image via a
     locally-installed [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
     binary. Free, fully offline. If Tesseract isn't installed, this step is
     skipped automatically — verification still runs on heuristics alone.
   - **Fraud heuristics** (always on) — plain rule-based scoring over
     repeated attempts, junk/placeholder answers, and missing OCR text on an
     image submission. No model, no network call.
   - **Explanation text** (optional) — a one-sentence human-readable
     explanation via a locally-run [Ollama](https://ollama.com) instance,
     through its OpenAI-compatible API. Disabled by default
     (`LLM_ENABLED=false`); when enabled, a heuristic explanation is used
     instead if Ollama isn't reachable.
4. Reports the decision back
   (`POST /internal/ai/verification-jobs/:jobId/complete` or `.../fail`).

The backend independently re-checks confidence/fraud thresholds before
acting on any decision (see `AI_VERIFICATION_THRESHOLDS` in
`apps/backend/src/modules/ai/constants`) — this service's verdict is
never trusted blindly.

## Setup

```bash
cd apps/ai-services
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env
```

The default `.env` values match the dev API key seeded by
`apps/backend/prisma/seed.ts` (`AI_SERVICE_API_KEY=ai-service-dev`) — no
changes needed to talk to a local backend running on port 3000.

## Running

```bash
uvicorn src.main:app --reload --port 8000
```

Check `GET /health` — it reports whether OCR/LLM are actually available on
this machine, so you can confirm they're wired up without guessing:

```json
{ "status": "ok", "ocrAvailable": false, "llmAvailable": false }
```

### Enabling OCR (optional, free)

Install Tesseract, then either leave it on PATH or set `TESSERACT_CMD` in
`.env` to its full path.

### Enabling the LLM explanation text (optional, free)

Install [Ollama](https://ollama.com), run `ollama pull llama3.2` and
`ollama serve`, then set `LLM_ENABLED=true` in `.env`.

## Testing

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
```

Tests cover the fraud heuristics and verification decision logic directly
(no network, no backend required).
