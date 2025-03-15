document.addEventListener("DOMContentLoaded", function () {
    // 📌 Select all cards on the page
    const cards = document.querySelectorAll(".card");

// 📌 Function to get URL parameters
function getURLParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// 📌 Check if the "expand" parameter is set in the URL
const expandParam = getURLParam("expand");

if (expandParam === "character-sheet") {
   const characterSheetCard = [...document.querySelectorAll(".card")].find(card => 
    card.querySelector(".card-title")?.textContent.includes("Character Sheet")
);
    if (characterSheetCard) {
        setTimeout(() => {
            expandCard(characterSheetCard);
        }, 50);
    }
} else {
    // Default behavior: Expand the "About" card only on the About page
    const aboutCard = document.querySelector(".card-container:last-of-type .card");
    if (aboutCard) {
        setTimeout(() => {
            expandCard(aboutCard);
        }, 50);
    }
}

    // 📌 Add click event listener to all cards
    cards.forEach(card => {
        card.addEventListener("click", function (event) {
            // Prevent expansion if a button or link was clicked
            if (event.target.classList.contains("card-button") || event.target.tagName === "A") {
                return;
            }
            // Toggle expansion of the clicked card
            toggleCard(card);
        });
    });
});

// 📌 Function to toggle a card open or closed
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

// 📌 Function to expand a card
function expandCard(card) {
    const body = card.querySelector(".card-body");
    if (!body) return;

    body.style.maxHeight = body.scrollHeight + "px";
    card.classList.add("expanded");
}

// 📌 Function to collapse a card
function collapseCard(card) {
    const body = card.querySelector(".card-body");
    if (!body) return;

    body.style.maxHeight = null;
    card.classList.remove("expanded");
}

// 📌 Function to print the embedded PDF
function printPDF() {
    const iframe = document.getElementById("character-sheet-pdf");
    if (iframe) {
        iframe.contentWindow.print();
    } else {
        alert("Error: PDF not found.");
    }
}
