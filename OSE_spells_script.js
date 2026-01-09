// 📌 OSE_spells_script.js

// Load OSE spell data
let data = [];
let currentMinLevel = 1;
let currentMaxLevel = 6;
let filterMagicUser = true;
let filterCleric = true;

// Cache DOM elements
const spellRangeDisplay = document.getElementById("spell-range-display");
const spellRangeMin = document.getElementById("slider-min");
const spellRangeMax = document.getElementById("slider-max");
const filterMagicUserCheckbox = document.getElementById("filter-magic-user");
const filterClericCheckbox = document.getElementById("filter-cleric");

// Show loading state
showLoading("Loading OSE spells...");

// Load the JSON file
fetch('OSE_spells.json')
  .then(response => response.json())
  .then(jsonData => {
    // Convert JSON object to array
    data = Object.entries(jsonData)
      .map(([name, spellData]) => ({
        Name: name,
        ...spellData
      }));
    
    console.log("✅ Loaded OSE Spell Data:", data);
    loadFavorites();
    updateRangeDisplay();
    displayList();
    displayFavorites(true);
  })
  .catch(error => {
    console.error("❌ Error loading OSE spell data:", error);
    showError("Failed to load spells. Please refresh.");
  });

// Get sorted data
function getSortedData() {
  const arr = data.slice(); // don't mutate original

  if (window.sortMode === 'alpha') {
    return arr.sort((a, b) => (a["Name"] || "").localeCompare(b["Name"] || ""));
  }

  // 'level' mode for OSE = Level → Name
  return arr.sort((a, b) => {
    const aLevel = parseInt(a["level"]) || 0;
    const bLevel = parseInt(b["level"]) || 0;
    return aLevel - bLevel || (a["Name"] || "").localeCompare(b["Name"] || "");
  });
}

// Get filtered data
function getFilteredData(sortedData) {
  return sortedData.filter(spell => {
    const nameMatches = spell.Name.toLowerCase().includes(currentSearchQuery);
    const level = parseInt(spell["level"]) || 0;
    const levelMatches = level >= currentMinLevel && level <= currentMaxLevel;
    
    const spellClass = spell["class"]?.trim().toLowerCase();
    const classMatches =
      (filterMagicUser && spellClass === "magic-user") ||
      (filterCleric && spellClass === "cleric");

    return nameMatches && levelMatches && classMatches;
  });
}

// Generate card HTML
function getCardInnerHTML(spell, spellId) {
  let classLabel = spell["class"] === "Magic-User" ? "M" : "C";
  let levelDisplay = spell["level"] || "?";

  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${spellId}-favorite-icon">◆</div>
        <div class="card-title">${spell["Name"] || "Unknown Spell"}</div>
      </div>
      <div class="spell-tier">${classLabel} ${levelDisplay}</div>
    </div>

    <div class="card-body" id="${spellId}-body">
      <div class="spell-stats">
        <p><strong>Class:</strong> ${spell["class"] || "Unknown"}</p>
        <p><strong>Range:</strong> ${spell["range"] || "N/A"}</p>
        <p><strong>Duration:</strong> ${spell["duration"] || "N/A"}</p>
      </div>
      <div class="divider"></div>
      <p class="spell-description">${spell["description"] || "No description available."}</p>
      ${spell["special_rules"] && spell["special_rules"].length > 0 ? `
        <div class="divider"></div>
        <div class="abilities">
          ${spell["special_rules"].map(rule => `<p>${formatAbility(rule)}</p>`).join("")}
        </div>
      ` : ''}
    </div>
  `;
}

// Format ability text with bold title (text before first colon or period)
function formatAbility(ability) {
  const match = ability.match(/^(.*?[.:])/);
  if (match) {
    const bolded = `<strong>${match[1]}</strong>`;
    const rest = ability.substring(match[1].length);
    return bolded + ' ' + rest;
  }
  return ability;
}

// Update range display
function updateRangeDisplay() {
  spellRangeDisplay.textContent = `${currentMinLevel} - ${currentMaxLevel}`;
}

// Event listeners for sliders
spellRangeMin.addEventListener("input", function () {
  currentMinLevel = parseInt(this.value);
  if (currentMinLevel > currentMaxLevel) {
    currentMaxLevel = currentMinLevel;
    spellRangeMax.value = currentMaxLevel;
  }
  updateRangeDisplay();
  displayList();
});

spellRangeMax.addEventListener("input", function () {
  currentMaxLevel = parseInt(this.value);
  if (currentMaxLevel < currentMinLevel) {
    currentMinLevel = currentMaxLevel;
    spellRangeMin.value = currentMinLevel;
  }
  updateRangeDisplay();
  displayList();
});

// Event listeners for checkboxes
filterMagicUserCheckbox.addEventListener("change", function () {
  filterMagicUser = this.checked;
  displayList();
});

filterClericCheckbox.addEventListener("change", function () {
  filterCleric = this.checked;
  displayList();
});
