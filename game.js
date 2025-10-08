// game.js

const spellSheetUrl = "https://opensheet.elk.sh/1GSQ87L3gNGsL1PxMmPuOmKh4PUuOXwBLOpN9OLo7pNY/Rules";

let data = [];

if (typeof showLoading === "function") showLoading("Loading...");

fetch(spellSheetUrl)
  .then(r => r.json())
  .then(d => {
    console.log("✅ Fetched Rules:", d);
    data = d;

    if (typeof loadFavorites === "function") loadFavorites();
    if (typeof displayList === "function") displayList();
    if (typeof displayFavorites === "function") displayFavorites(true);
    if (typeof showDone === "function") showDone();
  })
  .catch(err => {
    console.error("❌ Error loading rules:", err);
    if (typeof showError === "function") showError("Failed to load rules. Please refresh.");
  });

// ===============================
// Helpers for list rendering
// ===============================

// 🧠 Gather numbered columns ("1", "2", "3", etc.) as rule text
function getRuleChunks(row) {
  const chunks = Object.keys(row)
    .filter(k => /^\d+$/.test(k) && row[k] != null)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map(k => String(row[k]).trim())
    .filter(s => s.length > 0);

  // Fallback: single "Rule" column, if present
  if (chunks.length === 0 && row.Rule) {
    const t = String(row.Rule).trim();
    if (t) chunks.push(t);
  }
  return chunks;
}

// Sort data — default keeps sheet order; 'alpha' sorts by Name
function getSortedData() {
  const arr = data.slice();
  if (typeof window !== "undefined" && window.sortMode === "alpha") {
    return arr.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
  }
  return arr;
}

// Filter — searches Name and any numbered column
function getFilteredData(sortedData) {
  const q = (typeof currentSearchQuery === "string" ? currentSearchQuery : "").toLowerCase();
  if (!q) return sortedData;

  return sortedData.filter(rule => {
    const nameHit = (rule.Name || "").toLowerCase().includes(q);
    const rulesHit = getRuleChunks(rule).some(txt => txt.toLowerCase().includes(q));
    return nameHit || rulesHit;
  });
}

// 🧱 Build the card HTML (useAlt param retained for API parity)
function getCardInnerHTML(rule, ruleId, useAlt = false) {
  const paragraphs = getRuleChunks(rule)
    .map(text => `<p>${text}</p>`)
    .join("");

  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${ruleId}-favorite-icon">●</div>
        <div class="card-title">${rule.Name || "Unknown Rule"}</div>
      </div>
    </div>
    <div class="card-body" id="${ruleId}-body">
      ${paragraphs || "<p>No description available.</p>"}
    </div>
  `;
}

// Expose for list_script.js
window.getSortedData = getSortedData;
window.getFilteredData = getFilteredData;
window.getCardInnerHTML = getCardInnerHTML;

// Optional dev nicety
window.__rulesData = () => data; // call in console to inspect
