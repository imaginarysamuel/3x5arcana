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
// 🎨 CARD ACTION BUTTONS HTML GENERATOR
// ============================================

/**
 * Returns the HTML for card action buttons (copy & print)
 * Print button only appears if html2pdf library is loaded
 */
function getCardActionButtonsHTML() {
  const printBtn = typeof html2pdf !== 'undefined' 
    ? `<button class="card-action-btn print-btn" title="Print as 3x5 PDF" aria-label="Print this card">⎙</button>`
    : '';
  
  return `
    <div class="card-actions">
      <button class="card-action-btn copy-btn" title="Copy to clipboard" aria-label="Copy card content">⎘</button>
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

// ============================================
// 🖨️ PRINT SINGLE CARD
// ============================================

/**
 * Generates a 3x5 PDF for a single card
 */
function printSingleCard(card) {
  if (typeof html2pdf === 'undefined') {
    alert('PDF library not loaded. Please refresh and try again.');
    return;
  }

  try {
    const title = card.querySelector('.card-title')?.textContent || 'Card';
    const level = card.querySelector('.monster-level, .spell-tier, .spell-level')?.textContent || '';
    const body = card.querySelector('.card-body');
    
    if (!body) {
      console.warn('No card body found');
      return;
    }
    
    const bodyClone = body.cloneNode(true);
    
    // Remove action buttons from clone
    const actions = bodyClone.querySelector('.card-actions');
    if (actions) actions.remove();
    
    const printContent = buildPrintContent(title, level, bodyClone);
    
    const opt = {
      margin: 0.18,
      filename: `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: [5, 3],
        orientation: 'landscape'
      }
    };
    
    html2pdf().set(opt).from(printContent).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}

// ============================================
// 🖨️ PRINT ALL FAVORITES
// ============================================

/**
 * Updates visibility of "Print All Favorites" button
 */
function updatePrintAllButton() {
  // Only show if html2pdf is available
  if (typeof html2pdf === 'undefined') return;
  
  const favoritesContainer = document.getElementById('favorites-list');
  if (!favoritesContainer) return;
  
  let printButton = document.getElementById('print-all-favorites-btn');
  const favoriteCards = favoritesContainer.querySelectorAll('.card:not(.bookmark)');
  const count = favoriteCards.length;
  
  if (count === 0) {
    if (printButton) printButton.remove();
    return;
  }
  
  if (!printButton) {
    printButton = document.createElement('button');
    printButton.id = 'print-all-favorites-btn';
    printButton.className = 'print-all-favorites';
    printButton.innerHTML = '<span class="button-icon">⎙</span>Print All Favorites';
    printButton.addEventListener('click', printAllFavorites);
    favoritesContainer.appendChild(printButton);
  }
  
  printButton.classList.add('visible');
}

/**
 * Generates multi-page PDF with all favorited cards
 */
function printAllFavorites() {
  if (typeof html2pdf === 'undefined') {
    alert('PDF library not loaded. Please refresh and try again.');
    return;
  }

  try {
    const favoritesContainer = document.getElementById('favorites-list');
    if (!favoritesContainer) return;
    
    const favoriteCards = Array.from(favoritesContainer.querySelectorAll('.card:not(.bookmark)'));
    
    if (favoriteCards.length === 0) {
      alert('No favorites to print!');
      return;
    }
    
    const btn = document.getElementById('print-all-favorites-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '⏳ Generating...';
    btn.disabled = true;
    
    let allPagesHTML = buildPrintStyles();
    
    favoriteCards.forEach(card => {
      const title = card.querySelector('.card-title')?.textContent || 'Card';
      const level = card.querySelector('.monster-level, .spell-tier, .spell-level')?.textContent || '';
      const body = card.querySelector('.card-body');
      
      if (!body) return;
      
      const bodyClone = body.cloneNode(true);
      const actions = bodyClone.querySelector('.card-actions');
      if (actions) actions.remove();
      
      allPagesHTML += `
        <div class="print-card-page">
          <div class="print-card-header">
            <div class="print-card-title">${title}</div>
            ${level ? `<div class="print-card-level">${level}</div>` : ''}
          </div>
          <div class="print-card-body">
            ${formatBodyForPrint(bodyClone)}
          </div>
          <div class="print-card-branding">3x5arcana.com</div>
        </div>
      `;
    });
    
    const timestamp = new Date().toISOString().slice(0, 10);
    
    const opt = {
      margin: 0.18,
      filename: `3x5_Favorites_${timestamp}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: [5, 3],
        orientation: 'landscape'
      }
    };
    
    html2pdf().set(opt).from(allPagesHTML).save().then(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }).catch(err => {
      console.error('PDF generation failed:', err);
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      alert('Failed to generate PDF. Please try again.');
    });
  } catch (error) {
    console.error('Error in printAllFavorites:', error);
    const btn = document.getElementById('print-all-favorites-btn');
    if (btn) {
      btn.innerHTML = '<span class="button-icon">⎙</span>Print All Favorites';
      btn.disabled = false;
    }
  }
}

// ============================================
// 🛠️ PDF HELPER FUNCTIONS
// ============================================

/**
 * CSS styles for PDF output
 */
function buildPrintStyles() {
  return `
    <style>
      @page {
        size: 5in 3in;
        margin: .18;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'National Park', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 9pt;
        line-height: 1.2;
        color: #000;
      }
      
      .print-card-page {
        width: 5in;
        height: 3in;
        padding: 0.1;
        page-break-after: always;
        overflow: wrap;
        position: relative;
      }
      
      .print-card-page:last-child {
        page-break-after: auto;
      }
      
      .print-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 4px;
        margin-bottom: 6px;
        border-bottom: 2px solid #fa8072;
      }
      
      .print-card-title {
        font-size: 11pt;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .print-card-level {
        font-size: 10pt;
        font-weight: bold;
      }
      
      .print-card-body p {
        margin: 4px 0;
        font-size: 9pt;
        line-height: 1.2;
      }
      
      .print-card-body .divider {
        width: 100%;
        height: 1px;
        color: #000
        margin: 6px 0;
      }
      
      .print-card-body .flavor-text,
      .print-card-body .spell-school,
      .print-card-body .item-description {
        font-style: italic;
        margin-bottom: 6px;
      }
      
      .print-card-body strong {
        font-weight: bold;
      }
      
      .print-card-body table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9pt;
        margin: 4px 0;
      }
      
      .print-card-body th,
      .print-card-body td {
        padding: 2px 4px;
        text-align: left;
      }
      
      .print-card-body th {
        font-weight: bold;
      }
      
      .print-card-branding {
        position: absolute;
        bottom: 0.2in;
        right: 0.25in;
        font-size: 7pt;
        color: #7d7d7d;
        text-align: right;
      }
    </style>
  `;
}

/**
 * Builds complete HTML for single card PDF
 */
function buildPrintContent(title, level, bodyClone) {
  return `
    ${buildPrintStyles()}
    <div class="print-card-page">
      <div class="print-card-header">
        <div class="print-card-title">${title}</div>
        ${level ? `<div class="print-card-level">${level}</div>` : ''}
      </div>
      <div class="print-card-body">
        ${formatBodyForPrint(bodyClone)}
      </div>
      <div class="print-card-branding">3x5arcana.com</div>
    </div>
  `;
}

/**
 * Formats card body content for PDF
 */
function formatBodyForPrint(bodyClone) {
  let html = '';
  
  for (let child of bodyClone.children) {
    // Skip card-actions if somehow still present
    if (child.classList.contains('card-actions')) continue;
    
    // Dividers
    if (child.classList.contains('divider')) {
      html += '<div class="divider"></div>';
      continue;
    }
    
    // Containers with multiple paragraphs
    if (child.classList.contains('abilities') || 
        child.classList.contains('spell-stats') || 
        child.classList.contains('ose-stats')) {
      const paragraphs = child.querySelectorAll('p');
      paragraphs.forEach(p => {
        html += `<p>${p.innerHTML}</p>`;
      });
      continue;
    }
    
    // Tables
    if (child.tagName === 'TABLE') {
      html += child.outerHTML;
      continue;
    }
    
    // Regular elements
    html += child.outerHTML;
  }
  
  return html;
}
