// Fetch magic item data
const magicItemSheetUrl = "https://opensheet.elk.sh/1WM6VoP1l_aXr2Z8G45wlTnbwVY87y3qZ_7PgD7HMBj8/Magic_Items";
let magicItemData = [];
let currentSearchQuery = "";

// Cache DOM elements
const magicItemSearchBar = document.getElementById("search-bar");
const magicItemsFavoritesListContainer = document.getElementById("magic-items-favorites-list");
const magicItemsListContainer = document.getElementById("magic-items-list");
let favoritesIdList = [];

// Fetch magic item data from spreadsheet
fetch(magicItemSheetUrl)
  .then(response => response.json())
  .then(data => {
    magicItemData = data;
    displayMagicItemList();
  })
  .catch(error => console.error("Error loading magic item data:", error));

function displayMagicItemList() {
  magicItemsListContainer.innerHTML = ""; // Clear existing list

  let filteredItems = magicItemData.filter(item => {
    const nameMatches = item["Name"].toLowerCase().includes(currentSearchQuery);
    return nameMatches;
  });

  addMagicItemCardsToList(filteredItems, magicItemsListContainer, "");

  magicItemsFavoritesListContainer.innerHTML = "";
  let favoriteItems = magicItemData.filter(item => favoritesIdList.includes(item["Name"]));
  addMagicItemCardsToList(favoriteItems, magicItemsFavoritesListContainer, "-fav");
}

function addMagicItemCardsToList(list, container, suffix) {
  list.forEach(item => {
    const itemId = `magic-item-${item["Name"] + suffix}`;
    const itemCard = document.createElement("div");
    itemCard.classList.add("card", "collapsed");
    itemCard.setAttribute("data-id", itemId);
    itemCard.addEventListener("click", () => toggleMagicItemCard(itemId));

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

    itemCard.innerHTML = cardContent;

    const favoriteIcon = itemCard.querySelector(".favorite-icon");
    if (favoritesIdList.includes(item["Name"])) {
      favoriteIcon.classList.add("favorited");
    }
    favoriteIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavoriteMagicItem(item["Name"]);
    });

    container.appendChild(itemCard);
  });
}

function toggleMagicItemCard(id) {
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

function toggleFavoriteMagicItem(id) {
  const index = favoritesIdList.indexOf(id);
  if (index > -1) {
    favoritesIdList.splice(index, 1);
  } else {
    favoritesIdList.push(id);
  }
  displayMagicItemList();
}

// Add search functionality with debounce
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

magicItemSearchBar.addEventListener("input", debounce(function () {
  currentSearchQuery = this.value.toLowerCase();
  displayMagicItemList();
}, 300));

// Burger Menu Functionality
const burgerIcon = document.getElementById("burger-icon");
const menuOverlay = document.getElementById("menu-overlay");
const menuCloseIcon = document.getElementById("menu-close-icon");
const menuCard = document.querySelector(".menu-card");

function openMenu() {
  menuOverlay.classList.add("open");
  menuCard.classList.remove("closing");
}

function closeMenu() {
  menuCard.classList.add("closing");
  menuCard.addEventListener("animationend", () => {
    menuOverlay.classList.remove("open");
  }, { once: true });
}

burgerIcon.addEventListener("click", openMenu);
menuCloseIcon.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", (e) => {
  if (!menuCard.contains(e.target)) {
    closeMenu();
  }
});
