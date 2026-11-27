function replaceDeckSetup(source) {
    const playersInput = source.getElementById("players");
    const removedCardsElement = source.getElementById("removed-cards");
    const remainingCardsElement = source.getElementById("remaining-cards");
    const selectionItem = playersInput && playersInput.closest("li");
    const removedCardsItem = removedCardsElement && removedCardsElement.closest("li");

    if (!playersInput || !removedCardsElement || !remainingCardsElement ||
        !selectionItem || !removedCardsItem) {
        throw new Error("The setup section could not be found in the rules page.");
    }

    const deckSize = Number(remainingCardsElement.textContent);
    if (!Number.isInteger(deckSize)) {
        throw new Error("The total Robot card count is invalid.");
    }

    const countItem = source.createElement("li");
    countItem.append("Count the number of players:");

    const countsList = source.createElement("ul");
    const playerOptions = Array.from(playersInput.options).sort(
        (first, second) => Number(first.value) - Number(second.value)
    );

    for (const option of playerOptions) {
        const playerCount = Number(option.value);
        const removedCards = Number(option.dataset.cardsToRemove);

        if (!Number.isInteger(playerCount) || !Number.isInteger(removedCards)) {
            throw new Error("A player count is missing its Robot card count.");
        }

        const count = source.createElement("li");
        count.append(`${playerCount} players: Remove `);

        const removedCount = source.createElement("strong");
        removedCount.textContent = removedCards;
        count.append(removedCount, " Robot cards from the deck. It should contain ");

        const remainingCount = source.createElement("strong");
        remainingCount.textContent = deckSize - removedCards;
        count.append(remainingCount, " cards.");
        countsList.append(count);
    }

    countItem.append(countsList);
    selectionItem.replaceWith(countItem);
    removedCardsItem.remove();
}

async function loadPrintableRules() {
    const response = await fetch("../index.html");
    if (!response.ok) {
        throw new Error(`Could not load the rules page (${response.status}).`);
    }

    const source = new DOMParser().parseFromString(await response.text(), "text/html");
    source.body.querySelector("nav")?.remove();
    replaceDeckSetup(source);

    const sourceBase = new URL("../", window.location.href);
    const printableAssetsBase = new URL("./assets/", window.location.href);
    for (const image of source.body.querySelectorAll("img[src]")) {
        const imagePath = image.getAttribute("src");
        const imageBase = image.closest(".role-icons") ? printableAssetsBase : sourceBase;
        const relativeImagePath = image.closest(".role-icons")
            ? imagePath.split("/").pop()
            : imagePath;
        image.setAttribute("src", new URL(relativeImagePath, imageBase).href);
    }

    document.body.replaceChildren(...source.body.children);
}

loadPrintableRules().catch((error) => {
    console.error("Could not load printable rules:", error);
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = "Printable rules could not be loaded.";
    document.body.replaceChildren(message);
});
