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

Each model was chosen for what it does best:

- **Gemini 2.0 Flash** — fast, cheap image analysis → ASCII reflection
- **Llama 4 Scout on Groq's LPU infrastructure** — fast language inference → creative prompt generation
- **DALL-E 2** — high-quality text-to-image → bold visual expansion
- **Supabase Edge Functions** — backend middleware for routing and API key security

This pipeline didn't happen overnight. An earlier exhibition using GPT-4 Vision for everything racked up a $200 API bill in a single day. The current architecture exists because simpler versions broke first.

---

## Research Foundation

The two-role design is grounded in three decades of creativity research:

- **Jansson & Smith (1991)** — *Design Fixation.* Similar examples cause designers to fixate, not expand.
- **CHI 2024** — *AI Output & Creativity.* Predictable AI output increases fixation.
- **Scientific Reports (2024)** — *Co-Creator Role.* AI as a co-creator (not an answer-provider) preserves creative self-efficacy.

The insight: design fixation happens when AI confirms too closely. Creative self-efficacy grows when AI expands beyond. The answer isn't one reinterpretation — it's two.

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

---

## Built With Cursor + Claude

The frontend was built in Cursor, pair-programmed with Claude. Design and engineering happened in the same working code — not as separate phases — so the gap between *"designed"* and *"shipping"* stayed small throughout.

---

## Status

Active thesis project · Exhibiting May 2026

---

## Acknowledgments

Thanks to my advisors, my testers, the brilliant engineer Sean who rescued me every time the backend broke, classmates who helped bring this work to Korea — and everyone who drew something weird into the system and told me what didn't work.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

*Echo reflects. Imagine expands.*
