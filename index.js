const playersInput =
    document.getElementById("players");

const removedCardsElement =
    document.getElementById("removed-cards");

const remainingCardsElement =
    document.getElementById("remaining-cards");

const cardsToRemove = {
    5: 0,
    4: 6,
    3: 18,
    2: 30
};

function updateDeckSize() {

    const players =
        Number(playersInput.value);

    const removedCards =
        cardsToRemove[players];

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