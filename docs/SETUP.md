# Setup — from zero to two public URLs

Follow in order. Do not skip ahead; each step is tested before the next one.

---

## PHASE 3 — Get a free Gemini API key

1. Open **https://aistudio.google.com/apikey** and sign in with your Google account.
2. Click **Create API key**.
3. Copy the key. It looks like `AIza...`. Keep it in a scratch note for the next 10 minutes.

**This key is a secret.** It goes into n8n Credentials only. Never into `script.js`, never
into GitHub, never into your report screenshots.

---

## PHASE 4 — Create the n8n Cloud account and import the workflow

1. Open **https://n8n.io/** → **Get started free** → sign up. Choose the **Cloud** trial
   (not "self-host"). You will land on a URL like
   `https://yourname.app.n8n.cloud/home/workflows`.
2. Click **Create Workflow** (top right).
3. Click the **three dots (⋯)** at the top right of the canvas → **Import from File**.
4. Select `before-you-leave/n8n/before-you-leave-workflow.json`.
5. You should now see 7 nodes connected. The AI-related nodes hang *below* the agent —
   that is correct, they are sub-nodes, not steps in the chain.

**If the import shows a node as "unknown" or with a version warning:** your n8n is a
slightly different version. Delete that one node, add it again from the **+** panel by the
same name, and reconnect it. The names to search for are in the table at the end of this file.

---

## PHASE 5 — Connect the Gemini credential

1. Double-click **Google Gemini Chat Model**.
2. In **Credential to connect with**, click **Create new credential**.
3. Paste your `AIza...` key into **API Key**. Leave **Host** at its default
   (`https://generativelanguage.googleapis.com`).
4. **Save**. A green tick means the key works.
5. Back in the node, open the **Model** dropdown and **pick a name from the list that
   loads**. Do not type a model name by hand — an invalid name fails instantly with a 404,
   which looks confusingly similar to other errors. The list is the authoritative set of
   models your key can reach. Any `flash` entry is a good choice.

**If you get `This model ... is no longer available to new users`:** Google retires older
model names for new accounts. The error message itself names the replacement — open the
Model dropdown and pick that one. Nothing else needs changing; a working credential is what
produced that error in the first place.

**If the credential shows a red error:** the key was copied with a trailing space, or the
Generative Language API is not enabled on that Google account. Create a fresh key in AI
Studio and try again.

---

## PHASE 6 — Test the workflow inside n8n (before any website)

1. Double-click **Website Webhook**. Copy the **Test URL** (it contains `/webhook-test/`).
   Close the node.
2. Click **Execute workflow** (bottom centre). n8n now waits for one request.
3. Send a test request. On Windows the easy way is the bundled script — it avoids all
   quoting problems:

```powershell
.\docs\test-webhook.ps1 -Url "TEST_URL"
```

   Or by hand. Note `curl.exe`, not `curl` — in Windows PowerShell, plain `curl` is an alias
   for a different command and will fail:

```bash
curl.exe -X POST "TEST_URL" -H "Content-Type: application/json" -d "{\"destination\":\"College\",\"purpose\":\"Exam\",\"items\":[\"phone\",\"ID card\",\"pens\",\"hall ticket\"],\"special_conditions\":\"It is raining\"}"
```

**What success looks like:** the terminal prints a JSON object containing
`situation`, `critical_items`, `overlooked_items`, `final_exit_check` — and one of the
overlooked items is an umbrella with a reason mentioning rain. Every node on the canvas
shows a green tick.

**If it fails:**

| Symptom | Fix |
|---|---|
| `404 webhook not registered` | You did not press **Execute workflow** first, or you used the production URL while testing. |
| Agent node red: *output parser failed* | Model returned prose. Lower temperature to `0.2` in the Gemini node, execute again. |
| Agent node red: *quota / 429* | Free-tier rate limit. Wait a minute. |
| Agent node red: *503 / Service unavailable / high demand* | Google's servers, not your setup. This node is a sub-node (attached to the Agent), so its Settings tab has no Retry On Fail option. Just press **Execute workflow** again a few times, 20-30s apart. If it keeps failing, open the **Model** dropdown and pick a different `flash` entry — load is per-model. |
| Response is `{}` or empty | Open **Respond to Website** and confirm the body is exactly `{{ JSON.stringify($json.output) }}` with the field in **Expression** mode, not Fixed. |
| Response has a `message` key like `Workflow was started` | The Webhook node's **Respond** setting is wrong. Set it to *Using 'Respond to Webhook' Node*. |

---

## PHASE 7 — Activate the workflow and take the production URL

1. Toggle **Inactive → Active** at the top right. Confirm.
2. Double-click **Website Webhook** again. Now copy the **Production URL**. It looks like:

```
https://yourname.app.n8n.cloud/webhook/before-you-leave
```

**This is SUBMISSION URL 2.** Note the difference:

| URL | Contains | Use it for |
|---|---|---|
| Editor URL | `/workflow/abc123` | Showing the workflow in your viva. **Not** a submission URL. |
| Test URL | `/webhook-test/` | Only works while you press Execute. **Not** a submission URL. |
| **Production URL** | `/webhook/` | **Submit this.** Works 24/7 while the workflow is Active. |

3. Verify the production URL with the same `curl` command, but **without** pressing Execute
   in n8n. It must answer. If it returns `404 not registered for POST`, the workflow is not
   Active.

---

## PHASE 8 — Point the website at n8n

1. Open `script.js` in Notepad or VS Code.
2. Line 10, replace the placeholder with your production URL:

```js
const N8N_WEBHOOK_URL = "https://yourname.app.n8n.cloud/webhook/before-you-leave";
```

3. Save.
4. Test locally. In the project folder run:

```bash
python -m http.server 5500
```

Open `http://localhost:5500`, run through the four steps, submit.

**What success looks like:** the analysing screen appears for 5–30 seconds, then the Exit
Check renders with coloured `Known` / `Inferred` tags. Expand **Show raw AI agent response**
— that JSON is proof the data came from n8n.

**If you see "We could not reach the AI service":** open the browser console with **F12** →
**Console** tab.

| Console message | Meaning | Fix |
|---|---|---|
| `blocked by CORS policy` | n8n is not allowing the browser | In the Webhook node → **Options** → **Allowed Origins (CORS)** = `*`. Save, then **deactivate and reactivate** the workflow. |
| `Failed to fetch` with no CORS text | Wrong URL or workflow inactive | Recheck the URL, recheck the Active toggle. |
| `404` | Path typo | The path is `before-you-leave`, with hyphens. |

CORS in one sentence: a browser refuses to read a reply from another domain unless that
domain says it is allowed. `curl` does not care, which is why curl can work while the
website fails.

---

## PHASE 9 — Deploy the website

Netlify Drop. No account gymnastics, no git, no build step.

1. Open **https://app.netlify.com/drop**.
2. Drag the **`before-you-leave` folder itself** onto the drop zone. (Do not zip it. Do not
   drag `index.html` alone.)
3. Wait ~20 seconds. You get a URL like `https://random-words-12345.netlify.app`.
4. Sign up with GitHub or email when prompted, so the site does not expire.
5. Optional but worth 30 seconds: **Site configuration → Change site name** → set
   `before-you-leave-yourname`. The URL becomes
   `https://before-you-leave-yourname.netlify.app`.

**This is SUBMISSION URL 1.**

6. Open it on your phone over mobile data. Run a full exit check. Confirm no horizontal
   scrolling and that buttons are easy to tap.

**To redeploy after any edit:** go to your site → **Deploys** tab → drag the folder onto
the drop area again.

---

## PHASE 10 — Tighten security (2 minutes, do it before submitting)

Once the Netlify URL exists, replace the wildcard CORS with your real domain:

1. n8n → Webhook node → **Options** → **Allowed Origins (CORS)**:
   `https://before-you-leave-yourname.netlify.app`
2. Save, deactivate, reactivate.
3. Reload your site and run one check to confirm it still works.

Leave it as `*` if you are short on time — it works either way, but the tightened version is
the correct answer if an examiner asks about security.

---

## Optional PHASE 11 — A public chat URL, if your evaluator insists on a "chatbot"

The website integration uses a Webhook, which is the right design. If the evaluator
specifically wants a chat interface they can open in a browser, add a **second, separate
workflow** — do not touch the working one.

1. **Create Workflow** → name it `Before You Leave - Public Chat`.
2. Add node **Chat Trigger** (search "Chat Trigger"). In its parameters set **Make Chat
   Publicly Available** to on. Mode: **Hosted Chat**.
3. Add node **AI Agent**. Connect Chat Trigger → AI Agent.
4. Open the AI Agent, and into **System Message** paste the same system prompt from
   `n8n/before-you-leave-workflow.json` — but delete the final `OUTPUT` paragraph and
   replace it with: *"Reply in clear readable sections: Your situation, Must check, Easy to
   overlook, Optional. One short reason per item."* (Chat needs prose, not JSON.)
5. Attach a **Google Gemini Chat Model** using the same credential. Do **not** attach an
   output parser here.
6. Activate the workflow. Open the Chat Trigger node and copy the **Chat URL**:
   `https://yourname.app.n8n.cloud/webhook/<id>/chat`

Submit that as URL 2 **in addition to** the webhook URL, and say plainly which is which:
the webhook is what the website calls; the chat URL is a human-openable view of the same
agent.

---

## Node name reference (if you must re-add a node by hand)

| Node in the file | Search this in the **+** panel |
|---|---|
| Website Webhook | `Webhook` |
| Validate Input | `Code` |
| Exit Check AI Agent | `AI Agent` |
| Google Gemini Chat Model | `Google Gemini Chat Model` |
| Structured Output Parser | `Structured Output Parser` |
| Weather Tool | `HTTP Request` (under Tools — it becomes "HTTP Request Tool") |
| Respond to Website | `Respond to Webhook` |
