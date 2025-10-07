// 📌 monsters_script.js
// 🧸 load monster database
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
      "HTML Path": "/just_use_bears.html",
      "Alt HTML Path": "/just_use_bears_card.html",
      "Level": 0
    };
    data.unshift(justUseBears);

    loadFavorites(); // 💾 Load saved favorites
    updateRangeDisplay();
    displayList();
    displayFavorites(true); // Render favorites list
  })
  .catch(error => {
    console.error("Error loading monster data:", error);
    showError("Failed to load monsters. Please refresh.");
  });

function displayList() {
  cardListContainer.innerHTML = "";
  const sortedData = getSortedData();
  const justUseBears = sortedData.find(m => m["Name"] === "Just Use Bears"); // 🧸 Isolate the bear
  const filteredData = getFilteredData(sortedData).filter(m => m["Name"] !== "Just Use Bears"); // 🧸 Remove it from regular list

  if (justUseBears) {
    addCardsToList([justUseBears], cardListContainer, "", false); // 🧸 Always render it first
  }

  addCardsToList(filteredData, cardListContainer, "", false);
}

function getSortedData() {
  const arr = data.slice(); // don't mutate original

  if (window.sortMode === 'alpha') {
    return arr.sort((a, b) => (a["Name"] || "").localeCompare(b["Name"] || ""));
  }

  // 'level' mode for monsters = Level → Name (NaN-safe)
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
    // Check for * first, before any parsing
    if (levelRaw === "*") return nameMatches;
    
    const level = parseFloat(levelRaw) || 0;
    const levelMatches = level >= currentMinLevel && level <= currentMaxLevel;
    return nameMatches && levelMatches;
  });
}

function getCardInnerHTML(monster, monsterId, useAlt = false) {
  // 🧸 Load custom HTML card
  if (monster["Type"] === "custom-html") {
    // 🧸 Mark placeholder for content load
    setTimeout(() => {
      const path = useAlt ? monster["Alt HTML Path"] : monster["HTML Path"];
      fetch(path)
        .then(res => res.text())
        .then(html => {
          const target = document.getElementById(`${monsterId}-body`);
          if (target) target.innerHTML = html;
        });
    }, 0);

    return `
      <div class="card-header">
        <div class="card-favorite-title">
          <div class="favorite-icon" id="${monsterId}-favorite-icon">●</div>
          <div class="card-title">${monster["Name"]}</div>
        </div>
      </div>
      <div class="card-body" id="${monsterId}-body">
        <div class="loading">Loading...</div>
      </div>
    `;
  }

  // ✨ Default card generation continues here...
  const abilities = [];
  for (let i = 1; i <= 9; i++) {
    if (monster[`Ability ${i}`]) {
      abilities.push(`<p>${formatAbility(monster[`Ability ${i}`])}</p>`);
    }
  }
  const abilitiesHTML = abilities.length > 0 ? abilities.join("") : "<p>No special abilities.</p>";

  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${monsterId}-favorite-icon">●</div>
        <div class="card-title">${monster["Name"]}</div>
      </div>
      <div class="monster-level">${monster["Level"] || "?"}</div>
    </div>
    <div class="card-body" id="${monsterId}-body">
      <p class="flavor-text">${monster["Flavor Text"] || "No description available."}</p>
      <div class="divider"></div>
      <table class="stats-table">
        <tr><th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th></tr>
        <tr>
          <td>${monster["S"] || "-"}</td>
          <td>${monster["D"] || "-"}</td>
          <td>${monster["C"] || "-"}</td>
          <td>${monster["I"] || "-"}</td>
          <td>${monster["W"] || "-"}</td>
          <td>${monster["Ch"] || "-"}</td>
        </tr>
      </table>
      <div class="divider"></div>
      <table class="traits-table">
        <tr><th>AC</th><th>HP</th><th>AL</th><th>MV</th></tr>
        <tr>
          <td>${monster["AC"] || "-"}</td>
          <td>${monster["HP"] || "-"}</td>
          <td>${monster["AL"] || "-"}</td>
          <td>${monster["MV"] || "-"}</td>
        </tr>
      </table>
      <div class="divider"></div>
      <div class="attacks">
        <p><strong>Attack:</strong> ${monster["ATK"] || "None"}</p>
      </div>
      <div class="divider"></div>
      <div class="abilities">${abilitiesHTML}</div>
    </div>
  `;
}

function formatAbility(ability) {
  const match = ability.match(/^(.*?[.:])/);
  if (match) {
    const bolded = `<strong>${match[1]}</strong>`;
    return ability.replace(match[1], bolded);
  }
  return ability;
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
