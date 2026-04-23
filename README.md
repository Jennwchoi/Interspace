# Interspace

> A quiet room for you and AI to draw together.

Interspace is a creative drawing platform that reimagines AI's role in co-creation — not as a tool that gives answers, but as a partner that reveals possibilities.

**ITP Thesis · NYU · 2026**
**Jenn Choi** · [jennwchoi.com](https://jennwchoi.com)

---

## The Question

Most AI creative tools hand you a finished, pixel-perfect answer. And when AI gives the answer, humans stop asking questions. Exploration ends. Imagination ends.

What if AI didn't end the exploration — but extended it?

---

## What Interspace Does

Interspace separates AI's role into **two complementary functions**:

- **Echo** — a subtle reinterpretation that reflects user intention through ASCII art. It says *"I see what you're making."*
- **Imagine** — a bold reinterpretation that expands possibilities through generative imagery. It says *"But have you considered this?"*

Neither alone works. Together, they give users the grounding they need *and* the provocation they didn't know they wanted.

**Echo reflects. Imagine expands.**

---

## Four Modes of Creative Provocation

Imagine doesn't offer one type of expansion — it offers four, so users can pick the provocation that fits the moment:

| Mode | What it does |
|------|-------------|
| **What if...** | Speculative thinking — elevates the ordinary into the dreamlike |
| **The opposite** | Poetic intervention — reverses the emotional or visual logic |
| **Stretch it** | Magnification — expands the drawing beyond its boundaries |
| **Question it** | Defamiliarization — questions the assumptions embedded in the form |

---

## How It Works

I designed this architecture from scratch — every service chosen, routed, and integrated by me.

A user's drawing moves through three AI services, each chosen for a specific role:

```
User Drawing (Canvas)
        │
        ▼
Supabase Edge Functions — request routing, API key security
        │
        ├─────────────┬──────────────┐
        ▼             ▼              ▼
   Gemini 2.0      Llama 4 Scout   (passes prompt to)
   Flash           (on Groq)          │
        │             │              ▼
        │             │         DALL-E 2
        ▼             ▼         (OpenAI)
   ASCII + keywords  creative prompt │
   = ECHO                            ▼
                                 Imagine image
                                 = EXPANSION
        │                            │
        └─────────────┬──────────────┘
                      ▼
          Compare & Get Inspired (UI)
```

**Echo is a single-shot call.** Gemini 2.0 Flash returns ASCII art, keywords, a visual description, and the imagePrompt for Imagine — all in one JSON response. One model, one call, four outputs.

**Response timing:**
- **Echo:** ~5–7 seconds from stroke-pause (4s debounce + 1–3s inference)
- **Imagine:** +6–12 seconds after Echo (Groq 1–2s + DALL-E 2 5–10s), throttled to once per 45 seconds

**Supabase Edge Functions** serve as an API proxy — handling request routing, API key protection, and CORS. No streaming, no DB sync, no rate limiting; AI APIs handle their own 429s.

---

## Research Foundation

Grounded in research on design fixation and AI co-creation — full references in the thesis doc.

---

## User Testing Insights

Two assumptions broke during testing:

| Assumption | Reality |
|-----------|---------|
| Users need AI to generate ideas for what to draw | Users already know what they want to draw |
| Showing similar finished images will inspire users | Similar images don't inspire — they just confirm |

These findings redirected the project from *"providing ideas"* to *"revealing possibilities"* — and led directly to the two-role solution.

---

## Tech Stack

Each choice was a tradeoff between speed, cost, and quality — not defaults.

| Layer | Choice |
|-------|--------|
| Framework | Vite · React 18 · TypeScript |
| UI | Tailwind CSS · shadcn/ui · Lucide Icons |
| Animation | Motion (Framer Motion) |
| Backend | Supabase (Edge Functions · Postgres · Auth) |
| Edge Runtime | Hono on Deno |
| AI — Vision & ASCII | Google Gemini 2.0 Flash |
| AI — Creative Prompting | Meta Llama 4 Scout (via Groq) |
| AI — Image Generation | OpenAI DALL-E 2 |

All AI API calls are routed through Supabase Edge Functions so keys are never exposed to the client.

---

## Running Locally

```bash
git clone https://github.com/<your-username>/interspace.git
cd interspace
npm install

cp .env.example .env
# Fill in your Supabase credentials

npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

Client-side (`.env` at project root):

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Server-side secrets (set in your Supabase project dashboard or via CLI):

```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set GROQ_API_KEY=...
supabase secrets set OPENAI_API_KEY=...
```

---

## Design Principles

Three principles shaped every interaction in Interspace:

1. **Reflection before expansion.** Users need to feel seen before they'll follow a provocation.
2. **Offer provocations, not answers.** AI suggests directions; the user decides where to go.
3. **Separation of roles.** One AI can't do every job well — each service is chosen for what it does best.

---

## What I Learned

**The problem definition evolved.** I started by solving *"what to draw"* and ended up solving *"how to stay curious while drawing."*

**User testing broke my assumptions.** Similar examples don't inspire — they confirm. Users didn't need AI to generate ideas; they needed room to follow their own.

**Balance matters more than novelty.** Good AI doesn't replace thinking. It sits between confirmation and provocation — and the sweet spot shifts with intent.

**Designing in code changed how I design.** Every architectural decision was a design decision — latency budgets, model selection, and API routing all shaped what the interaction could feel like.

---

## Built With Cursor + Claude

Designed and built end-to-end in Cursor with Claude. Design decisions were tested in working code, not static mockups — the gap between *"designed"* and *"shipping"* wasn't a handoff, it was the workflow.

---

## Status

Active thesis project · Exhibiting May 2026

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

*Echo reflects. Imagine expands.*
