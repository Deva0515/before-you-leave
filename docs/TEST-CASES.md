# Test cases

Run each one twice: first with `curl` straight against the webhook (proves the backend),
then through the website (proves the integration).

Replace `WEBHOOK` with your production webhook URL.

---

## Test 1 — College exam in the rain

**Input**

| Field | Value |
|---|---|
| Destination | College |
| Purpose | Exam |
| Items | Phone, ID card, pens, hall ticket |
| Conditions | It is raining |

```bash
curl -X POST "WEBHOOK" -H "Content-Type: application/json" -d "{\"destination\":\"College\",\"purpose\":\"Exam\",\"items\":[\"phone\",\"ID card\",\"pens\",\"hall ticket\"],\"special_conditions\":\"It is raining\"}"
```

**Expected reasoning** — rain is stated, so rain protection becomes relevant. The four
listed items are already known and only need confirming.

**Expected output** — `overlooked_items` contains an umbrella or raincoat with a reason
referring to rain, `source: "inferred"`. `critical_items` contains the hall ticket and ID.
**Must NOT contain**: passport, sunglasses, toothbrush, clothes.

---

## Test 2 — Office client presentation

**Input**

| Field | Value |
|---|---|
| Destination | Office |
| Purpose | Presentation |
| Items | Laptop, charger, phone |
| Conditions | Important client presentation |

**Expected reasoning** — the charger is already listed, so it must NOT appear as a
discovery. A presentation implies a display adapter/HDMI, the file backed up, and a phone
charger. The agent should reason about *presenting*, not about *carrying a laptop*.

**Expected output** — `overlooked_items` around presentation delivery (HDMI/adapter,
presenter clicker, a backup copy of the slides). Charger appears only in
`final_exit_check`, not as an overlooked item.

---

## Test 3 — Hospital appointment

**Input**

| Field | Value |
|---|---|
| Destination | Hospital |
| Purpose | Appointment |
| Items | Phone |
| Conditions | Need to carry previous reports |

**Expected reasoning** — reports are explicitly needed but are NOT in the items list, so
this is the single most important gap. Appointments also imply an ID and a payment method.

**Expected output** — previous reports in `critical_items` with `source: "known"` (the user
stated the need). No medication names, no dosages, no treatment advice — the system prompt
forbids it.

---

## Test 4 — Overnight train trip

**Input**

| Field | Value |
|---|---|
| Destination | Railway Station |
| Purpose | Travel |
| Items | Phone, wallet |
| Conditions | Overnight trip |

**Expected reasoning** — "overnight" justifies a ticket/ID, a power bank and a change of
clothes. It does NOT justify a passport (domestic) or sunscreen.

**Expected output** — travel essentials tied to *overnight* specifically. Watch for
over-generation here: this is the test case where a weak model starts producing a generic
packing list. If it lists more than about five overlooked items, lower the model
temperature or tighten rule 7 in the system prompt.

---

## Test 5 — Product return at a mall

**Input**

| Field | Value |
|---|---|
| Destination | Shopping Mall |
| Purpose | Return a product |
| Items | Product |
| Conditions | Need proof of purchase |

**Expected reasoning** — a return requires the bill/receipt, the original packaging and the
card used to pay. The user named the need but not the item.

**Expected output** — bill/receipt in `critical_items`, original box/packaging in
`overlooked_items`. Nothing about groceries or shopping bags unless the input justifies it.

---

## Test 6 — Deliberately thin input (anti-hallucination check)

Send almost nothing:

```bash
curl -X POST "WEBHOOK" -H "Content-Type: application/json" -d "{\"destination\":\"\",\"purpose\":\"\",\"items\":[],\"special_conditions\":\"\"}"
```

**Expected output** — `clarifying_question` is non-empty and the item arrays are short or
empty. The agent must **not** invent a situation. The website shows this as the blue
"The agent needs one more detail" banner.

---

## Test 7 — Weather tool actually firing

Turn the **Use current weather context** switch on and enter a real city.

**How to verify the tool truly ran** (this is the honesty test):

1. Open the n8n execution in **Executions**.
2. Click the **Weather Tool** node. It must show an input and an output.
3. Any weather claim in the response must be labelled `source: "external"`.

If the agent mentions weather but the Weather Tool node shows no execution, the agent
hallucinated and rule 3 of the system prompt needs strengthening.

---

## Error-path tests

| What to do | Expected |
|---|---|
| Deactivate the workflow in n8n, then submit | "We could not reach the AI service." |
| Set `N8N_WEBHOOK_URL` back to the placeholder | "The n8n webhook URL has not been configured yet." |
| Leave destination empty and press Continue | Inline red message, cannot advance |
| Turn the weather switch on but leave the city blank | "Weather context needs a city name..." |
| Open the site on a phone | Cards stack, no horizontal scrolling |
