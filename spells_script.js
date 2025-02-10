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

// 📌 Fetch spell data from Google Sheet
fetch(spellSheetUrl)
  .then(response => response.json())
  .then(d => {
    console.log("✅ Fetched Spell Data:", d); // Debugging check
    data = d;
    updateRangeDisplay();
    displayList();
  })
  .catch(error => console.error("❌ Error loading spell data:", error));

function getSortedData() {
  return data.sort((a, b) => a["Tier"] - b["Tier"] || a["Name"].localeCompare(b["Name"]));
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
        <div class="favorite-icon" id="${spellId}-favorite-icon">◪</div>
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