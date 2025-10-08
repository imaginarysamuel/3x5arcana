// 📌 Game.js
// 📌 Game Data Source
const spellSheetUrl = "https://opensheet.elk.sh/1GSQ87L3gNGsL1PxMmPuOmKh4PUuOXwBLOpN9OLo7pNY/Rules";
let data = [];
let currentSearchQuery = "";

// 📌 Cache DOM elements
const searchBar = document.getElementById("search-bar");
const cardsList = document.getElementById("cards-list");

// Helper functions
function showLoading(message) {
  if (cardsList) {
    cardsList.innerHTML = `<div class="loading">${message}</div>`;
  }
}

function showError(message) {
  if (cardsList) {
    cardsList.innerHTML = `<div class="error">${message}</div>`;
  }
}

// Show loading state
showLoading("Loading...");

// 📌 Fetch data from Google Sheet
fetch(spellSheetUrl)
  .then(response => {
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers.get('content-type'));
    return response.text(); // Get as text first to see what we're getting
  })
  .then(text => {
    console.log("Raw response (first 500 chars):", text.substring(0, 500));
    try {
      const d = JSON.parse(text);
      console.log("✅ Fetched Data:", d);
      data = d;
      displayList();
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.log("Full response:", text);
      showError("Failed to parse data. Check console for details.");
    }
  })
  .catch(error => {
    console.error("❌ Error loading data:", error);
    showError("Failed to load rules. Please refresh.");
  });

// getting sorted data 
function getSortedData() {
  const arr = data.slice();

  if (window.sortMode === 'alpha') {
    return arr.sort((a, b) => (a["Title"] || "").localeCompare(b["Title"] || ""));
  }

  // Default: keep original order
  return arr;
}

function getFilteredData(sortedData) {
  return sortedData.filter(rule => {
    const titleMatches = rule["Title"]?.toLowerCase().includes(currentSearchQuery);
    const ruleMatches = rule["Rule"]?.toLowerCase().includes(currentSearchQuery);
    return titleMatches || ruleMatches;
  });
}

function getCardInnerHTML(rule, ruleId) {
  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="card-title">${rule["Title"] || "Unknown Rule"}</div>
      </div>
    </div>

    <div class="card-body" id="${ruleId}-body">
      <p class="spell-description">${rule["Rule"] || "No description available."}</p>
    </div>
  `;
}

function displayList() {
  if (!cardsList || !data.length) return;
  
  const sortedData = getSortedData();
  const filteredData = getFilteredData(sortedData);
  
  if (filteredData.length === 0) {
    cardsList.innerHTML = '<p class="no-results">No rules found.</p>';
    return;
  }
  
  cardsList.innerHTML = filteredData.map((rule, index) => {
    const ruleId = `rule-${index}`;
    return `<div class="card" id="${ruleId}">${getCardInnerHTML(rule, ruleId)}</div>`;
  }).join('');
}

// 📌 Event Listeners
if (searchBar) {
  searchBar.addEventListener("input", function () {
    currentSearchQuery = this.value.toLowerCase();
    displayList();
  });
}

// Sort mode handling
const sortRadios = document.querySelectorAll('input[name="sort-mode"]');
sortRadios.forEach(radio => {
  radio.addEventListener('change', function() {
    window.sortMode = this.value;
    displayList();
  });
});

// Initialize sort mode
window.sortMode = 'level';
