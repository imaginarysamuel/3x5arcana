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