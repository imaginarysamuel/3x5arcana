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
const favoritesListContainer = document.getElementById("spell-favorites-list");
const spellListContainer = document.getElementById("spell-list");
const spellRangeDisplay = document.getElementById("spell-range-display");
const spellRangeMin = document.getElementById("slider-min");
const spellRangeMax = document.getElementById("slider-max");
const filterWizardCheckbox = document.getElementById("filter-wizard");
const filterPriestCheckbox = document.getElementById("filter-priest");

let favoritesIdList = [];

// 📌 Debounce function (Limits frequent function calls for better performance)
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

   // 📌 Sort by Tier first, then alphabetically
  let sortedSpells = spellData.sort((a, b) => a["Tier"] - b["Tier"] || a["Name"].localeCompare(b["Name"]));

  let filteredSpells = sortedSpells.filter(spell => {
    const nameMatches = spell["Name"]?.toLowerCase().includes(currentSearchQuery);
    const tierMatches = spell["Tier"] >= currentMinTier && spell["Tier"] <= currentMaxTier;
    
    const spellClass = spell["Class"]?.trim().toLowerCase();  // Ensure class is trimmed and lowercase for comparison
    const classMatches =
      (filterWizard && spellClass.includes("wizard")) ||
      (filterPriest && spellClass.includes("priest"));

    return nameMatches && tierMatches && classMatches;
  });

  if (filteredSpells.length === 0) {
    spellListContainer.innerHTML = `<p>No spells match your criteria.</p>`;
    return;
  }

  addSpellCardsTolist(filteredSpells, spellListContainer, "");


  favoritesListContainer.innerHTML = ""
  filteredSpells = sortedSpells.filter(spell => {
    return favoritesIdList.includes(spell["Name"]);
  });
  addSpellCardsTolist(filteredSpells, favoritesListContainer, "-fav");
}

function addSpellCardsTolist(list, container, suffix) {

  // Generate spell cards
  list.forEach((spell, index) => {
    const spellId = `spell-${spell["Name"]+suffix}`;
    const spellCard = document.createElement("div");
    spellCard.classList.add("card", "collapsed");
    spellCard.setAttribute("data-id", spellId);

    spellCard.addEventListener("click", () => toggleSpellCard(spellId));

    let classLabel = spell["Class"].includes("Wizard") && spell["Class"].includes("Priest")
      ? "W/P"
      : spell["Class"].includes("Wizard")
      ? "W"
      : "P";

    spellCard.innerHTML = `
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

    const favoriteIcon = spellCard.querySelector(".favorite-icon");

    if (favoritesIdList.includes(spell["Name"])) {
      favoriteIcon.classList.add("favorited");
    }
    
    favoriteIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavoriteCard(spell["Name"]);
    });

    container.appendChild(spellCard);
  });
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

// Toggle Favorite Card
function toggleFavoriteCard(id) {
  const index = favoritesIdList.indexOf(id);
  if (index > -1) {
    favoritesIdList.splice(index, 1);
  }
  else {
    favoritesIdList.push(id);
  }

  displaySpellList();
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

// Cache DOM elements
const burgerIcon = document.getElementById("burger-icon");
const menuOverlay = document.getElementById("menu-overlay");
const menuCloseIcon = document.getElementById("menu-close-icon");
const menuCard = document.querySelector(".menu-card");

// Function to open the menu
function openMenu() {
  menuOverlay.classList.add("open");
  menuCard.classList.remove("closing");
}

// Function to close the menu with animation
function closeMenu() {
  menuCard.classList.add("closing");
  menuCard.addEventListener(
    "animationend",
    () => {
      menuOverlay.classList.remove("open");
    },
    { once: true } // Ensures the event listener is removed after one execution
  );
}

// Open menu on burger icon click
burgerIcon.addEventListener("click", openMenu);

// Close menu on close icon click
menuCloseIcon.addEventListener("click", closeMenu);

// Close menu when clicking outside the menu content
menuOverlay.addEventListener("click", (e) => {
  if (!menuCard.contains(e.target)) {
    closeMenu();
  }
});

// Open menu on burger icon click
burgerIcon.addEventListener("click", openMenu);

// Close menu on close icon click
menuCloseIcon.addEventListener("click", closeMenu);

// Close menu when clicking outside the menu content
menuOverlay.addEventListener("click", (e) => {
  if (!menuCard.contains(e.target)) {
    closeMenu();
  }
});
