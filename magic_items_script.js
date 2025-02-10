// Fetch magic item data
const magicItemSheetUrl = "https://opensheet.elk.sh/1WM6VoP1l_aXr2Z8G45wlTnbwVY87y3qZ_7PgD7HMBj8/Magic_Items";
let data = [];

// Fetch magic item data from spreadsheet
fetch(magicItemSheetUrl)
  .then(response => response.json())
  .then(d => {
    data = d;
    displayList();
  })
  .catch(error => console.error("Error loading magic item data:", error));

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
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${itemId}-favorite-icon">◪</div>
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