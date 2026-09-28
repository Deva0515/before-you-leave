/* Smallest useful check: the response normaliser must survive every shape
   n8n realistically returns, and must reject junk.
   Run it with:   node test.js                                            */

const assert = require("assert");

// script.js is browser code; stub the DOM so we can require it in Node.
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, set: () => true });
global.document = stub;
global.window = stub;

const { normalizeResponse } = require("./script.js");

const good = {
  situation: { destination: "college", purpose: "exam", conditions: "rain" },
  critical_items: [{ item: "Hall ticket", reason: "Needed to enter", source: "known" }],
  overlooked_items: [{ item: "Umbrella", reason: "User said rain", source: "inferred" }],
  optional_items: [],
  final_exit_check: ["Hall ticket", "Umbrella"]
};

// 1. plain object
assert.strictEqual(normalizeResponse(good).critical_items[0].item, "Hall ticket");

// 2. wrapped in an array (n8n item list)
assert.strictEqual(normalizeResponse([good]).final_exit_check.length, 2);

// 3. nested under "output" (AI Agent node default key)
assert.strictEqual(normalizeResponse({ output: good }).situation.destination, "college");

// 4. final_exit_check given as objects instead of strings
assert.deepStrictEqual(
  normalizeResponse({ ...good, final_exit_check: [{ item: "Pens" }] }).final_exit_check,
  ["Pens"]
);

// 5. missing arrays must become empty arrays, never undefined
const thin = normalizeResponse({ clarifying_question: "Where exactly are you going?" });
assert.deepStrictEqual(thin.critical_items, []);
assert.strictEqual(thin.clarifying_question, "Where exactly are you going?");

// 6. junk must be rejected so the UI shows the friendly error instead of blanks
assert.strictEqual(normalizeResponse(null), null);
assert.strictEqual(normalizeResponse("oops"), null);
assert.strictEqual(normalizeResponse({ message: "Workflow was started" }), null);

console.log("All normaliser checks passed.");
