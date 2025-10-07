// 📌 list_script.js
// Cache DOM elements
const searchBar = document.getElementById("search-bar");
const favoritesListContainer = document.getElementById("favorites-list");
const cardListContainer = document.getElementById("cards-list");
let favoritesIdList = [];
let currentSearchQuery = "";

// 💾 Load favorites from localStorage
function loadFavorites() {
  const saved = localStorage.getItem('favoritesIdList');
  if (saved) {
    try {
      favoritesIdList = JSON.parse(saved);
    } catch (e) {
      favoritesIdList = [];
    }
  }
}

// 💾 Save favorites to localStorage
function saveFavorites() {
  localStorage.setItem('favoritesIdList', JSON.stringify(favoritesIdList));
}

// Display card lists
function displayList() {
  cardListContainer.innerHTML = "";
  let sortedData = getSortedData();
  let filteredData = getFilteredData(sortedData);
  addCardsToList(filteredData, cardListContainer, "", false); // 🧼 Shared version: default view, not alt
}

function displayFavorites(useAlt = false) {
  if (!favoritesListContainer) return; // ✅ minimal guard
  favoritesListContainer.innerHTML = "";
  let sortedData = getSortedData();
  let favoriteData = sortedData.filter(item => favoritesIdList.includes(item["Name"]));
  addCardsToList(favoriteData, favoritesListContainer, "-fav", useAlt);
}

function addCardsToList(list, container, suffix, useAlt = false) {
  list.forEach((item, index) => {
    const cardId = `card-${item["Name"] + suffix}`;
    const card = document.createElement("div");
    card.classList.add("card", "collapsed");
    card.setAttribute("data-id", cardId);
    card.addEventListener("click", () => toggleCard(cardId));
    card.innerHTML = getCardInnerHTML(item, cardId, useAlt);
    const favoriteIcon = card.querySelector(".favorite-icon");
    if (favoriteIcon) { // ✅ minimal guard
      if (favoritesIdList.includes(item["Name"])) {
        favoriteIcon.classList.add("favorited");
      }
      favoriteIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(item["Name"]);
      });
    }
    container.appendChild(card);
  });
}

// 📌 Toggle card expansion
function toggleCard(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  const body = document.getElementById(`${id}-body`);
  if (!card || !body) return;
  const isExpanded = card.classList.contains("expanded");
  if (isExpanded) {
    body.style.maxHeight = null;
    card.classList.remove("expanded");
  } else {
    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
  }
}

// Toggle favorite card
function toggleFavorite(id) {
  const idx = favoritesIdList.indexOf(id);
  const isNowFav = idx === -1;
  
  if (isNowFav) {
    favoritesIdList.push(id);
  } else {
    favoritesIdList.splice(idx, 1);
  }

  // Sync icons in both main and fav cards instantly
  [`card-${id}`, `card-${id}-fav`].forEach(cid => {
    const icon = document.querySelector(`[data-id="${cid}"] .favorite-icon`);
    if (icon) icon.classList.toggle('favorited', isNowFav);
  });

  saveFavorites(); // 💾 Save to localStorage
  displayFavorites(true); // 🧼 Render alternate view in favorites when applicable
}

// Add search functionality with debounce
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Sorting mode: 'level' (Level) or 'alpha' (A–Z only)
window.sortMode = window.sortMode || 'level';

// Bind radios if present
const sortRadios = document.querySelectorAll('input[name="sort-mode"]');
if (sortRadios.length) {
  sortRadios.forEach(r => {
    r.addEventListener('change', (e) => {
      window.sortMode = e.target.value;  // 'level' or 'alpha'
      displayList();
      displayFavorites(true);
    });
  });
}

if (searchBar) {
  searchBar.addEventListener("input", debounce(function () {
    currentSearchQuery = this.value.toLowerCase();
    displayList();
  }, 300));
} else {
  currentSearchQuery = ""; // ensure variable still exists
}
