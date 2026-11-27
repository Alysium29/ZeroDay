const playersInput =
    document.getElementById("players");

const removedCardsElement =
    document.getElementById("removed-cards");

const remainingCardsElement =
    document.getElementById("remaining-cards");

function updateDeckSize() {

    const removedCards =
        Number(playersInput.selectedOptions[0].dataset.cardsToRemove);

    const remainingCards =
        90 - removedCards;

    removedCardsElement.textContent =
        removedCards;

    remainingCardsElement.textContent =
        remainingCards;
}

playersInput.addEventListener(
    "change",
    updateDeckSize
);

updateDeckSize();