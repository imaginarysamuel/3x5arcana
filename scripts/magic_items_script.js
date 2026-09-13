// 📌 magic_items_script.js
// Fetch magic item data
// A saved snapshot of the Google Sheet, served from this site, so the page
// doesn't wait on (or depend on) opensheet.elk.sh at load time. The sheet is
// still the source of truth: after editing it, run this from the repo root,
// then commit magic_items.json:
//   curl -s "https://opensheet.elk.sh/1WM6VoP1l_aXr2Z8G45wlTnbwVY87y3qZ_7PgD7HMBj8/Magic_Items" -o magic_items.json
const magicItemDataUrl = "/magic_items.json";
let data = [];

showLoading("Loading...");

// Fetch magic item data (local snapshot of the Google Sheet)
fetch(magicItemDataUrl)
  .then(response => response.json())
  .then(d => {
    data = d;
    loadFavorites(); // ← Add this
    displayList();
    displayFavorites(true); // ← Add this
  })
  .catch(error => {
    console.error("Error loading magic item data:", error);
    showError("Failed to load magic items. Please refresh."); // ← Add this
  });

function getSortedData() {
  return data.filter(item => {
    const nameMatches = item["Name"].toLowerCase().includes(currentSearchQuery);
    return nameMatches;
  });
}

function getFilteredData(sortedData) {
  return sortedData;
}

function getCardInnerHTML(item, itemId) {
  let cardContent = `
    ${getCardActionButtonsHTML()}
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${itemId}-favorite-icon">●</div>
        <div class="card-title">${item["Name"]}</div>
      </div>
    </div>
    <div class="card-body" id="${itemId}-body">
      <div class="flavor-text">${item["Description"] || "No description available."}</div>
  `;

  const fields = ["Bonus", "Benefit", "Curse", "Personality"];
  fields.forEach((field, index) => {
    if (item[field]) {
      cardContent += `<div class="divider"></div><p><strong>${field}:</strong> ${item[field]}</p>`;
    }
  });

  cardContent += `<div class="card-bottom-padding"></div></div>`;
  return cardContent;
}
