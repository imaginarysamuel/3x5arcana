// ===============================
// 3x5 Arcana — Rules (game.js)
// ===============================

// 📌 Data source (Google Sheet via OpenSheet)
const spellSheetUrl = "https://opensheet.elk.sh/1GSQ87L3gNGsL1PxMmPuOmKh4PUuOXwBLOpN9OLo7pNY/Rules";

// 📦 State (some are legacy hooks for shared UI; harmless if unused on Rules page)
let data = [];
let currentMinTier = 1;
let currentMaxTier = 5;
let filterWizard = true;
let filterPriest = true;

// 🧩 DOM (may not exist on Rules page; we guard all usage)
const spellRangeDisplay = document.getElementById("spell-range-display");
const spellRangeMin = document.getElementById("slider-min");
const spellRangeMax = document.getElementById("slider-max");
const filterWizardCheckbox = document.getElementById("filter-wizard");
const filterPriestCheckbox = document.getElementById("filter-priest");

// ⏳ UX: show loading if provided by list_script.js
if (typeof showLoading === "function") showLoading("Loading...");

// 🔄 Fetch rules
fetch(spellSheetUrl)
  .then(r => r.json())
  .then(d => {
    console.log("✅ Fetched Rules:", d);
    data = d;

    if (typeof loadFavorites === "function") loadFavorites();
    if (spellRangeDisplay) updateRangeDisplay();

    if (typeof displayList === "function") displayList();
    if (typeof displayFavorites === "function") displayFavorites(true);

    if (typeof showDone === "function") showDone();
  })
  .catch(err => {
    console.error("❌ Error loading rules:", err);
    if (typeof showError === "function") showError("Failed to load rules. Please refresh.");
  });

// ===============================
// Helpers the list renderer calls
// ===============================

// 🧠 Gather numbered columns ("1", "2", "3", etc.) as rule text
function getRuleChunks(row) {
  const chunks = Object.keys(row)
    .filter(k => /^\d+$/.test(k) && row[k] != null)    // only pure numbers with values
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) // numeric order
    .map(k => String(row[k]).trim())
    .filter(Boolean);

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
  if (window.sortMode === "alpha") {
    return arr.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
  }
  return arr;
}

// Filter — hits Name and any numbered column
function getFilteredData(sortedData) {
  const q = (typeof currentSearchQuery === "string" ? currentSearchQuery : "").toLowerCase();
  if (!q) return sortedData;

  return sortedData.filter(rule => {
    const nameHit = (rule.Name || "").toLowerCase().includes(q);
    const rulesHit = getRuleChunks(rule).some(txt => txt.toLowerCase().includes(q));
    return nameHit || rulesHit;
  });
}

// 🧱 Build the card HTML
function getCardInnerHTML(rule, ruleId) {
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

// ===============================
// Optional UI hooks (sliders/filters)
// ===============================
function updateRangeDisplay() {
  if (spellRangeDisplay) {
    spellRangeDisplay.textContent = `${currentMinTier} - ${currentMaxTier}`;
  }
}

if (spellRangeMin && spellRangeMax) {
  spellRangeMin.addEventListener("input", function () {
    currentMinTier = parseInt(this.value, 10);
    if (currentMinTier > currentMaxTier) {
      currentMaxTier = currentMinTier;
      spellRangeMax.value = currentMaxTier;
    }
    updateRangeDisplay();
    if (typeof displayList === "function") displayList();
  });

  spellRangeMax.addEventListener("input", function () {
    currentMaxTier = parseInt(this.value, 10);
    if (currentMaxTier < currentMinTier) {
      currentMinTier = currentMaxTier;
      spellRangeMin.value = currentMinTier;
    }
    updateRangeDisplay();
    if (typeof displayList === "function") displayList();
  });
}

if (filterWizardCheckbox) {
  filterWizardCheckbox.addEventListener("change", function () {
    filterWizard = this.checked;
    if (typeof displayList === "function") displayList();
  });
}

if (filterPriestCheckbox) {
  filterPriestCheckbox.addEventListener("change", function () {
    filterPriest = this.checked;
    if (typeof displayList === "function") displayList();
  });
}

// Expose for list_script.js if it expects them on window (defensive)
window.getSortedData = getSortedData;
window.getFilteredData = getFilteredData;
window.getCardInnerHTML = getCardInnerHTML;
