// 📌 list_script.js
// Handles ALL card expansion and interaction (both static and dynamic cards)

// ============================================
// 🎴 UNIVERSAL CARD EXPANSION
// ============================================

function toggleCard(card) {
  const body = card.querySelector(".card-body");
  if (!body) return;

  const isExpanded = card.classList.contains("expanded");
  if (isExpanded) {
    body.style.maxHeight = null;
    card.classList.remove("expanded");
  } else {
    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
  }
}

// ============================================
// 🏠 STATIC CARDS (index.html, license cards, etc.)
// ============================================

function initStaticCards() {
  // Select all cards explicitly marked as static
  const staticCards = document.querySelectorAll(".card[data-static]");
  
  staticCards.forEach(card => {
    // Skip bookmarks - they never expand
    if (card.classList.contains("bookmark")) return;
    
    // Avoid double-binding
    if (card.dataset.boundStatic) return;
    card.dataset.boundStatic = "true";
    
    card.addEventListener("click", function (event) {
      // Don't expand if clicking buttons or links
      if (event.target.classList.contains("card-button") || 
          event.target.tagName === "A") {
        return;
      }
      toggleCard(card);
    });
  });
}

// Run on page load
document.addEventListener("DOMContentLoaded", initStaticCards);

// Export for script.js to call after loading license card
window.initStaticCards = initStaticCards;

// ============================================
// 📋 DYNAMIC CARDS (spells, monsters, etc.)
// ============================================

const searchBar = document.getElementById("search-bar");
const favoritesListContainer = document.getElementById("favorites-list");
const cardListContainer = document.getElementById("cards-list");
let favoritesIdList = [];
let currentSearchQuery = "";

// 🎯 Check if item is a Bookmark
function isBookmark(item) {
  return item["Name"] && item["Name"].startsWith("★");
}

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

// Show loading state
function showLoading(message = "Loading...") {
  if (cardListContainer) {
    cardListContainer.innerHTML = '<div class="loading-message">' + message + '</div>';
  }
  if (favoritesListContainer) {
    favoritesListContainer.innerHTML = '';
  }
}

// Show error state
function showError(message = "Failed to load data. Please refresh.") {
  if (cardListContainer) {
    cardListContainer.innerHTML = '<div class="error-message">' + message + '</div>';
  }
}

// Display card lists
function displayList() {
  if (!cardListContainer) return;
  cardListContainer.innerHTML = "";
  let sortedData = getSortedData();
  let filteredData = getFilteredData(sortedData);
  addCardsToList(filteredData, cardListContainer, "", false);
}

function displayFavorites(useAlt = false) {
  if (!favoritesListContainer) return;
  favoritesListContainer.innerHTML = "";
  let sortedData = getSortedData();
  let favoriteData = sortedData.filter(item => favoritesIdList.includes(item["Name"]));
  addCardsToList(favoriteData, favoritesListContainer, "-fav", useAlt);
}

function addCardsToList(list, container, suffix, useAlt = false) {
  list.forEach((item, index) => {
    const card = document.createElement("div");
    card.classList.add("card", "collapsed");
    
    // Store the item name directly on the element for favorites
    card.dataset.itemName = item["Name"];
    
    // 🎯 Bookmarks don't expand
    if (isBookmark(item)) {
      card.classList.add("bookmark");
    } else {
      // Regular cards get click listener - element-based, no ID needed
      card.addEventListener("click", (e) => {
        // Prevent expansion if clicking on favorite icon or links
        if (e.target.classList.contains("favorite-icon") || 
            e.target.classList.contains("card-button") || 
            e.target.tagName === "A") {
          return;
        }
        toggleCard(card);
      });
    }
    
    // Generate unique ID only for the HTML content rendering
    const cardId = `card-${item["Name"] + suffix}`;
    card.innerHTML = getCardInnerHTML(item, cardId, useAlt);
    
    // 🎯 Only add favorite functionality to non-bookmark cards
    if (!isBookmark(item)) {
      const favoriteIcon = card.querySelector(".favorite-icon");
      if (favoriteIcon) {
        if (favoritesIdList.includes(item["Name"])) {
          favoriteIcon.classList.add("favorited");
        }
        favoriteIcon.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleFavorite(item["Name"]);
        });
      }
    }
    
    container.appendChild(card);
  });
}

// Toggle favorite card - now element-aware
function toggleFavorite(name) {
  const idx = favoritesIdList.indexOf(name);
  const isNowFav = idx === -1;
  
  if (isNowFav) {
    favoritesIdList.push(name);
  } else {
    favoritesIdList.splice(idx, 1);
  }

  // Sync icons in both main and fav lists by finding cards with matching itemName
  document.querySelectorAll(`[data-item-name="${name}"]`).forEach(card => {
    const icon = card.querySelector(".favorite-icon");
    if (icon) {
      icon.classList.toggle('favorited', isNowFav);
    }
  });

  saveFavorites();
  displayFavorites(true);
}

// ============================================
// 🔍 SEARCH & SORT
// ============================================

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
      window.sortMode = e.target.value;
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
  currentSearchQuery = "";
}
