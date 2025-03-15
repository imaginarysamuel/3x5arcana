document.addEventListener("DOMContentLoaded", function () {
    // 📌 Select all cards on the page
    const cards = document.querySelectorAll(".card");

    // 📌 Expand the "About" card by default (assuming it's the last one)
    const aboutCard = document.querySelector(".card-container:last-of-type .card");
    if (aboutCard) {
        setTimeout(() => {
            expandCard(aboutCard);
        }, 50); // Delay to ensure styles apply
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
