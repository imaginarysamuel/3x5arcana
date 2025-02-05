// Declare filtering variables for search and level range
let currentSearchQuery = "";
let currentMinLevel = 0;
let currentMaxLevel = 30;

// Fetch monster data from the external Google Sheet
fetch("https://opensheet.elk.sh/1E9c3F3JPCDnxqLE0qVtW0K7PBsgHSd7s5oU8p8qeAAY/All")
  .then(response => response.json())
  .then(monsters => {
    displayMonsterList(monsters);
    updateRangeDisplay();
    updateFilters();
  })
  .catch(error => console.error("Error loading Google Sheets data:", error));

// Display the monster list, sorted by level and then name
function displayMonsterList(data) {
  const listContainer = document.getElementById("monster-list");
  // Clear the list before updating
  listContainer.innerHTML = "";

  if (!data || data.length === 0) {
    listContainer.innerHTML = "<p>No monsters found.</p>";
    return;
  }

  // Sort the data first by level (numerically) then alphabetically by name
  data.sort((a, b) => {
    const levelA = parseFloat(a["Level"] || "0");
    const levelB = parseFloat(b["Level"] || "0");
    return levelA - levelB || a["Name"].localeCompare(b["Name"]);
  });

  // Iterate through the sorted data and create monster cards
  data.forEach((monster, index) => {
    const item = document.createElement("div");
    item.classList.add("monster-card-container");

    // Validate level and store it as a data attribute for filtering
    const monsterLevel = monster["Level"] || "0";
    item.setAttribute("data-level", monsterLevel);

    // Gather non-empty abilities (up to 9)
    const abilities = [
      monster["Ability 1"], monster["Ability 2"], monster["Ability 3"],
      monster["Ability 4"], monster["Ability 5"], monster["Ability 6"],
      monster["Ability 7"], monster["Ability 8"], monster["Ability 9"]
    ]
    .filter(ability => ability && ability.trim().length > 0)
    .map(ability => `<p>${ability}</p>`)
    .join("");

    item.innerHTML = `
      <div class="monster-card" onclick="toggleCard('${index}')">
        <div class="card-header">
          <div class="monster-header">${monster["Name"]}</div>
          <div class="monster-level">${monsterLevel}</div>
        </div>
        <div class="card-body" id="monster-body-${index}">
          <div class="monster-description">${monster["Flavor Text"] || "No description available."}</div>
          <div class="monster-content">
            <div class="monster-left">
              <div class="monster-stats-container">
                <div class="monster-stats-labels">
                  <div>STR</div><div>DEX</div><div>CON</div><div>INT</div><div>WIS</div><div>CHA</div>
                </div>
                <div class="monster-stats-values">
                  <div>${monster["S"] || "-"}</div><div>${monster["D"] || "-"}</div><div>${monster["C"] || "-"}</div>
                  <div>${monster["I"] || "-"}</div><div>${monster["W"] || "-"}</div><div>${monster["Ch"] || "-"}</div>
                </div>
                <div class="monster-traits-labels">
                  <div>AL</div><div>HP</div><div>AC</div><div>MV</div>
                </div>
                <div class="monster-traits-values">
                  <div>${monster["AL"] || "-"}</div><div>${monster["HP"] || "-"}</div>
                  <div><b>${monster["AC"] || "-"}</b></div><div><i>${monster["MV"] || "-"}</i></div>
                </div>
              </div>
              <p><b>Attack:</b> ${monster["ATK"] || "None"}</p>
            </div>
            <div class="monster-right">${abilities}</div>
          </div>
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// Toggle the expansion of a monster card and create a duplicate card at the top
function toggleCard(id, isDuplicate = false) {
  const body = document.getElementById(`monster-body-${id}`);
  if (!body) return;

  const card = body.closest(".monster-card");
  const listContainer = document.getElementById("monster-list");
  const isExpanded = card.classList.contains("expanded");

  if (isExpanded) {
    // Collapse the main card
    body.style.maxHeight = null;
    card.classList.remove("expanded");

    // Remove the duplicate card if it exists
    const duplicateCard = document.getElementById(`duplicate-${id}`);
    if (duplicateCard) {
      duplicateCard.classList.add("removing");
      duplicateCard.addEventListener("animationend", function () {
        duplicateCard.remove();
      });
    }
  } else {
    // Expand the main card
    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");

    if (!isDuplicate) {
      // Remove any existing duplicate card before adding a new one
      const existingDuplicate = document.getElementById(`duplicate-${id}`);
      if (existingDuplicate) {
        existingDuplicate.remove();
      }

      // Clone the card and create a duplicate at the top
      const duplicate = card.cloneNode(true);
      duplicate.id = `duplicate-${id}`;
      duplicate.classList.add("duplicate-card");
      duplicate.addEventListener("click", () => toggleCard(id, true));

      listContainer.prepend(duplicate);
    }
  }
}

// Update the range display text (e.g., "0 - 30")
function updateRangeDisplay() {
  document.getElementById("range-display").textContent = `${currentMinLevel} - ${currentMaxLevel}`;
}

// Level Range Filtering: When the sliders are moved, update the current min/max and filter the list
document.getElementById("range-min").addEventListener("input", function() {
  currentMinLevel = parseInt(this.value);
  updateRangeDisplay();
  updateFilters();
});

document.getElementById("range-max").addEventListener("input", function() {
  currentMaxLevel = parseInt(this.value);
  updateRangeDisplay();
  updateFilters();
});

// Monster Search Filtering: When the search input changes, update the filter
document.getElementById("search-bar").addEventListener("input", function () {
  currentSearchQuery = this.value.toLowerCase();
  updateFilters();
});

// Filtering Function: Show or hide monster cards based on search and level range
function updateFilters() {
  const monsterCards = document.querySelectorAll(".monster-card-container");
  monsterCards.forEach(card => {
    const name = card.querySelector(".monster-header").textContent.toLowerCase();
    const level = parseFloat(card.getAttribute("data-level"));

    const matchesSearch = name.includes(currentSearchQuery);
    const matchesLevel = level >= currentMinLevel && level <= currentMaxLevel;

    card.style.display = (matchesSearch && matchesLevel) ? "block" : "none";
  });
}
