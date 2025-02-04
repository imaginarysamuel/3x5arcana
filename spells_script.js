const spellSheetUrl = "https://opensheet.elk.sh/1ZsdxP3KiZZ1YCGcxddqNMKhZH2LOV1uwAhVyYqBlR3E/Spells";
let spellData = [];
let currentSearchQuery = "";
let currentMinTier = 1;
let currentMaxTier = 5;
let filterWizard = true;
let filterPriest = true;

fetch(spellSheetUrl)
  .then(response => response.json())
  .then(data => {
    spellData = data;
    updateRangeDisplay();
    displaySpellList();
  })
  .catch(error => console.error("Error loading spell data:", error));

function displaySpellList() {
  const listContainer = document.getElementById("spell-list");
  listContainer.innerHTML = "";
  
  let filteredSpells = spellData.filter(spell => {
    const nameMatches = spell["Name"].toLowerCase().includes(currentSearchQuery);
    const tierMatches = spell["Tier"] >= currentMinTier && spell["Tier"] <= currentMaxTier;
    const classMatches = (filterWizard && spell["Class"].includes("Wizard")) || (filterPriest && spell["Class"].includes("Priest"));
    return nameMatches && tierMatches && classMatches;
  });

  filteredSpells.sort((a, b) => a["Tier"] - b["Tier"] || a["Name"].localeCompare(b["Name"]));
  
  filteredSpells.forEach((spell, index) => {
    const spellId = `spell-${index}`;
    const spellCard = document.createElement("div");
    spellCard.classList.add("monster-card-container");
    spellCard.setAttribute("data-id", spellId);
    spellCard.innerHTML = `
      <div class="monster-card" onclick="toggleSpellCard('${spellId}')">
        <div class="card-header">
          <div class="monster-header">${spell["Name"]}</div>
          <div class="monster-level">${spell["Class"].includes("Wizard") && spell["Class"].includes("Priest") ? "W/P" : spell["Class"].charAt(0)} ${spell["Tier"]}</div>
        </div>
        <div class="card-body" id="${spellId}-body">
          <div class="spell-description">${spell["Description"]}</div>
          <div class="monster-content">
            <div><b>Class:</b> ${spell["Class"]}</div>
            <div><b>Duration:</b> ${spell["Duration"]}</div>
            <div><b>Range:</b> ${spell["Range"]}</div>
          </div>
        </div>
      </div>
    `;
    listContainer.appendChild(spellCard);
  });
}

function toggleSpellCard(id, isDuplicate = false) {
  const mainBody = document.getElementById(`${id}-body`);
  if (!mainBody) return;
  const card = mainBody.closest(".monster-card");
  const listContainer = document.getElementById("spell-list");
  const isExpanded = card.classList.contains("expanded");

  if (isExpanded) {
    mainBody.style.maxHeight = null;
    card.classList.remove("expanded");

    const duplicateCard = document.getElementById(`duplicate-${id}`);
    if (duplicateCard) {
      duplicateCard.classList.add("removing");
      duplicateCard.addEventListener("animationend", function () {
        duplicateCard.remove();
      });
    }
  } else {
    mainBody.style.maxHeight = mainBody.scrollHeight + "px";
    card.classList.add("expanded");

    if (!isDuplicate) {
      const existingDuplicate = document.getElementById(`duplicate-${id}`);
      if (existingDuplicate) {
        existingDuplicate.remove();
      }
      const duplicate = card.cloneNode(true);
      duplicate.id = `duplicate-${id}`;
      duplicate.classList.add("duplicate-card");
      duplicate.addEventListener("click", () => toggleSpellCard(id, true));
      listContainer.prepend(duplicate);
    }
  }
}

function updateRangeDisplay() {
  document.getElementById("spell-range-display").textContent = `${currentMinTier} - ${currentMaxTier}`;
}

document.getElementById("spell-search-bar").addEventListener("input", function () {
  currentSearchQuery = this.value.toLowerCase();
  displaySpellList();
});

document.getElementById("filter-wizard").addEventListener("change", function () {
  filterWizard = this.checked;
  displaySpellList();
});

document.getElementById("filter-priest").addEventListener("change", function () {
  filterPriest = this.checked;
  displaySpellList();
});

document.getElementById("spell-range-min").addEventListener("input", function() {
  currentMinTier = parseInt(this.value);
  updateRangeDisplay();
  displaySpellList();
});

document.getElementById("spell-range-max").addEventListener("input", function() {
  currentMaxTier = parseInt(this.value);
  updateRangeDisplay();
  displaySpellList();
});
