// 📌 spells_script.js
// 📌 Spell Data Source
const spellSheetUrl = "https://opensheet.elk.sh/1ZsdxP3KiZZ1YCGcxddqNMKhZH2LOV1uwAhVyYqBlR3E/Spells";
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

// 📌 Fetch spell data from Google Sheet
fetch(spellSheetUrl)
  .then(response => response.json())
  .then(d => {
    console.log("✅ Fetched Spell Data:", d);
    data = d;
    loadFavorites(); // ← Add this
    updateRangeDisplay();
    displayList();
    displayFavorites(true); // ← Add this
  })
  .catch(error => {
    console.error("❌ Error loading spell data:", error);
    showError("Failed to load spells. Please refresh."); // ← Add this
  });

// getting sorted data 
function getSortedData() {
  const arr = data.slice(); // don’t mutate original

  if (window.sortMode === 'alpha') {
    return arr.sort((a, b) => (a["Name"] || "").localeCompare(b["Name"] || ""));
  }

  // "level" mode for spells actually means Tier → Name
  return arr.sort((a, b) => {
    const aTier = parseFloat(a["Tier"]);
    const bTier = parseFloat(b["Tier"]);
    const aValid = Number.isFinite(aTier);
    const bValid = Number.isFinite(bTier);

    if (!aValid && bValid) return 1;
    if (aValid && !bValid) return -1;
    if (!aValid && !bValid) return (a["Name"] || "").localeCompare(b["Name"] || "");

    return aTier - bTier || (a["Name"] || "").localeCompare(b["Name"] || "");
  });
}


function getFilteredData(sortedData) {
  return sortedData.filter(spell => {
    const nameMatches = spell["Name"]?.toLowerCase().includes(currentSearchQuery);
    const tierMatches = spell["Tier"] >= currentMinTier && spell["Tier"] <= currentMaxTier;
    
    const spellClass = spell["Class"]?.trim().toLowerCase();  // Ensure class is trimmed and lowercase for comparison
    const classMatches =
      (filterWizard && spellClass.includes("wizard")) ||
      (filterPriest && spellClass.includes("priest"));

    return nameMatches && tierMatches && classMatches;
  });
}

function getCardInnerHTML(spell, spellId) {
  let classLabel = spell["Class"].includes("Wizard") && spell["Class"].includes("Priest")
    ? "W/P"
    : spell["Class"].includes("Wizard")
    ? "W"
    : "P";

  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${spellId}-favorite-icon">●</div>
        <div class="card-title">${spell["Name"] || "Unknown Spell"}</div>
      </div>
      <div class="spell-tier">${classLabel} ${spell["Tier"] || "?"}</div>
    </div>

    <div class="card-body" id="${spellId}-body">
      <div class="spell-stats">
        <p><strong>Class:</strong> ${spell["Class"] || "Unknown"}</p>
        <p><strong>Range:</strong> ${spell["Range"] || "N/A"}</p>
        <p><strong>Duration:</strong> ${spell["Duration"] || "N/A"}</p>
      </div>
      <div class="divider"></div>
      <p class="spell-description">${spell["Description"] || "No description available."}</p>
    </div>
  `;
}

// 📌 Update Slider Range Display
function updateRangeDisplay() {
  spellRangeDisplay.textContent = `${currentMinTier} - ${currentMaxTier}`;
}

// 📌 Event Listener
spellRangeMin.addEventListener("input", function () {
  currentMinTier = parseInt(this.value);
  if (currentMinTier > currentMaxTier) {
    currentMaxTier = currentMinTier;
    spellRangeMax.value = currentMaxTier;
  }
  updateRangeDisplay();
  displayList();
});

spellRangeMax.addEventListener("input", function () {
  currentMaxTier = parseInt(this.value);
  if (currentMaxTier < currentMinTier) {
    currentMinTier = currentMaxTier;
    spellRangeMin.value = currentMinTier;
  }
  updateRangeDisplay();
  displayList();
});

filterWizardCheckbox.addEventListener("change", function () {
  filterWizard = this.checked;
  displayList();
});

filterPriestCheckbox.addEventListener("change", function () {
  filterPriest = this.checked;
  displayList();
});
