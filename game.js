// 📌 Game.js (Rules)
// 📌 Game Data Source
const spellSheetUrl = "https://opensheet.elk.sh/1GSQ87L3gNGsL1PxMmPuOmKh4PUuOXwBLOpN9OLo7pNY/Rules";
let data = [];
let currentMinTier = 1;
let currentMaxTier = 5;
let filterWizard = true;
let filterPriest = true;

// 📌 Cache DOM elements
const spellRangeDisplay = document.getElementById("spell-range-display");
const spellRangeMin = document.getElementById("slider-min");
const spellRangeMax = document.getElementById("slider-max");
const filterWizardCheckbox = document.getElementById("filter-wizard");
const filterPriestCheckbox = document.getElementById("filter-priest");

// Show loading state
showLoading("Loading...");

// 📌 Fetch data from Google Sheet
fetch(spellSheetUrl)
  .then(response => response.json())
  .then(d => {
    console.log("✅ Fetched Data:", d);
    data = d;
    loadFavorites();
    if (spellRangeDisplay) updateRangeDisplay();
    displayList();
    displayFavorites(true);
  })
  .catch(error => {
    console.error("❌ Error loading data:", error);
    showError("Failed to load rules. Please refresh.");
  });

// getting sorted data 
function getSortedData() {
  const arr = data.slice();

  if (window.sortMode === 'alpha') {
    return arr.sort((a, b) => (a["Name"] || "").localeCompare(b["Name"] || ""));
  }

  // Default: keep original order (seems intentional for rules)
  return arr;
}

function getFilteredData(sortedData) {
  return sortedData.filter(rule => {
    const titleMatches = rule["Name"]?.toLowerCase().includes(currentSearchQuery);
    const ruleMatches = rule["Rule"]?.toLowerCase().includes(currentSearchQuery);
    return titleMatches || ruleMatches;
  });
}

function getCardInnerHTML(rule, ruleId) {
  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${ruleId}-favorite-icon">●</div>
        <div class="card-title">${rule["Name"] || "Unknown Rule"}</div>
      </div>
    </div>

    <div class="card-body" id="${ruleId}-body">
      <p class="spell-description">${rule["Rule"] || "No description available."}</p>
    </div>
  `;
}

// 📌 Update Slider Range Display (if sliders exist)
function updateRangeDisplay() {
  if (spellRangeDisplay) {
    spellRangeDisplay.textContent = `${currentMinTier} - ${currentMaxTier}`;
  }
}

// 📌 Event Listeners (only if elements exist)
if (spellRangeMin) {
  spellRangeMin.addEventListener("input", function () {
    currentMinTier = parseInt(this.value);
    if (currentMinTier > currentMaxTier) {
      currentMaxTier = currentMinTier;
      spellRangeMax.value = currentMaxTier;
    }
    updateRangeDisplay();
    displayList();
  });
}

if (spellRangeMax) {
  spellRangeMax.addEventListener("input", function () {
    currentMaxTier = parseInt(this.value);
    if (currentMaxTier < currentMinTier) {
      currentMinTier = currentMaxTier;
      spellRangeMin.value = currentMinTier;
    }
    updateRangeDisplay();
    displayList();
  });
}

if (filterWizardCheckbox) {
  filterWizardCheckbox.addEventListener("change", function () {
    filterWizard = this.checked;
    displayList();
  });
}

if (filterPriestCheckbox) {
  filterPriestCheckbox.addEventListener("change", function () {
    filterPriest = this.checked;
    displayList();
  });
}
