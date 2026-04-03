// 📌 monsters_script.js
// 🧸 Monster page data fetching and filtering

const monsterSheetUrl = "https://opensheet.elk.sh/1E9c3F3JPCDnxqLE0qVtW0K7PBsgHSd7s5oU8p8qeAAY/All";
let data = [];
let currentMinLevel = 0;
let currentMaxLevel = 30;

// Cache DOM elements
const monsterRangeDisplay = document.getElementById("range-display");
const monsterRangeMin = document.getElementById("range-min");
const monsterRangeMax = document.getElementById("range-max");

// Show loading state
showLoading("Loading...");

fetch(monsterSheetUrl)
  .then(response => response.json())
  .then(d => {
    data = d;

    // 🧸 Inject Just Use Bears card at the top
    const justUseBears = {
      "Name": "Just Use Bears",
      "Type": "custom-html",
      "HTML Path": "/monsters_just_use_bears.html",
      "Alt HTML Path": "/monsters_just_use_bears_card.html",
      "Level": 0
    };
    data.unshift(justUseBears);

    loadFavorites();
    updateRangeDisplay();
    displayList();
    displayFavorites(true);
  })
  .catch(error => {
    console.error("Error loading monster data:", error);
    showError("Failed to load monsters. Please refresh.");
  });

function displayList() {
  cardListContainer.innerHTML = "";
  const sortedData = getSortedData();
  const justUseBears = sortedData.find(m => m["Name"] === "Just Use Bears");
  const filteredData = getFilteredData(sortedData).filter(m => m["Name"] !== "Just Use Bears");

  if (justUseBears) {
    addCardsToList([justUseBears], cardListContainer, "", false);
  }

  addCardsToList(filteredData, cardListContainer, "", false);
}

function getSortedData() {
  const arr = data.slice();

  if (window.sortMode === 'alpha') {
    return arr.sort((a, b) => (a["Name"] || "").localeCompare(b["Name"] || ""));
  }

  return arr.sort((a, b) => {
    const aLevel = parseFloat(a["Level"]);
    const bLevel = parseFloat(b["Level"]);
    const aValid = Number.isFinite(aLevel);
    const bValid = Number.isFinite(bLevel);

    if (!aValid && bValid) return 1;
    if (aValid && !bValid) return -1;
    if (!aValid && !bValid) return (a["Name"] || "").localeCompare(b["Name"] || "");

    return aLevel - bLevel || (a["Name"] || "").localeCompare(b["Name"] || "");
  });
}

function getFilteredData(sortedData) {
  return sortedData.filter(monster => {
    const nameMatches = monster["Name"].toLowerCase().includes(currentSearchQuery);
    const levelRaw = monster["Level"];
    if (levelRaw === "*") return nameMatches;

    const level = parseFloat(levelRaw) || 0;
    const levelMatches = level >= currentMinLevel && level <= currentMaxLevel;
    return nameMatches && levelMatches;
  });
}

function getCardInnerHTML(monster, monsterId, useAlt = false) {
  return window.getMonsterCardHTML(monster, monsterId, useAlt);
}

monsterRangeMin.addEventListener("input", function () {
  currentMinLevel = parseInt(this.value);
  if (currentMinLevel > currentMaxLevel) {
    currentMaxLevel = currentMinLevel;
    monsterRangeMax.value = currentMaxLevel;
  }
  updateRangeDisplay();
  displayList();
});

monsterRangeMax.addEventListener("input", function () {
  currentMaxLevel = parseInt(this.value);
  if (currentMaxLevel < currentMinLevel) {
    currentMinLevel = currentMaxLevel;
    monsterRangeMin.value = currentMinLevel;
  }
  updateRangeDisplay();
  displayList();
});

function updateRangeDisplay() {
  monsterRangeDisplay.textContent = `${currentMinLevel} - ${currentMaxLevel}`;
}
