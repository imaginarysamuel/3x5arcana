document.addEventListener("DOMContentLoaded", function () {
  function toggleStaticCard(id) {
    const body = document.getElementById(id);
    if (!body) return;

    const card = body.closest(".monster-card");
    const isExpanded = card.classList.contains("expanded");

    if (isExpanded) {
      body.style.maxHeight = null;
      card.classList.remove("expanded");
    } else {
      body.style.maxHeight = body.scrollHeight + "px";
      card.classList.add("expanded");
    }
  }

  // Attach event listeners to static cards
  document.querySelectorAll(".static-card").forEach(card => {
    card.addEventListener("click", function () {
      const bodyId = this.getAttribute("data-body-id");
      toggleStaticCard(bodyId);
    });
  });
});
