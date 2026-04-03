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

// Keep maxHeight in sync when contenteditable fields grow (e.g. line wrap).
// Single delegated listener — covers all card types site-wide.
document.addEventListener("input", function (e) {
  const body = e.target.closest(".card.expanded .card-body");
  if (body) body.style.maxHeight = body.scrollHeight + "px";
});


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

  updatePrintAllButton();
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
            e.target.classList.contains("card-action-btn") ||
            e.target.closest('.card-actions') ||
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

  updatePrintAllButton();
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

// ============================================
// 📋🖨️  CARD ACTION BUTTONS HTML GENERATOR
// ============================================

/**
 * Returns the HTML for card action buttons (copy & print)
 * Print button only appears if html2pdf library is loaded
 */

function getCardActionButtonsHTML() {
  const printBtn = typeof jspdf !== 'undefined'
    ? `<button class="card-action-btn print-btn" title="Print as 3x5 PDF"><img src="/files/printer_icon.png" alt="Print"></button>`
    : '';

  return `
    <div class="card-actions">
      <button class="card-action-btn copy-btn" title="Copy to clipboard"><img src="/files/copy_icon.png" alt="Copy"></button>
      ${printBtn}
    </div>
  `;
}

// Export for use by rendering scripts
window.getCardActionButtonsHTML = getCardActionButtonsHTML;

// ============================================
// 📋🖨️ CARD COPY & PRINT EVENT HANDLERS
// ============================================

/**
 * Event delegation for copy and print buttons
 * Single listener handles all dynamically created buttons
 */
(function initCardActionButtons() {
  if (window.cardActionButtonsInitialized) return;
  window.cardActionButtonsInitialized = true;

  document.addEventListener('click', function(e) {
    // Handle Copy Button
    if (e.target.closest('.copy-btn')) {
      e.stopPropagation();
      const card = e.target.closest('.card');
      if (card) copyCardContent(card);
    }

    // Handle Print Button
    if (e.target.closest('.print-btn')) {
      e.stopPropagation();
      const card = e.target.closest('.card');
      if (card) printSingleCard(card);
    }
  });
})();

// ============================================
// 📋 COPY FUNCTIONALITY
// ============================================

/**
 * Copies card content to clipboard as plain text
 */
function copyCardContent(card) {
  try {
    const title = card.querySelector('.card-title')?.textContent || 'Untitled';
    const body = card.querySelector('.card-body');

    if (!body) {
      console.warn('No card body found');
      return;
    }

    let text = `${title}\n${'='.repeat(title.length)}\n\n`;

    // Gather text from common content elements
    const elements = body.querySelectorAll('p, .flavor-text, .statline, .spell-stats p, .ose-stats p, .abilities p, td, th');
    const seen = new Set();

    elements.forEach(el => {
      const content = el.textContent.trim();
      if (content && !seen.has(content)) {
        seen.add(content);
        text += content + '\n\n';
      }
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      showCopyFeedback(card);
    }).catch(err => {
      console.error('Clipboard API failed:', err);
      fallbackCopyTextToClipboard(text.trim(), card);
    });
  } catch (error) {
    console.error('Error copying card content:', error);
  }
}

/**
 * Visual feedback when copy succeeds
 */
function showCopyFeedback(card) {
  const btn = card.querySelector('.copy-btn');
  if (!btn) return;

  const originalText = btn.textContent;
  btn.textContent = '✓';
  btn.classList.add('copied');

  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('copied');
  }, 1500);
}

/**
 * Fallback for browsers without clipboard API
 */
function fallbackCopyTextToClipboard(text, card) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    showCopyFeedback(card);
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }

  document.body.removeChild(textArea);
}
