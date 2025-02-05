console.log("Loaded Monsters HTML. Fetching Data..."); // ✅ Debug Step 1

fetch("https://opensheet.elk.sh/1E9c3F3JPCDnxqLE0qVtW0K7PBsgHSd7s5oU8p8qeAAY/All")
  .then(response => response.json())
  .then(monsters => {
    console.log("Fetched Monsters:", monsters); // ✅ Debug Step 2: Check if data loads
    displayMonsterList(monsters);
    updateFilters();
  })
  .catch(error => console.error("Error loading Google Sheets data:", error));

function displayMonsterList(data) {
  console.log("Running displayMonsterList with data:", data); // ✅ Debug Step 3
  const listContainer = document.getElementById("monster-list");
  
  // Clear the list before updating
  listContainer.innerHTML = "";

  if (!data || data.length === 0) {
    listContainer.innerHTML = "<p>No monsters found.</p>";
    return;
  }

  // Iterate through the data and create monster cards
  data.forEach((monster, index) => {
    const item = document.createElement("div");
    item.classList.add("monster-card-container");

    // Validate level
    const monsterLevel = monster["Level"] || "0";
    item.setAttribute("data-level", monsterLevel);

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

function toggleCard(id) {
  const body = document.getElementById(`monster-body-${id}`);
  if (!body) return;

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

// Update Range Display
function updateRangeDisplay() {
  document.getElementById("range-display").textContent = `${currentMinLevel} - ${currentMaxLevel}`;
}

// Level Range Filtering
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

// Monster Search Filtering
document.getElementById("search-bar").addEventListener("input", function () {
  currentSearchQuery = this.value.toLowerCase();
  updateFilters();
});

// Filtering Function
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
