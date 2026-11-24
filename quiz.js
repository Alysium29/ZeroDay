let answer = document.getElementById("answer")
let true_button = document.getElementById("true_button")
let false_button = document.getElementById("false_button")

function disableButtons() {
    true_button.disabled = true;
    false_button.disabled = true;
    true_button.style.backgroundColor = "green";
    true_button.style.color = "white";
}

function correct() {
    answer.textContent = "Correct !";
    disableButtons();
}

function wrong() {
    answer.textContent = "Wrong !";
    false_button.style.backgroundColor = "red";
    false_button.style.color = "white";
    disableButtons();
}

true_button.addEventListener("click", correct);
false_button.addEventListener("click", wrong);