// 📌 list_script.js
// Cache DOM elements
const searchBar = document.getElementById("search-bar");
const favoritesListContainer = document.getElementById("favorites-list");
const cardListContainer = document.getElementById("cards-list");
let favoritesIdList = [];

let currentSearchQuery = "";

// Display card lists
function displayList() {
  cardListContainer.innerHTML = ""; 
  let sortedData = getSortedData();
  let filteredData = getFilteredData(sortedData);
  addCardsToList(filteredData, cardListContainer, "");
}

function displayFavorites(useAlt = false) {
  favoritesListContainer.innerHTML = "";
  let sortedData = getSortedData();
  let favoriteData = sortedData.filter(item => favoritesIdList.includes(item["Name"]));
  addCardsToList(favoriteData, favoritesListContainer, "-fav", useAlt);
}

function addCardsToList(list, container, suffix) {
  list.forEach((item, index) => {
    const cardId = `card-${item["Name"]+suffix}`;
    const card = document.createElement("div");
    card.classList.add("card", "collapsed");
    card.setAttribute("data-id", cardId);
    card.addEventListener("click", () => toggleCard(cardId));

    card.innerHTML = getCardInnerHTML(item, cardId);

    const favoriteIcon = card.querySelector(".favorite-icon");
    if (favoritesIdList.includes(item["Name"])) {
      favoriteIcon.classList.add("favorited");
    }
  
    favoriteIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(item["Name"]);
    });
  
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
  const card = document.querySelector(`[data-id="card-${id}"]`);
  const favoriteIcon = card.querySelector(".favorite-icon");
  const index = favoritesIdList.indexOf(id);
  if (index > -1) {
    favoritesIdList.splice(index, 1);
    favoriteIcon.classList.remove("favorited");
  } else {
    favoritesIdList.push(id);
    favoriteIcon.classList.add("favorited");
  }
  displayFavorites();
  loadCustomHtmlContent();
}

// Add search functionality with debounce
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
  
searchBar.addEventListener("input", debounce(function () {
    currentSearchQuery = this.value.toLowerCase();
    displayList();
  }, 300));
