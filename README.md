# Before You Leave

**An AI Situation-Aware Exit Assistant**

> Don't forget what your situation makes easy to overlook.

---

## 1. The problem

People do not forget things because they lack a checklist. They forget things because
their *situation changed* and they did not notice what that change implies.

You remember your phone every single day. You forget the umbrella on the one rainy day,
the charger on the one day you carried a laptop, the old reports on the one day you had a
hospital review. Existing tools do not help here:

| Tool | Why it fails |
|---|---|
| Notes / checklist apps | You have to already know what to write down. If you knew, you wouldn't forget it. |
| Reminder apps | Time-based, not situation-based. |
| Siri / Alexa | Command executors. They answer what you ask; they don't reason about what you *didn't* ask. |
| Generic AI chatbots | Give generic lists. A chatbot will suggest a passport for a college exam. |

## 2. The solution

The user describes a **situation**, not a checklist:

- Where are you going?
- Why are you going?
- What are you already carrying?
- What is unusual about today?

An **AI Agent** reasons over that situation and returns a structured *Exit Check* split
into what is critical, what is easy to overlook, and what is merely useful — with a short
reason for every single item.

## 3. Key features

- **Situation-first input**, not manual checklist entry.
- **Real AI Agent** running in an n8n workflow, not hardcoded browser rules.
- **Strict structured JSON output**, rendered dynamically by the website.
- **Provenance labels** on every item: `Known` / `Inferred` / `External`.
- **Optional live weather tool** (keyless), which the agent may call when relevant.
- **Anti-hallucination rules** in the system prompt: the agent may not claim it checked
  weather, calendar or memory unless a tool actually returned data.
- **Clarifying question** instead of guessing when the input is too thin.
- Fully responsive, keyboard accessible, graceful error handling.

## 4. Architecture

```
USER (browser)
  │  POST application/json
  ▼
STATIC SITE on Netlify        index.html / style.css / script.js
  │  HTTPS
  ▼
n8n CLOUD workflow
  ├─ Website Webhook        POST /webhook/before-you-leave, CORS allowed origins = *
  ├─ Validate Input         Code node: trims, normalises, items -> array
  ├─ Exit Check AI Agent    Tools Agent
  │    ├─ Google Gemini Chat Model     (reasoning)
  │    ├─ Structured Output Parser     (forces the JSON schema)
  │    └─ Weather Tool                 (HTTP Request Tool -> wttr.in, optional)
  └─ Respond to Website     returns the agent's JSON object
  │
  ▼
WEBSITE renders the Exit Check
```

There is **no database** and **no user account**. The MVP does not need either, and adding
memory would force the agent to talk about past behaviour it does not actually have.

## 5. Technology stack

| Layer | Technology | Why this one |
|---|---|---|
| Frontend | HTML + CSS + vanilla JavaScript | No build step, no dependencies, deploys by drag-and-drop |
| Hosting | Netlify Drop | Instant public HTTPS URL, no git or CLI needed |
| Automation / backend | n8n Cloud | Gives a public HTTPS webhook and a visual AI Agent node |
| LLM | Google Gemini (`gemini-2.5-flash`) via AI Studio API key | Generous free tier, no credit card |
| Weather | `wttr.in` | Returns a one-line forecast, needs **no API key** |
| Output contract | n8n Structured Output Parser | Guarantees the JSON shape the frontend expects |

## 6. The n8n workflow

Import `n8n/before-you-leave-workflow.json` into n8n. Seven nodes:

1. **Website Webhook** — `POST`, path `before-you-leave`, response mode
   *Using 'Respond to Webhook' Node*, option **Allowed Origins (CORS)** = `*`.
2. **Validate Input** — Code node. Normalises the request body: trims strings, converts
   `items` to an array, supplies safe defaults. Never throws.
3. **Exit Check AI Agent** — Tools Agent. Receives the situation via an expression, so
   nothing is hardcoded.
4. **Google Gemini Chat Model** — the reasoning model.
5. **Structured Output Parser** — schema defined from a JSON example.
6. **Weather Tool** — HTTP Request Tool, `https://wttr.in/{city}?format=4`.
7. **Respond to Website** — responds with `{{ JSON.stringify($json.output) }}`.

## 7. The AI Agent's role

The agent is the **entire intelligence of the product**. It:

- classifies every item as `known`, `inferred` or `external`;
- refuses to output items with no logical link to the stated situation;
- decides by itself whether the weather tool is worth calling;
- asks one clarifying question when the input is too thin to reason about;
- returns machine-readable JSON, not prose.

The full system prompt lives in the workflow file under
`Exit Check AI Agent → options.systemMessage`.

## 8. API contract

### Request — website to n8n

`POST https://<your-n8n-host>/webhook/before-you-leave`

```json
{
  "destination": "College",
  "purpose": "Exam",
  "items": ["phone", "college ID", "pens", "hall ticket"],
  "special_conditions": "It is raining and I am carrying my laptop",
  "use_weather": false,
  "location": "",
  "client_time": "2026-09-29T04:15:00.000Z"
}
```

### Response — n8n to website

```json
{
  "situation": {
    "destination": "College",
    "purpose": "Exam",
    "conditions": "Rain, carrying a laptop"
  },
  "critical_items": [
    { "item": "Hall ticket", "reason": "Required to enter the exam hall", "source": "known" }
  ],
  "overlooked_items": [
    { "item": "Umbrella", "reason": "You said it is raining today", "source": "inferred" },
    { "item": "Laptop charger", "reason": "You are carrying a laptop", "source": "inferred" }
  ],
  "optional_items": [
    { "item": "Water bottle", "reason": "Exams often run long", "source": "inferred" }
  ],
  "final_exit_check": ["Phone", "College ID", "Pens", "Hall ticket", "Umbrella", "Laptop charger"],
  "clarifying_question": ""
}
```

`source` is one of `known`, `inferred`, `external`. The frontend renders it as a coloured
tag so the user can see *why* an item appeared. `clarifying_question` is shown as a banner
when it is non-empty.

## 9. Project structure

```
before-you-leave/
├── index.html          all six screens (home, setup, loading, result, error, about)
├── style.css           the whole visual system, one dark theme
├── script.js           input collection, fetch to n8n, rendering. No recommendation logic.
├── test.js             node test.js - checks the response normaliser
├── n8n/
│   └── before-you-leave-workflow.json    importable workflow
├── docs/
│   ├── TEST-CASES.md   five end-to-end test cases with expected reasoning
│   └── PRESENTATION.md viva answers and demo script
└── README.md
```

## 10. How to run locally

The site is plain static files, but do **not** open `index.html` by double-clicking —
a `file://` page cannot send cross-origin requests. Serve it instead:

```bash
cd before-you-leave
python -m http.server 5500
# then open http://localhost:5500
```

Run the logic check any time:

```bash
node test.js
```

## 11. How to configure the n8n URL

Open `script.js`. Line 10:

```js
const N8N_WEBHOOK_URL = "PASTE_YOUR_N8N_PRODUCTION_WEBHOOK_URL_HERE";
```

Replace it with the **Production URL** from the Webhook node in n8n. If you forget, the
website shows a clear configuration message instead of failing silently.

## 12. Security

| Secret | Where it lives |
|---|---|
| Google Gemini API key | n8n **Credentials** only. Never in this repo. |
| n8n account password | Nowhere in this repo. |
| Weather API key | Not needed — `wttr.in` is keyless. |

The only backend value in the frontend is the webhook URL, which is a public endpoint by
design. No API key is ever shipped to the browser.

For a production deployment you would additionally: restrict **Allowed Origins (CORS)** to
your exact Netlify domain instead of `*`, and add rate limiting in front of the webhook.

## 13. Test cases

See [docs/TEST-CASES.md](docs/TEST-CASES.md) — five situations with the expected reasoning
and expected output for each.

## 14. Error handling

The website handles all of these with a friendly message, never `undefined` or
`[object Object]`:

| Failure | What the user sees |
|---|---|
| Webhook URL not configured | "The n8n webhook URL has not been configured yet." |
| Workflow inactive / network down / CORS blocked | "We could not reach the AI service." |
| n8n returns 4xx or 5xx | "The AI service replied with status 500." |
| Response is not valid JSON | "The AI service sent a response the website could not read." |
| Valid JSON but no exit check inside | "The AI response did not contain an exit check." |
| Agent takes longer than 90 s | "The AI agent took too long to answer." |
| Empty destination or purpose | Inline form message, blocks progress |

Every error screen offers **Try Again** (re-sends the same payload) and **Start Over**.

## 15. Future improvements

- Persistent memory of repeatedly forgotten items (needs accounts + a database).
- Calendar integration so the agent can read the actual reason you are going out.
- Location-aware suggestions from the device GPS.
- Voice input for the situation description.
- Multilingual output.
- Shared family exit checks.
- Travel mode and smart packing mode for multi-day trips.
- Recurring situation patterns ("every Monday you go to the lab").

None of these are in the MVP, on purpose: each one adds a failure mode without changing the
core idea.
