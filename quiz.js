const questionElement =
    document.getElementById("question");

const answersContainer =
    document.getElementById("answers");

const confirmButton =
    document.getElementById("confirm_button");

const answerElement =
    document.getElementById("answer");

let currentQuiz = null;
let selectedButton = null;

async function loadQuiz() {

    const response =
        await fetch("./quiz_list.json");

    const quizzes =
        await response.json();

    currentQuiz =
        quizzes[Math.floor(Math.random() * quizzes.length)];

    displayQuiz(currentQuiz);
}

function displayQuiz(quiz) {

    questionElement.textContent =
        quiz.question;

    answersContainer.innerHTML = "";

    selectedButton = null;

    quiz.answers.forEach((answerText, index) => {

        const button =
            document.createElement("button");

        button.textContent = answerText;
        button.classList.add("answer-button");

        button.dataset.index = index;

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

confirmButton.addEventListener("click", () => {

    const buttons =
        document.querySelectorAll(".answer-button");

    buttons.forEach(btn => {
        btn.disabled = true;
    });

    const correctButton =
        buttons[currentQuiz.correct];

    correctButton.style.backgroundColor = "green";
    correctButton.style.color = "white";

    const selectedIndex =
        Number(selectedButton.dataset.index);

    if (selectedIndex === currentQuiz.correct) {

        answerElement.textContent =
            "Correct !";
    }
    else {

        selectedButton.style.backgroundColor =
            "red";

        selectedButton.style.color =
            "white";

        answerElement.textContent =
            "Wrong !";
    }

    answerElement.hidden = false;

    confirmButton.disabled = true;
});

loadQuiz();