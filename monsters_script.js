// 📌 monsters_script.js
// Fetch monster data
const monsterSheetUrl = "https://opensheet.elk.sh/1E9c3F3JPCDnxqLE0qVtW0K7PBsgHSd7s5oU8p8qeAAY/All";
let data = [];
let currentMinLevel = 0;
let currentMaxLevel = 30;

// Cache DOM elements
const monsterRangeDisplay = document.getElementById("range-display");
const monsterRangeMin = document.getElementById("range-min");
const monsterRangeMax = document.getElementById("range-max");

// Fetch monster data from spreadsheet
fetch(monsterSheetUrl)
  .then(response => response.json())
  .then(d => {
    data = d;
    data.unshift({
  "Name": "Just Use Bears",
  "Level": "Any",
  "Flavor Text": "Rawr.",
  "Type": "iframe-only",
  "Ability 1": "__IFRAME__"
});
    updateRangeDisplay();
    displayList();
  })
  .catch(error => console.error("Error loading monster data:", error));

function getSortedData() {
  return data.sort((a, b) => {
    if (a.Name === "Just Use Bears") return -1;
    if (b.Name === "Just Use Bears") return 1;

    const aLevel = parseFloat(a["Level"]) || 0;
    const bLevel = parseFloat(b["Level"]) || 0;
    return aLevel - bLevel || a["Name"].localeCompare(b["Name"]);
  });
}


function getFilteredData(sortedData) {
  return sortedData.filter(monster => {
    const nameMatches = monster["Name"].toLowerCase().includes(currentSearchQuery);
    const level = parseFloat(monster["Level"]) || 0;
    const levelMatches = level >= currentMinLevel && level <= currentMaxLevel;
    return nameMatches && levelMatches;
  });
}

function getCardInnerHTML(monster, monsterId) {
  const abilities = [];

  for (let i = 1; i <= 9; i++) {
    const ability = monster[Ability ${i}];
    if (ability === "__IFRAME__") {
      abilities.push(
        <iframe 
          src="https://imaginarysamuel.github.io/3x5arcana/Just_Use_Bears_v1_p1.pdf#toolbar=0"
          width="100%" 
          height="600px" 
          style="border: 1px solid var(--grey-dark); border-radius: 5px;">
        </iframe>
      );
    } else if (ability) {
      abilities.push(<p>${formatAbility(ability)}</p>);
    }
  }

  const abilitiesHTML = abilities.length > 0 ? abilities.join("") : "<p>No special abilities.</p>";
  const isIframeOnly = monster["Type"] === "iframe-only";

  return 
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

      ${!isIframeOnly ? 
        <table class="stats-table">
          <tr>
            <th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th>
          </tr>
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
          <tr>
            <th>AC</th><th>HP</th><th>AL</th><th>MV</th>
          </tr>
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
       : ""}

      <div class="abilities">
        ${abilitiesHTML}
      </div>
    </div>
  ;
}


// Utility function to bold the first phrase up to a colon or period
function formatAbility(ability) {
  const match = ability.match(/^(.*?[.:])/);
  if (match) {
    const bolded = <strong>${match[1]}</strong>;
    return ability.replace(match[1], bolded);
  }
  return ability;
}

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
  monsterRangeDisplay.textContent = ${currentMinLevel} - ${currentMaxLevel};
}
