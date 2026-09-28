/* ============================================================
   Before You Leave — frontend logic
   ------------------------------------------------------------
   IMPORTANT: this file contains NO recommendation rules.
   It only collects input, calls the n8n webhook, and renders
   whatever structured JSON the AI Agent returns.
   ============================================================ */

/* ---------- 1. CONFIG — the only line you must edit ---------- */
const N8N_WEBHOOK_URL = "https://deva-1509.app.n8n.cloud/webhook/before-you-leave";

const REQUEST_TIMEOUT_MS = 90000; // AI agents can take 10-40s. 90s is a safe ceiling.

/* ---------- 2. STATE ---------- */
const state = {
  destination: "",
  purpose: "",
  step: 1,
  lastPayload: null
};
const TOTAL_STEPS = 4;

/* ---------- 3. TINY HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showScreen(id) {
  $$(".screen").forEach((s) => { s.hidden = s.id !== id; });
  window.scrollTo({ top: 0, behavior: "smooth" });
  const heading = document.querySelector("#" + id + " h1, #" + id + " h2");
  if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
}

function setError(msg) {
  const box = $("#form-error");
  box.textContent = msg || "";
  box.hidden = !msg;
}

/* ---------- 4. WIZARD NAVIGATION ---------- */
function renderStep() {
  $$(".step").forEach((el) => {
    el.hidden = Number(el.dataset.step) !== state.step;
  });
  $$(".dot").forEach((d) => {
    const n = Number(d.dataset.dot);
    d.classList.toggle("is-active", n === state.step);
    d.classList.toggle("is-done", n < state.step);
  });
  $("#progress-label").textContent = "Step " + state.step + " of " + TOTAL_STEPS;
  $("#btn-back").textContent = state.step === 1 ? "Cancel" : "Back";
  $("#btn-next").textContent = state.step === TOTAL_STEPS ? "Analyse My Situation" : "Continue";
  setError("");

  const firstControl = document.querySelector('.step[data-step="' + state.step + '"] .chip, ' +
                                              '.step[data-step="' + state.step + '"] textarea');
  if (firstControl) firstControl.focus({ preventScroll: true });
}

function validateStep() {
  if (state.step === 1) {
    const val = state.destination || $("#destination-custom").value.trim();
    if (!val) { setError("Please choose a destination or type where you are going."); return false; }
    state.destination = val;
  }
  if (state.step === 2) {
    const val = state.purpose || $("#purpose-custom").value.trim();
    if (!val) { setError("Please choose a purpose or describe why you are going."); return false; }
    state.purpose = val;
  }
  if (state.step === 4 && $("#use-weather").checked && !$("#location").value.trim()) {
    setError("Weather context needs a city name, or switch the toggle off.");
    return false;
  }
  return true;
}

/* ---------- 5. CHIP GROUPS (single select, keyboard accessible) ---------- */
$$(".chips").forEach((group) => {
  group.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const alreadyOn = chip.getAttribute("aria-pressed") === "true";
    group.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    if (!alreadyOn) chip.setAttribute("aria-pressed", "true");

    const value = alreadyOn ? "" : chip.textContent.trim();
    if (group.dataset.group === "destination") {
      state.destination = value;
      if (value) $("#destination-custom").value = "";
    } else {
      state.purpose = value;
      if (value) $("#purpose-custom").value = "";
    }
    setError("");
  });
});

// Typing a custom value clears the selected chip, so there is exactly one answer.
$("#destination-custom").addEventListener("input", (e) => {
  if (e.target.value.trim()) {
    document.querySelectorAll('[data-group="destination"] .chip')
      .forEach((c) => c.setAttribute("aria-pressed", "false"));
    state.destination = "";
  }
});
$("#purpose-custom").addEventListener("input", (e) => {
  if (e.target.value.trim()) {
    document.querySelectorAll('[data-group="purpose"] .chip')
      .forEach((c) => c.setAttribute("aria-pressed", "false"));
    state.purpose = "";
  }
});

$("#use-weather").addEventListener("change", (e) => {
  $("#location-field").hidden = !e.target.checked;
  if (e.target.checked) $("#location").focus();
});

/* ---------- 6. BUTTON WIRING ---------- */
$$("[data-start]").forEach((b) => b.addEventListener("click", () => {
  state.step = 1; showScreen("screen-setup"); renderStep();
}));
$$("[data-goto]").forEach((b) => b.addEventListener("click", () => showScreen(b.dataset.goto)));
$$("[data-start-new]").forEach((b) => b.addEventListener("click", resetAll));

$("#btn-next").addEventListener("click", () => {
  if (!validateStep()) return;
  if (state.step < TOTAL_STEPS) { state.step++; renderStep(); }
  else submitSituation();
});

$("#btn-back").addEventListener("click", () => {
  if (state.step === 1) { showScreen("screen-home"); return; }
  state.step--; renderStep();
});

// Enter inside a text input moves forward instead of reloading the page.
$("#situation-form").addEventListener("submit", (e) => e.preventDefault());
$("#situation-form").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); $("#btn-next").click(); }
});

$("#btn-again").addEventListener("click", () => { if (state.lastPayload) sendToAgent(state.lastPayload); });
$("#btn-retry").addEventListener("click", () => { if (state.lastPayload) sendToAgent(state.lastPayload); else resetAll(); });
$("#btn-ready").addEventListener("click", () => { $("#done-banner").hidden = false; });

function resetAll() {
  state.destination = ""; state.purpose = ""; state.step = 1; state.lastPayload = null;
  $("#situation-form").reset();
  $$(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
  $("#location-field").hidden = true;
  $("#done-banner").hidden = true;
  showScreen("screen-home");
}

/* ---------- 7. BUILD PAYLOAD + CALL n8n ---------- */
function buildPayload() {
  const items = $("#items").value
    .split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

  return {
    destination: state.destination,
    purpose: state.purpose,
    items: items,
    special_conditions: $("#conditions").value.trim(),
    use_weather: $("#use-weather").checked,
    location: $("#use-weather").checked ? $("#location").value.trim() : "",
    client_time: new Date().toISOString()
  };
}

const LOADER_MESSAGES = [
  "Understanding your destination…",
  "Checking what you’ve mentioned…",
  "Looking for things you might overlook…",
  "Preparing your exit check…"
];
let loaderTimer = null;

function startLoader() {
  showScreen("screen-loading");
  let i = 0;
  $("#loader-msg").textContent = LOADER_MESSAGES[0];
  loaderTimer = setInterval(() => {
    i = (i + 1) % LOADER_MESSAGES.length;
    $("#loader-msg").textContent = LOADER_MESSAGES[i];
  }, 2600);
}
function stopLoader() { clearInterval(loaderTimer); loaderTimer = null; }

function submitSituation() {
  const payload = buildPayload();
  state.lastPayload = payload;
  sendToAgent(payload);
}

async function sendToAgent(payload) {
  if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.startsWith("PASTE_")) {
    return failWith("The n8n webhook URL has not been configured yet.",
                    "Open script.js and set N8N_WEBHOOK_URL to your production webhook URL.");
  }

  startLoader();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error("The AI service replied with status " + res.status + ".");
    }

    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { throw new Error("The AI service sent a response the website could not read."); }

    const data = normalizeResponse(parsed);
    if (!data) throw new Error("The AI response did not contain an exit check.");

    stopLoader();
    renderResult(data, parsed);
  } catch (err) {
    stopLoader();
    if (err.name === "AbortError") {
      failWith("The AI agent took too long to answer.",
               "The request timed out after " + (REQUEST_TIMEOUT_MS / 1000) + " seconds. Please try again.");
    } else if (err instanceof TypeError) {
      // fetch() throws TypeError for network failure and for blocked CORS responses
      failWith("We could not reach the AI service.",
               "Check your internet connection, and that the n8n workflow is active.");
    } else {
      failWith("Something went wrong while analysing your situation. Please try again.", err.message);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function failWith(message, detail) {
  $("#error-text").textContent = message;
  $("#error-detail").textContent = detail || "";
  showScreen("screen-error");
}

/* ---------- 8. RESPONSE NORMALISER ----------
   n8n can hand back the agent object directly, wrapped in an array,
   or nested under "output"/"data". Accept all of them.        */
function normalizeResponse(raw) {
  let obj = raw;
  if (Array.isArray(obj)) obj = obj[0];
  if (!obj || typeof obj !== "object") return null;
  if (obj.output && typeof obj.output === "object") obj = obj.output;
  if (obj.data && typeof obj.data === "object" && !obj.final_exit_check) obj = obj.data;

  const list = (v) => Array.isArray(v) ? v.filter((x) => x && (x.item || typeof x === "string")) : [];
  const result = {
    situation: (obj.situation && typeof obj.situation === "object") ? obj.situation : {},
    critical_items: list(obj.critical_items),
    overlooked_items: list(obj.overlooked_items),
    optional_items: list(obj.optional_items),
    final_exit_check: Array.isArray(obj.final_exit_check)
      ? obj.final_exit_check.map((x) => (typeof x === "string" ? x : x && x.item)).filter(Boolean)
      : [],
    clarifying_question: typeof obj.clarifying_question === "string" ? obj.clarifying_question : ""
  };

  const hasSomething = result.critical_items.length || result.overlooked_items.length ||
                       result.optional_items.length || result.final_exit_check.length ||
                       result.clarifying_question;
  return hasSomething ? result : null;
}

/* ---------- 9. RENDER ---------- */
const SOURCE_LABEL = { known: "Known", inferred: "Inferred", external: "External" };

function itemNode(entry) {
  const li = document.createElement("li");

  const name = document.createElement("div");
  name.className = "item-name";
  const label = document.createElement("span");
  label.textContent = typeof entry === "string" ? entry : (entry.item || "");
  name.appendChild(label);

  const src = (entry.source || "").toLowerCase();
  if (SOURCE_LABEL[src]) {
    const tag = document.createElement("span");
    tag.className = "tag tag-" + src;
    tag.textContent = SOURCE_LABEL[src];
    name.appendChild(tag);
  }
  li.appendChild(name);

  if (entry.reason) {
    const why = document.createElement("p");
    why.className = "item-reason";
    why.textContent = entry.reason;
    li.appendChild(why);
  }
  return li;
}

function fillList(listId, blockId, entries) {
  const ul = document.getElementById(listId);
  ul.textContent = "";
  entries.forEach((e) => ul.appendChild(itemNode(e)));
  document.getElementById(blockId).hidden = entries.length === 0;
}

function renderResult(data, rawForDebug) {
  // situation summary
  const dl = $("#situation-list");
  dl.textContent = "";
  const rows = [
    ["Destination", data.situation.destination || state.destination || "—"],
    ["Purpose",     data.situation.purpose     || state.purpose     || "—"],
    ["Conditions",  data.situation.conditions  || "None mentioned"]
  ];
  rows.forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    dl.appendChild(dt); dl.appendChild(dd);
  });

  // clarifying question
  $("#clarify-banner").hidden = !data.clarifying_question;
  $("#clarify-text").textContent = data.clarifying_question || "";

  fillList("list-critical",   "block-critical",   data.critical_items);
  fillList("list-overlooked", "block-overlooked", data.overlooked_items);
  fillList("list-optional",   "block-optional",   data.optional_items);

  // final tickable list
  const finalUl = $("#list-final");
  finalUl.textContent = "";
  data.final_exit_check.forEach((text, i) => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox"; box.id = "final-" + i;
    const span = document.createElement("span");
    span.textContent = text;
    label.appendChild(box); label.appendChild(span);
    li.appendChild(label); finalUl.appendChild(li);
  });
  $("#block-final").hidden = data.final_exit_check.length === 0;

  $("#raw-json").textContent = JSON.stringify(rawForDebug, null, 2);
  $("#done-banner").hidden = true;
  showScreen("screen-result");
}

/* ---------- 10. BOOT ---------- */
showScreen("screen-home");

// exported only so test.js can check the normaliser outside the browser
if (typeof module !== "undefined") module.exports = { normalizeResponse };
