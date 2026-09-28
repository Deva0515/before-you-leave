# Viva and presentation pack

---

## 1. Problem statement

People forget things not because they lack a checklist, but because their situation changed
and they did not notice what that change implies. You never forget your phone. You forget
the umbrella on the one rainy day and the charger on the one day you took a laptop.

## 2. The existing problem

Notes apps require you to already know what you will forget — if you knew, you would not
forget it. Reminder apps are time-based, not situation-based. Voice assistants execute
commands; they do not reason about what you failed to ask. Generic AI chatbots produce
generic lists and will happily suggest a passport for a college exam.

## 3. Proposed solution

The user describes a situation — destination, purpose, belongings, and what is unusual about
today. An AI Agent reasons over that specific situation and produces a structured Exit Check
divided into what is critical, what is easy to overlook, and what is merely useful, with a
short reason for every item.

## 4. Innovation

Three things make this more than a CRUD app:

1. **Situation-first, not list-first.** The user never creates checklist items. The system
   derives them.
2. **Provenance on every recommendation.** Each item is labelled `Known`, `Inferred` or
   `External`, so the user can see whether the AI was told something, deduced it, or looked
   it up. Most AI products hide this.
3. **Agentic, not conversational.** The agent decides on its own whether calling the weather
   tool is worth it, and asks a clarifying question instead of guessing when the input is
   too thin.

## 5. How it works

1. The website collects four answers.
2. It sends them as JSON to a public n8n webhook over HTTPS.
3. A Code node normalises the input.
4. The AI Agent reasons over the situation, optionally calling a live weather tool.
5. A Structured Output Parser forces the answer into a fixed JSON schema.
6. The Respond to Webhook node returns that JSON.
7. The website renders it. No recommendation exists in the browser code.

## 6. Technology stack

HTML, CSS and vanilla JavaScript on Netlify for the frontend. n8n Cloud for the backend
workflow. Google Gemini as the reasoning model. `wttr.in` for keyless weather. No database,
because the MVP needs none.

## 7. Why n8n

n8n gives three things that would otherwise take days: a public HTTPS endpoint with no
server to manage, a visual AI Agent node with tools and an output parser already wired, and
a safe place to store the API key so it never reaches the browser. It also makes the
architecture visible — I can open the workflow in the viva and show the request flowing
through it.

## 8. Why an AI Agent and not a plain LLM call

A plain LLM call answers once from the prompt alone. An agent can *decide to act*: it looks
at the situation, decides whether the weather tool is worth calling, calls it, reads the
result, and only then answers. It is also constrained by an output parser, so the answer is
always machine-readable. That decision-making step is what makes it agentic.

## 9. Website-to-n8n architecture

```
Browser  --POST JSON-->  n8n Webhook  -->  Validate Input  -->  AI Agent
                                                                  |  \
                                                     Gemini model  |   Weather Tool
                                                                  v
                                            Structured Output Parser
                                                                  |
Browser  <--JSON--------  Respond to Webhook  <-------------------+
```

## 10. Real-world use cases

Students before exams. Employees before client meetings. Patients before hospital reviews.
Travellers before trips. Parents packing for a child's school event. Elderly users who need
a calm, reasoned prompt rather than a generic list.

## 11. Future scope

Persistent memory of items you repeatedly forget, calendar integration so the agent knows
the real reason you are going out, GPS-based location awareness, voice input, multilingual
output, shared family exit checks, and a travel/packing mode for multi-day trips.

## 12. Limitations

- No memory between sessions, so it cannot learn your personal patterns yet.
- Reasoning quality depends on how much the user types. Thin input gets a clarifying
  question, not magic.
- Weather is city-level, not GPS-level.
- The free Gemini tier has rate limits, so a room full of people submitting at the same
  second could hit a quota error.
- If the n8n workflow is inactive, the site cannot work — the intelligence is deliberately
  not in the browser.

---

# 20 viva questions and answers

**1. What is n8n?**
A workflow automation tool. You connect nodes visually instead of writing backend code, and
it runs on a server so it can expose public endpoints.

**2. Why did you use n8n instead of writing a backend?**
Three reasons: it gave me a public HTTPS endpoint with no server to manage, it has an AI
Agent node with tools and output parsing already built in, and it stores my API key securely
so the key never reaches the browser.

**3. What is an AI Agent?**
An LLM that has been given tools and the authority to decide when to use them. It reasons,
optionally acts by calling a tool, reads the result, and then answers.

**4. Difference between an AI chatbot and an AI Agent?**
A chatbot only talks — one prompt, one reply. An agent can take actions between the prompt
and the reply. Mine decides on its own whether to call the weather API.

**5. What is a webhook?**
A URL that waits for incoming data. My website sends a POST request to it, and that request
starts the workflow.

**6. How does the website communicate with n8n?**
`fetch()` in JavaScript sends an HTTP POST with a JSON body and a `Content-Type:
application/json` header to the production webhook URL, and reads the JSON response.

**7. What data is sent?**
Destination, purpose, an array of items, special conditions, a weather flag, an optional
city, and a client timestamp. Nothing personal, no login, no tracking.

**8. What does the AI Agent actually do?**
It classifies each item as known, inferred or external; discards items with no logical link
to the situation; decides whether to call the weather tool; and returns fixed-schema JSON.

**9. What tools can your agent use?**
One: an HTTP Request Tool that fetches current weather from `wttr.in`. I kept it to one
deliberately — a tool that adds no value is just a new failure point.

**10. How is this different from Siri?**
Siri executes what you ask. This reasons about what you did *not* ask. You never ask it for
an umbrella; it works out that your situation implies one.

**11. How is this different from a normal checklist app?**
In a checklist app *you* write the items, which means you must already know what you would
forget. Here you describe a situation and the system derives the items.

**12. How does the system avoid irrelevant recommendations?**
The system prompt forbids generic lists, caps the number of items, and requires a concrete
reason tied to the input for every single item. An item that cannot be justified from the
input cannot be output.

**13. How do you stop the AI from hallucinating that it checked the weather?**
Every item must carry a `source`. `external` is only permitted when a tool actually returned
data in that run, and the prompt states explicitly that the agent has no memory. I can also
open the execution log in n8n and show whether the Weather Tool node really ran.

**14. Where is the AI actually running?**
Not in the browser. The model runs on Google's servers, called by the AI Agent node inside
my n8n Cloud workflow.

**15. Where are your API keys stored?**
In n8n Credentials, encrypted on the n8n server. The frontend contains only the webhook URL,
which is a public endpoint by design. If you open View Source on my site, there is no key to
find.

**16. Is any part of the result hardcoded in JavaScript?**
No. `script.js` contains no item names and no rules. It collects input, calls the webhook,
and renders whatever valid JSON comes back. If I deactivate the workflow, the site produces
nothing — which proves the intelligence is in the backend.

**17. How did you deploy the website?**
As static files on Netlify, which gave me an HTTPS URL immediately. No build step, because
the project has no dependencies.

**18. What is CORS and did you hit it?**
A browser refuses to read a response from another domain unless that domain permits it. Yes
— my first browser call was blocked while `curl` worked fine. I fixed it by setting Allowed
Origins on the n8n Webhook node to my Netlify domain.

**19. What happens if n8n goes down?**
The website detects the failed request and shows "We could not reach the AI service" with a
Try Again button. It never shows `undefined` or a blank screen. It does not fake a result,
because a fake result would defeat the point of the project.

**20. How would this scale?**
The frontend is static files on a CDN, so it scales for free. The bottlenecks are the n8n
execution limit and the Gemini rate limit. I would move to a paid n8n plan, add caching for
repeated identical situations, and add rate limiting in front of the webhook.

**21. Why no database?**
Nothing in the MVP needs to persist. Adding one would tempt the agent to talk about "what
you usually forget" — which would be a lie, because there is no history yet. I would rather
ship an honest system than a fake-personalised one.

**22. What was the hardest part?**
Stopping the AI from being generic. My first version suggested sunglasses and a passport for
a college exam. The fix was in the prompt: cap the item count, require a reason for every
item, and force a source label on each one.

---

# 2-minute demo script

**0:00 — The problem (15 s)**
"Everyone here has forgotten an umbrella on a rainy day. Not because you don't own a
checklist — because your situation changed and you didn't notice what it implied. That's
what this solves."

**0:15 — Open the site (10 s)**
Show the landing page. Click **Start My Exit Check**.

**0:25 — Enter the situation (25 s)**
- Destination: **College**
- Purpose: **Exam**
- Carrying: `Phone, ID, pens, hall ticket`
- Unusual today: `It is raining and I am carrying my laptop.`

Press **Analyse My Situation**.

**0:50 — The analysing screen (10 s)**
"This request is now travelling to my n8n workflow. Nothing is being computed in the
browser."

**1:00 — The result (30 s)**
Point at two things specifically:
- "I never typed *umbrella* — it's under **Easy to overlook**, tagged **Inferred**, and the
  reason says it's because of the rain."
- "Same for the laptop charger, inferred from the laptop."

Expand **Show raw AI agent response**: "This is the exact JSON the AI agent returned."

**1:30 — Show the backend (25 s)**
Switch to the n8n tab (have it open already). Show the canvas: Webhook → Validate Input →
AI Agent with Gemini, the output parser and the weather tool beneath it → Respond to Webhook.
Open **Executions** and show the run that just happened, with green ticks.

**1:55 — The two URLs (5 s)**
Show the Netlify URL in the address bar and the production webhook URL in the Webhook node.
"Website URL, and the public AI agent endpoint."

**Demo safety rules**
- Open both tabs before you start. Log into n8n in advance.
- Run the exact same test once, five minutes before the demo, so the workflow is warm.
- Free-tier rate limits exist. If you get a quota error, wait 30 seconds and retry — do not
  edit anything live.
- Have a screenshot of a successful result saved on your phone as a fallback.
