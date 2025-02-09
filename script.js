document.addEventListener("DOMContentLoaded", function () {
    // Select all cards
    const cards = document.querySelectorAll(".card");

    // Expand the "About" card by default (assuming it's the last one)
    const aboutCard = document.querySelector(".card-container:last-of-type .card");
    if (aboutCard) {
        setTimeout(() => {
            expandCard(aboutCard);
        }, 50); // Delay to ensure styles apply
    }

    // Add click event listener to all cards
    cards.forEach(card => {
        card.addEventListener("click", function (event) {
            // Prevent expansion if a button or link was clicked
            if (event.target.classList.contains("card-button") || event.target.tagName === "A") {
                return;
            }

            // Toggle expansion
            toggleCard(card);
        });
    });
});

// Function to toggle a card open or closed
function toggleCard(card) {
    const body = card.querySelector(".card-body");

    if (!body) return;

    const isExpanded = card.classList.contains("expanded");

    if (isExpanded) {
        collapseCard(card);
    } else {
        expandCard(card);
    }
}

// Function to expand a card
function expandCard(card) {
    const body = card.querySelector(".card-body");
    if (!body) return;

    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
}

// Function to collapse a card
function collapseCard(card) {
    const body = card.querySelector(".card-body");
    if (!body) return;

    body.style.maxHeight = null;
    card.classList.remove("expanded");
}
// Cache DOM elements
const burgerIcon = document.getElementById("burger-icon");
const menuOverlay = document.getElementById("menu-overlay");
const menuCloseIcon = document.getElementById("menu-close-icon");
const menuCard = document.querySelector(".menu-card");

// Function to open the menu
function openMenu() {
  menuOverlay.classList.add("open");
  menuCard.classList.remove("closing");
}

// Function to close the menu with animation
function closeMenu() {
  menuCard.classList.add("closing");
  menuCard.addEventListener(
    "animationend",
    () => {
      menuOverlay.classList.remove("open");
    },
    { once: true } // Ensures the event listener is removed after one execution
  );
}

// Open menu on burger icon click
burgerIcon.addEventListener("click", openMenu);

// Close menu on close icon click
menuCloseIcon.addEventListener("click", closeMenu);

// Close menu when clicking outside the menu content
menuOverlay.addEventListener("click", (e) => {
  if (!menuCard.contains(e.target)) {
    closeMenu();
  }
});

// Open menu on burger icon click
burgerIcon.addEventListener("click", openMenu);

// Close menu on close icon click
menuCloseIcon.addEventListener("click", closeMenu);

// Close menu when clicking outside the menu content
menuOverlay.addEventListener("click", (e) => {
  if (!menuCard.contains(e.target)) {
    closeMenu();
  }
});
