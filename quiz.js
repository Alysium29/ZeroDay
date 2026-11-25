const questionElement =
    document.getElementById("question");

const answersContainer =
    document.getElementById("answers");

const confirmButton =
    document.getElementById("confirm_button");

const answerElement =
    document.getElementById("answer");

const reloadButton =
    document.getElementById("reload_button");

const quizContent =
    document.getElementById("quiz-content");

const navbar =
    document.getElementById("navbar");

const difficultyButtons =
    document.querySelectorAll(".difficulty-button");

let currentQuiz = null;
let selectedButton = null;
let selectedDifficulty = null;

async function loadQuiz() {

    const response =
        await fetch("./quiz_list.json");

    const quizzes =
        await response.json();

    const quizzesForDifficulty =
        quizzes.filter(quiz => quiz.difficulty === selectedDifficulty);

    if (quizzesForDifficulty.length === 0) {
        throw new Error(`No quizzes found for difficulty "${selectedDifficulty}".`);
    }

    const previousQuestionKey =
        `zeroDayLastQuizQuestion:${selectedDifficulty}`;

    const previousQuestion =
        localStorage.getItem(previousQuestionKey);

    const quizzesWithoutPrevious =
        quizzesForDifficulty.filter(
            quiz => quiz.question !== previousQuestion
        );

    const availableQuizzes =
        quizzesWithoutPrevious.length > 0
            ? quizzesWithoutPrevious
            : quizzesForDifficulty;

    currentQuiz =
        availableQuizzes[
            Math.floor(Math.random() * availableQuizzes.length)
        ];

    localStorage.setItem(previousQuestionKey, currentQuiz.question);

    displayQuiz(currentQuiz);
}

function shuffle(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [array[i], array[j]] =
            [array[j], array[i]];
    }

    return array;
}

function displayQuiz(quiz) {

    questionElement.textContent =
        quiz.question;

    answerElement.hidden = true;
    reloadButton.hidden = true;
    answersContainer.innerHTML = "";

    selectedButton = null;

    confirmButton.disabled = true;

    const shuffledAnswers =
        quiz.answers.map((answer, index) => ({
            text: answer,
            isCorrect: index === quiz.correct
        }));

    shuffle(shuffledAnswers);

    shuffledAnswers.forEach(answer => {

        const button =
            document.createElement("button");

        button.textContent = answer.text;

        button.classList.add("answer-button");

        button.dataset.correct =
            answer.isCorrect;

        button.addEventListener("click", () => {

            document
                .querySelectorAll(".answer-button")
                .forEach(btn =>
                    btn.classList.remove("selected")
                );

            button.classList.add("selected");

            selectedButton = button;

            confirmButton.disabled = false;
        });

        answersContainer.appendChild(button);
    });
}

difficultyButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (button.disabled) {
            return;
        }

        selectedDifficulty = button.dataset.difficulty;

        difficultyButtons.forEach(difficultyButton => {
            const isSelected =
                difficultyButton === button;

            difficultyButton.classList.toggle("selected", isSelected);
            difficultyButton.setAttribute("aria-pressed", isSelected);
            difficultyButton.hidden = !isSelected;
            difficultyButton.disabled = true;
        });

        quizContent.hidden = false;
        loadQuiz();
    });
});

confirmButton.addEventListener("click", () => {

    const buttons =
        document.querySelectorAll(".answer-button");

    buttons.forEach(btn => {
        btn.disabled = true;
    });

    const correctButton =
        [...buttons].find(
            button => button.dataset.correct === "true"
        );

    correctButton.style.backgroundColor = "green";
    correctButton.style.color = "white";

    const isCorrect =
        selectedButton.dataset.correct === "true";

    if (isCorrect) {

        answerElement.textContent =
            "Correct! " + currentQuiz.explanation;
    }
    else {

        selectedButton.style.backgroundColor =
            "red";

        selectedButton.style.color =
            "white";

        answerElement.textContent =
            "Wrong! " + currentQuiz.explanation;
    }

    answerElement.hidden = false;
    confirmButton.disabled = true;
    reloadButton.hidden = false;
});

reloadButton.addEventListener("click", () => {
    loadQuiz();
});