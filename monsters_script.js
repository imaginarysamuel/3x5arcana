// Fetch monster data
const monsterSheetUrl = "https://opensheet.elk.sh/1E9c3F3JPCDnxqLE0qVtW0K7PBsgHSd7s5oU8p8qeAAY/All";
let monsterData = [];
let currentSearchQuery = "";
let currentMinLevel = 0;
let currentMaxLevel = 30;

// Cache DOM elements
const monsterSearchBar = document.getElementById("search-bar");
const monsterListContainer = document.getElementById("monster-list");
const monsterRangeDisplay = document.getElementById("range-display");
const monsterRangeMin = document.getElementById("range-min");
const monsterRangeMax = document.getElementById("range-max");

// Fetch monster data from spreadsheet
fetch(monsterSheetUrl)
  .then(response => response.json())
  .then(data => {
    monsterData = data;
    updateRangeDisplay();
    displayMonsterList();
  })
  .catch(error => console.error("Error loading monster data:", error));

function displayMonsterList() {
  monsterListContainer.innerHTML = ""; // Clear existing list

  let filteredMonsters = monsterData.filter(monster => {
    const nameMatches = monster["Name"].toLowerCase().includes(currentSearchQuery);
    const level = parseFloat(monster["Level"]) || 0;
    const levelMatches = level >= currentMinLevel && level <= currentMaxLevel;
    return nameMatches && levelMatches;
  });

  filteredMonsters.sort((a, b) => {
    const aLevel = parseFloat(a["Level"]) || 0;
    const bLevel = parseFloat(b["Level"]) || 0;
    return aLevel - bLevel || a["Name"].localeCompare(b["Name"]);
  });

  filteredMonsters.forEach(monster => {
    const cardData = {
      id: monster["ID"],                // Unique identifier
      name: monster["Name"],            // Monster name
      level: parseInt(monster["Level"] || 0),  // Monster level
      description: monster["Flavor Text"] || "No description available." // Description
    };

    const monsterCard = createCardElement(cardData); // Use createCardElement from favorites.js
    monsterListContainer.appendChild(monsterCard);
  });
}

// Utility function to bold the first phrase up to a colon or period
function formatAbility(ability) {
  const match = ability.match(/^(.*?[.:])/);
  if (match) {
    const bolded = `<strong>${match[1]}</strong>`;
    return ability.replace(match[1], bolded);
  }
  return ability;
}

// Slider and search functionality
monsterRangeMin.addEventListener("input", function () {
  currentMinLevel = parseInt(this.value);
  if (currentMinLevel > currentMaxLevel) {
    currentMaxLevel = currentMinLevel;
    monsterRangeMax.value = currentMaxLevel;
  }
  updateRangeDisplay();
  displayMonsterList();
});

monsterRangeMax.addEventListener("input", function () {
  currentMaxLevel = parseInt(this.value);
  if (currentMaxLevel < currentMinLevel) {
    currentMinLevel = currentMaxLevel;
    monsterRangeMin.value = currentMinLevel;
  }
  updateRangeDisplay();
  displayMonsterList();
});

function updateRangeDisplay() {
  monsterRangeDisplay.textContent = `${currentMinLevel} - ${currentMaxLevel}`;
}

monsterSearchBar.addEventListener("input", debounce(function () {
  currentSearchQuery = this.value.toLowerCase();
  displayMonsterList();
}, 300));

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
