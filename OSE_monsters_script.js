// 📌 OSE_monsters_script.js

// Load OSE monster data
let data = [];
let currentMinLevel = 0;
let currentMaxLevel = 30;
let currentSortMode = "level"; // "level" or "alpha"

// Cache DOM elements
const monsterRangeDisplay = document.getElementById("range-display");
const monsterRangeMin = document.getElementById("range-min");
const monsterRangeMax = document.getElementById("range-max");
const sortRadios = document.querySelectorAll('input[name="sort-mode"]');

// Load the JSON file
fetch('OSE_monsters_script.json')
  .then(response => response.json())
  .then(jsonData => {
    // Convert JSON object to array, excluding the "Category:Monsters" entry
    data = Object.entries(jsonData)
      .filter(([name, _]) => name !== "Category:Monsters")
      .map(([name, monsterData]) => ({
        Name: name,
        ...monsterData
      }));
    
    updateRangeDisplay();
    displayList();
  })
  .catch(error => console.error("Error loading OSE monster data:", error));

// Extract numeric HD value for sorting/filtering
function extractHD(hdString) {
  if (!hdString) return 0;
  // Match patterns like "6*", "2+1", "½", "Â½", "1-1", etc.
  const match = hdString.match(/^(½|Â½|\d+)/);
  if (!match) return 0;
  if (match[1] === '½' || match[1] === 'Â½') return 0.5;
  return parseInt(match[1]);
}

function getSortedData() {
  if (currentSortMode === "alpha") {
    return [...data].sort((a, b) => a.Name.localeCompare(b.Name));
  } else {
    return [...data].sort((a, b) => {
      const aHD = extractHD(a.stats["Hit Dice"]);
      const bHD = extractHD(b.stats["Hit Dice"]);
      return aHD - bHD || a.Name.localeCompare(b.Name);
    });
  }
}

function getFilteredData(sortedData) {
  return sortedData.filter(monster => {
    const nameMatches = monster.Name.toLowerCase().includes(currentSearchQuery);
    const hd = extractHD(monster.stats["Hit Dice"]);
    const levelMatches = hd >= currentMinLevel && hd <= currentMaxLevel;
    return nameMatches && levelMatches;
  });
}

function getCardInnerHTML(monster, monsterId) {
  const stats = monster.stats;
  const abilities = monster.special_abilities || [];
  
  // Format special abilities with bold titles
  const abilitiesHTML = abilities.length > 0 
    ? abilities.map(ability => `<p>${formatAbility(ability)}</p>`).join("")
    : "<p>No special abilities.</p>";

  // Extract HD number for display badge
  const hdNum = extractHD(stats["Hit Dice"]);
  const hdDisplay = hdNum === 0.5 ? "½" : hdNum;

  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${monsterId}-favorite-icon">◆</div>
        <div class="card-title">${monster.Name}</div>
      </div>
      <div class="monster-level">${hdDisplay}</div>
    </div>

    <div class="card-body" id="${monsterId}-body">
      <p class="flavor-text">${monster.description || "No description available."}</p>
      
      <div class="divider"></div>
      
      <div class="ose-stats">
        <p><strong>AC</strong> ${stats["Armour Class"] || "-"}</p>
        <p><strong>HD</strong> ${stats["Hit Dice"] || "-"}</p>
        <p><strong>ATK</strong> ${stats["Attacks"] || "-"}</p>
        <p><strong>THAC0</strong> ${stats["THAC0"] || "-"}</p>
        <p><strong>MV</strong> ${stats["Movement"] || "-"}</p>
        <p><strong>Saves</strong> ${formatSaves(stats["Saving Throws"]) || "-"}</p>
        <p><strong>M</strong> ${stats["Morale"] || "-"}</p>
        <p><strong>AL</strong> ${stats["Alignment"] || "-"}</p>
        <p><strong>XP</strong> ${stats["XP"] || "-"}</p>
        <p><strong># Appearing</strong> ${stats["Number Appearing"] || "-"}</p>
        <p><strong>TT</strong> ${stats["Treasure Type"] || "-"}</p>
      </div>

      <div class="divider"></div>

      <div class="abilities">
        ${abilitiesHTML}
      </div>
    </div>
  `;
}

// Format saving throws with bold letters
function formatSaves(savesString) {
  if (!savesString) return "";
  // Bold the single letters D, W, P, B, S
  return savesString
    .replace(/\bD(\d+)/g, '<strong>D</strong>$1')
    .replace(/\bW(\d+)/g, '<strong>W</strong>$1')
    .replace(/\bP(\d+)/g, '<strong>P</strong>$1')
    .replace(/\bB(\d+)/g, '<strong>B</strong>$1')
    .replace(/\bS(\d+)/g, '<strong>S</strong>$1');
}

// Format ability text with bold title (text before first colon or period)
function formatAbility(ability) {
  const match = ability.match(/^(.*?[.:])/);
  if (match) {
    const bolded = `<strong>${match[1]}</strong>`;
    return ability.replace(match[1], bolded);
  }
  return ability;
}

// Handle sort mode changes
sortRadios.forEach(radio => {
  radio.addEventListener("change", function() {
    currentSortMode = this.value;
    displayList();
  });
});

// Prevent min slider from going above max
monsterRangeMin.addEventListener("input", function () {
  currentMinLevel = parseInt(this.value);
  if (currentMinLevel > currentMaxLevel) {
    currentMaxLevel = currentMinLevel;
    monsterRangeMax.value = currentMaxLevel;
  }
  updateRangeDisplay();
  displayList();
});

// Prevent max slider from going below min
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
  const minDisplay = currentMinLevel === 0.5 ? "½" : currentMinLevel;
  const maxDisplay = currentMaxLevel === 0.5 ? "½" : currentMaxLevel;
  monsterRangeDisplay.textContent = `${minDisplay} - ${maxDisplay}`;
}
