// 📌 Spell Data Source
const spellSheetUrl = "https://opensheet.elk.sh/1ZsdxP3KiZZ1YCGcxddqNMKhZH2LOV1uwAhVyYqBlR3E/Spells";
let spellData = [];
let currentSearchQuery = "";
let currentMinTier = 1;
let currentMaxTier = 5;
let filterWizard = true;
let filterPriest = true;

// 📌 Cache DOM elements
const spellSearchBar = document.getElementById("spell-search-bar");
const spellListContainer = document.getElementById("spell-list");
const spellRangeDisplay = document.getElementById("spell-range-display");
const spellRangeMin = document.getElementById("slider-min");
const spellRangeMax = document.getElementById("slider-max");
const filterWizardCheckbox = document.getElementById("filter-wizard");
const filterPriestCheckbox = document.getElementById("filter-priest");

// 📌 Fetch spell data from Google Sheet
fetch(spellSheetUrl)
  .then(response => response.json())
  .then(data => {
    spellData = data;
    updateRangeDisplay();
    displaySpellList();
  })
  .catch(error => console.error("❌ Error loading spell data:", error));

function displaySpellList() {
  spellListContainer.innerHTML = ""; // Clear existing list

  let filteredSpells = spellData.filter(spell => {
    const nameMatches = spell["Name"]?.toLowerCase().includes(currentSearchQuery);
    const tierMatches = spell["Tier"] >= currentMinTier && spell["Tier"] <= currentMaxTier;

    const spellClass = spell["Class"]?.trim().toLowerCase();
    const classMatches =
      (filterWizard && spellClass.includes("wizard")) ||
      (filterPriest && spellClass.includes("priest"));

    return nameMatches && tierMatches && classMatches;
  });

  filteredSpells.sort((a, b) => a["Tier"] - b["Tier"] || a["Name"].localeCompare(b["Name"]));

  filteredSpells.forEach(spell => {
    const cardData = {
      id: spell["ID"],
      name: spell["Name"],
      level: parseInt(spell["Tier"] || 0),
      description: spell["Description"] || "No description available."
    };

    const spellCard = createCardElement(cardData); // Use createCardElement from favorites.js
    spellListContainer.appendChild(spellCard);
  });
}

// 📌 Update Slider Range Display
function updateRangeDisplay() {
  spellRangeDisplay.textContent = `${currentMinTier} - ${currentMaxTier}`;
}

// 📌 Event Listeners for Filters and Search
spellSearchBar.addEventListener("input", debounce(function () {
  currentSearchQuery = this.value.toLowerCase();
  displaySpellList();
}, 300));

spellRangeMin.addEventListener("input", function () {
  currentMinTier = parseInt(this.value);
  if (currentMinTier > currentMaxTier) {
    currentMaxTier = currentMinTier;
    spellRangeMax.value = currentMaxTier;
  }
  updateRangeDisplay();
  displaySpellList();
});

spellRangeMax.addEventListener("input", function () {
  currentMaxTier = parseInt(this.value);
  if (currentMaxTier < currentMinTier) {
    currentMinTier = currentMaxTier;
    spellRangeMin.value = currentMinTier;
  }
  updateRangeDisplay();
  displaySpellList();
});

filterWizardCheckbox.addEventListener("change", function () {
  filterWizard = this.checked;
  displaySpellList();
});

filterPriestCheckbox.addEventListener("change", function () {
  filterPriest = this.checked;
  displaySpellList();
});

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
