/* Global filtering variables */
var currentSearchQuery = "";
var currentMinLevel = 1;
var currentMaxLevel = 10;

/* Update the displayed monster cards based on search text and level range */
function updateFilters() {
  const monsterCards = document.querySelectorAll(".monster-card-container");
  monsterCards.forEach(card => {
    // Always show cards without a data-level attribute (e.g., About/License cards)
    if (!card.hasAttribute("data-level")) {
      card.style.display = "block";
      return;
    }
    const name = card.querySelector(".monster-header").textContent.toLowerCase();
    const levelText = card.getAttribute("data-level");
    const levelNumber = parseFloat(levelText);
    const matchesSearch = name.includes(currentSearchQuery);
    const matchesLevel = isNaN(levelNumber)
      ? true
      : (levelNumber >= currentMinLevel && levelNumber <= currentMaxLevel);
    card.style.display = (matchesSearch && matchesLevel) ? "block" : "none";
  });
}

/* Listen for search input changes */
document.getElementById("search-bar").addEventListener("input", function () {
  currentSearchQuery = this.value.toLowerCase();
  updateFilters();
});

/* Fetch monster data from Google Sheets */
fetch("https://opensheet.elk.sh/1E9c3F3JPCDnxqLE0qVtW0K7PBsgHSd7s5oU8p8qeAAY/All")
  .then(response => response.json())
  .then(monsters => {
    displayMonsterList(monsters);

    // Determine the numeric level range from the data
    const levels = monsters
      .map(monster => parseFloat(monster["Level"]))
      .filter(num => !isNaN(num));
    if (levels.length > 0) {
      const minFromData = Math.min(...levels);
      const maxFromData = Math.max(...levels);
      currentMinLevel = minFromData;
      currentMaxLevel = maxFromData;

      // Update the range input attributes for both sliders
      const rangeMinInput = document.getElementById("range-min");
      const rangeMaxInput = document.getElementById("range-max");
      rangeMinInput.min = minFromData;
      rangeMinInput.max = maxFromData;
      rangeMaxInput.min = minFromData;
      rangeMaxInput.max = maxFromData;
      rangeMinInput.value = minFromData;
      rangeMaxInput.value = maxFromData;
      updateRangeDisplay();
    }
    updateFilters();
  })
  .catch(error => console.error("Error loading Google Sheets data:", error));

function displayMonsterList(data) {
  const listContainer = document.getElementById("monster-list");
  listContainer.innerHTML = ""; // Clear any previous content

  // Group monsters by level
  const groupedByLevel = {};
  data.forEach(monster => {
    const level = monster["Level"] || "Unknown";
    if (!groupedByLevel[level]) {
      groupedByLevel[level] = [];
    }
    groupedByLevel[level].push(monster);
  });

  // Sort levels numerically (with 'Unknown' last)
  const sortedLevels = Object.keys(groupedByLevel)
    .sort((a, b) => (isNaN(a) ? 999 : parseInt(a)) - (isNaN(b) ? 999 : parseInt(b)));

  sortedLevels.forEach(level => {
    // Sort monsters alphabetically within each level
    groupedByLevel[level].sort((a, b) => a["Name"].localeCompare(b["Name"]));
    groupedByLevel[level].forEach((monster, index) => {
      const abilities = [
        monster["Ability 1"], monster["Ability 2"], monster["Ability 3"],
        monster["Ability 4"], monster["Ability 5"], monster["Ability 6"],
        monster["Ability 7"], monster["Ability 8"], monster["Ability 9"]
      ]
        .filter(ability => ability && ability.trim().length > 0)
        .map(ability => `<p>${ability}</p>`)
        .join("");
      
      const item = document.createElement("div");
      item.classList.add("monster-card-container");
      // Store the monster's level for filtering
      item.setAttribute("data-level", monster["Level"]);
      item.innerHTML = `
        <div class="monster-card" onclick="toggleCard('${level}-${index}')">
          <div class="card-header">
            <div class="monster-header">${monster["Name"]}</div>
            <div class="monster-level">${monster["Level"]}</div>
          </div>
          <div class="card-body" id="monster-body-${level}-${index}">
            <div class="monster-description">${monster["Flavor Text"]}</div>
            <div class="monster-content">
              <div class="monster-left">
                <div class="monster-stats-container">
                  <div class="monster-stats-labels">
                    <div>STR</div>
                    <div>DEX</div>
                    <div>CON</div>
                    <div>INT</div>
                    <div>WIS</div>
                    <div>CHA</div>
                  </div>
                  <div class="monster-stats-values">
                    <div>${monster["S"]}</div>
                    <div>${monster["D"]}</div>
                    <div>${monster["C"]}</div>
                    <div>${monster["I"]}</div>
                    <div>${monster["W"]}</div>
                    <div>${monster["Ch"]}</div>
                  </div>
                  <div class="monster-traits-labels">
                    <div>AL</div>
                    <div>HP</div>
                    <div>AC</div>
                    <div>MV</div>
                  </div>
                  <div class="monster-traits-values">
                    <div>${monster["AL"]}</div>
                    <div>${monster["HP"]}</div>
                    <div><b>${monster["AC"]}</b></div>
                    <div><i>${monster["MV"]}</i></div>
                  </div>
                </div>
                <p><b>Attack:</b> ${monster["ATK"]}</p>
              </div>
              <div class="monster-right">${abilities}</div>
            </div>
          </div>
        </div>
      `;
      listContainer.appendChild(item);
    });
  });

  // Create static About and License cards
  createAboutCard();
  createLicenseCard();
}

function createAboutCard() {
  const listContainer = document.getElementById("monster-list");
  const aboutCard = document.createElement("div");
  aboutCard.classList.add("monster-card-container");
  aboutCard.innerHTML = `
    <div class="monster-card" onclick="toggleAboutCard()">
      <div class="card-header">
        <div class="monster-header">About</div>
      </div>
      <div class="card-body" id="about-card-body">
        <div class="custom-text">
          This is a codex of monsters for Shadowdark. For me, the humble 3x5 card captures the soul of flexible, creative dungeon delving. It's not always practical to have paper cards. So I built this.
        </div>
      </div>
    </div>
  `;
  listContainer.prepend(aboutCard);
}

function toggleAboutCard() {
  const body = document.getElementById("about-card-body");
  const card = body.closest(".monster-card");
  const isExpanded = card.classList.contains("expanded");
  if (isExpanded) {
    body.style.maxHeight = null;
    card.classList.remove("expanded");
  } else {
    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
  }
}

function createLicenseCard() {
  const listContainer = document.getElementById("monster-list");
  const licenseCard = document.createElement("div");
  licenseCard.classList.add("monster-card-container");
  licenseCard.innerHTML = `
    <div class="monster-card" onclick="toggleLicenseCard()">
      <div class="card-header">
        <div class="monster-header">License Information</div>
      </div>
      <div class="card-body" id="license-card-body">
        <div class="custom-text">
          Shadowdark Monstercard Codex is an independent product published under the Shadowdark RPG Third-Party License and is not affiliated with The Arcane Library, LLC.<br><br>
          Shadowdark RPG © 2023 The Arcane Library, LLC.<br><br>
          This product is built on the work of Night Noon Games, with material available under the <a href="https://creativecommons.org/licenses/by-sa/4.0/#ref-appropriate-credit" target="_blank">Attribution-ShareAlike 4.0 International License</a>.
          You can view the full terms and give appropriate credit as per the license.
        </div>
      </div>
    </div>
  `;
  listContainer.prepend(licenseCard);
}

function toggleLicenseCard() {
  const body = document.getElementById("license-card-body");
  const card = body.closest(".monster-card");
  const isExpanded = card.classList.contains("expanded");
  if (isExpanded) {
    body.style.maxHeight = null;
    card.classList.remove("expanded");
  } else {
    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
  }
}

function toggleCard(id, isDuplicate = false) {
  const body = document.getElementById(`monster-body-${id}`);
  const card = body.closest(".monster-card");
  const listContainer = document.getElementById("monster-list");
  const cardType = isDuplicate ? "duplicate" : "main";
  const isExpanded = card.classList.contains("expanded");
  if (isExpanded) {
    body.style.maxHeight = null;
    card.classList.remove("expanded");
    if (cardType === "main") {
      const duplicateCard = document.getElementById(`duplicate-${id}`);
      if (duplicateCard) {
        duplicateCard.classList.add("removing");
        duplicateCard.addEventListener("animationend", function () {
          duplicateCard.remove();
        });
      }
    }
  } else {
    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
    if (cardType === "main") {
      const existingDuplicate = document.getElementById(`duplicate-${id}`);
      if (existingDuplicate) {
        existingDuplicate.remove();
      }
      const duplicate = card.cloneNode(true);
      duplicate.id = `duplicate-${id}`;
      duplicate.classList.add("duplicate-card");
      duplicate.addEventListener("click", () => toggleCard(id, true));
      listContainer.prepend(duplicate);
    }
  }
}

/* Update the range display text */
function updateRangeDisplay() {
  const rangeDisplay = document.getElementById("range-display");
  rangeDisplay.textContent = currentMinLevel + " - " + currentMaxLevel;
}

/* Event listeners for the dual range inputs */
document.getElementById("range-min").addEventListener("input", function() {
  let minVal = parseInt(this.value);
  let maxVal = parseInt(document.getElementById("range-max").value);
  if (minVal > maxVal) {
    minVal = maxVal;
    this.value = minVal;
  }
  currentMinLevel = minVal;
  updateRangeDisplay();
  updateFilters();
});

document.getElementById("range-max").addEventListener("input", function() {
  let maxVal = parseInt(this.value);
  let minVal = parseInt(document.getElementById("range-min").value);
  if (maxVal < minVal) {
    maxVal = minVal;
    this.value = maxVal;
  }
  currentMaxLevel = maxVal;
  updateRangeDisplay();
  updateFilters();
});
