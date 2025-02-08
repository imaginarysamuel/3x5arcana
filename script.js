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
const spellRangeDisplay = document.getElementById("slider-display");
const spellRangeMin = document.getElementById("slider-min");
const spellRangeMax = document.getElementById("slider-max");
const filterWizardCheckbox = document.getElementById("filter-wizard");
const filterPriestCheckbox = document.getElementById("filter-priest");

// 📌 Debounce function for better performance
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// 📌 Fetch spell data from Google Sheet
fetch(spellSheetUrl)
  .then(response => response.json())
  .then(data => {
    console.log("✅ Fetched Spell Data:", data); // Debugging check
    spellData = data;
    updateRangeDisplay();
    displaySpellList();
  })
  .catch(error => console.error("❌ Error loading spell data:", error));

// 📌 Display Spells (Filters & Sorts)
function displaySpellList() {
  spellListContainer.innerHTML = ""; // Clear spell list before updating

  let filteredSpells = spellData.filter(spell => {
    const nameMatches = spell["Name"]?.toLowerCase().includes(currentSearchQuery);
    const tierMatches = parseInt(spell["Tier"]) >= currentMinTier && parseInt(spell["Tier"]) <= currentMaxTier;
    const classMatches =
      (filterWizard && spell["Class"]?.includes("Wizard")) ||
      (filterPriest && spell["Class"]?.includes("Priest"));

    return nameMatches && tierMatches && classMatches;
  });

  // 📌 Sort by Tier first, then alphabetically
  filteredSpells.sort((a, b) => {
    return parseInt(a["Tier"]) - parseInt(b["Tier"]) || a["Name"].localeCompare(b["Name"]);
  });

  filteredSpells.forEach((spell, index) => {
    const spellId = `spell-${index}`;
    const spellCard = document.createElement("div");
    spellCard.classList.add("card", "collapsed");
    spellCard.setAttribute("data-id", spellId);

    spellCard.innerHTML = `
      <div class="card-header">
        <div class="card-title">${spell["Name"]}</div>
        <div class="spell-tier">${generateClassLabel(spell)} ${spell["Tier"]}</div>
      </div>
      <div class="card-body" id="${spellId}-body">
        <div class="spell-stats">
          <p><strong>Class:</strong> ${spell["Class"]}</p>
          <p><strong>Range:</strong> ${spell["Range"]}</p>
          <p><strong>Duration:</strong> ${spell["Duration"]}</p>
        </div>
        <div class="divider"></div>
        <p class="spell-description">${spell["Description"]}</p>
      </div>
    `;

    spellCard.addEventListener("click", () => toggleSpellCard(spellId));
    spellListContainer.appendChild(spellCard);
  });
}

// 📌 Generate Class Label (e.g., "W 3", "W/P 2")
function generateClassLabel(spell) {
  if (spell["Class"].includes("Wizard") && spell["Class"].includes("Priest")) return "W/P";
  if (spell["Class"].includes("Wizard")) return "W";
  if (spell["Class"].includes("Priest")) return "P";
  return "";
}

// 📌 Toggle Spell Card Expansion
function toggleSpellCard(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  const body = document.getElementById(`${id}-body`);

  if (!card || !body) return;

  const isExpanded = card.classList.contains("expanded");

  if (isExpanded) {
    body.style.maxHeight = null;
    card.classList.remove("expanded");
  } else {
    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
  }
}

// 📌 Update Slider Range Display
function updateRangeDisplay() {
  spellRangeDisplay.textContent = `${currentMinTier} - ${currentMaxTier}`;
}

// 📌 Event Listeners
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
