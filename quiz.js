const POINT_STEP = 0.5;    // points won (right answer) or lost (wrong answer)
const MAX_POINTS = 5;      // bonus points stay between -MAX_POINTS and +MAX_POINTS
const MISSION_QUIZZES = 2; // easy quizzes per player in the Mission phase

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
// Game mechanics can open a themed question: quiz.html?category=Virus
const filter = { category: (params.get("category") || "").toLowerCase() };

function load() {
    try {
        const s = JSON.parse(localStorage.getItem("zeroday"));
        return s && s.v === 3 ? s : null;
    } catch { return null; }
}
function save() {
    try { localStorage.setItem("zeroday", JSON.stringify(state)); } catch { }
}
function newState(names, missionOn) {
    return {
        v: 3,
        players: names.map(name => ({ name, points: 0, missions: 0 })),
        missionOn,
        missionQueue: missionOn ? names.flatMap((_, i) => Array(MISSION_QUIZZES).fill(i)) : [],
        turn: [],
        asked: []
    };
}

let state = load() || newState([], false);
let quizzes = [], current = null, quiz = null, selected = null, locked = false;
let mode = "round", roundQueue = [], qIndex = 0, hardOnly = false;

// Categories that are not a card family are linked to one (color + QR code filter)
const FAMILY = {
    Passwords: "Generic", Accounts: "Generic", Devices: "Generic", Privacy: "Generic", Data: "Generic",
    "Wi-Fi": "VPN", "Home Network": "VPN", Browsing: "VPN",
    Backups: "Antivirus", Software: "Virus", "Physical Security": "Virus",
    Scams: "Hacker", Messaging: "Hacker"
};
const family = q => FAMILY[q.category] || q.category;

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const perRound = () => state.players.length >= 4 ? 2 : 1; // 2-3 players: 1 quiz, 4-5 players: 2 quizzes
const hasMission = () => state.missionQueue.length > 0;
const hasMore = () => mode === "mission" ? hasMission() : qIndex < roundQueue.length - 1;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderNames() {
    const fields = $("name_fields");
    fields.innerHTML = "";
    for (let i = 0; i < Number($("player_count").value); i++) {
        const input = document.createElement("input");
        input.placeholder = "Player " + (i + 1);
        input.maxLength = 16;
        fields.appendChild(input);
    }
}

function updatePickLabel() {
    $("hint").textContent = hasMission()
        ? "Mission cards: each player answers 2 easy quizzes. Right answer = you keep the Mission card."
        : "Tap a player to volunteer (hard quiz), or let chance decide.";
    if (!quizzes.length) return;
    if (hasMission()) {
        const p = state.missionQueue[0];
        const left = state.missionQueue.filter(i => i === p).length;
        $("pick_button").textContent =
            `Mission quiz: ${state.players[p].name} (card ${MISSION_QUIZZES + 1 - left}/${MISSION_QUIZZES})`;
    } else {
        $("pick_button").textContent = perRound() === 2
            ? "Pick 2 random players to do the next captcha quizzes"
            : "Pick a random player to do the next captcha quiz";
    }
}

function renderScores() {
    $("hint").hidden = locked;
    updatePickLabel();
    $("scoreboard").replaceChildren(...state.players.map((p, i) => {
        const token = document.createElement("button");
        token.className = "player" + (i === current ? " active" : "");
        token.disabled = locked || hasMission();

        const avatar = document.createElement("span");
        avatar.className = "avatar";
        avatar.textContent = p.name.charAt(0).toUpperCase();
        avatar.style.background = `hsl(${(i * 67 + 205) % 360} 75% 65%)`;

        const name = document.createElement("span");
        name.className = "pname";
        name.textContent = p.name;

        const pts = document.createElement("span");
        pts.className = "pts";
        pts.textContent = (p.points > 0 ? "+" : "") + p.points + " pts";

        // Gauge: zero in the middle, goes up in green when winning, down in red when losing
        const gauge = document.createElement("span");
        gauge.className = "gauge";
        gauge.title = p.points + " / ±" + MAX_POINTS;
        const fill = document.createElement("i");
        fill.className = p.points >= 0 ? "pos" : "neg";
        gauge.appendChild(fill);
        requestAnimationFrame(() => {
            fill.style.width = (Math.abs(p.points) / MAX_POINTS * 50) + "%";
        });

        token.append(avatar, name, pts);
        if (state.missionOn) {
            const miss = document.createElement("span");
            miss.className = "miss";
            miss.textContent = `Missions: ${p.missions}/${MISSION_QUIZZES}`;
            token.append(miss);
        }
        token.append(gauge);
        token.addEventListener("click", () => beginRound([i], true));
        return token;
    }));
}

function show() {
    const started = state.players.length > 0;
    $("setup").hidden = started;
    $("game").hidden = !started;
    $("reset_button").hidden = !started;
    $("edit_button").hidden = !started;
    renderScores();
}

function updateTitle() {
    let tag = "";
    if (mode === "mission") {
        const left = state.missionQueue.filter(i => i === current).length;
        tag = ` · Mission card ${MISSION_QUIZZES + 1 - left}/${MISSION_QUIZZES}`;
    } else if (hardOnly) {
        tag = " · Volunteer: hard quiz";
    } else if (roundQueue.length > 1) {
        tag = ` · Quiz ${qIndex + 1}/${roundQueue.length}`;
    }
    $("player_name").textContent = state.players[current].name + ", your turn" + tag;
}

function displayQuiz() {
    updateTitle();
    $("cat").textContent = quiz.category;
    $("round").dataset.cat = family(quiz);
    $("diff").textContent = quiz.difficulty;
    $("diff").className = "badge " + quiz.difficulty;
    $("question").textContent = quiz.question;
    $("answers").innerHTML = "";
    $("answer").hidden = true;
    $("reload_button").hidden = true;
    $("confirm_button").disabled = true;
    selected = null;

    shuffle(quiz.answers.map((text, i) => ({ text, ok: i === quiz.correct }))).forEach(a => {
        const button = document.createElement("button");
        button.textContent = a.text;
        button.className = "answer-button";
        button.dataset.correct = a.ok;
        button.addEventListener("click", () => {
            document.querySelectorAll(".answer-button")
                .forEach(b => b.classList.remove("selected"));
            button.classList.add("selected");
            selected = button;
            $("confirm_button").disabled = false;
        });
        $("answers").appendChild(button);
    });
}

function startQuiz() {
    current = mode === "mission" ? state.missionQueue[0] : roundQueue[qIndex];

    // Mission phase: easy only. Volunteer: hard only. Random rounds: any difficulty.
    const all = quizzes.map((_, i) => i);
    let pool = all.filter(i => mode === "mission" ? quizzes[i].difficulty === "Easy"
        : hardOnly ? quizzes[i].difficulty === "Hard"
        : !filter.category || family(quizzes[i]).toLowerCase() === filter.category);
    if (!pool.length) pool = all;

    // No repeat until the whole pool has been used
    let fresh = pool.filter(i => !state.asked.includes(i));
    if (!fresh.length) {
        state.asked = state.asked.filter(i => !pool.includes(i));
        fresh = pool;
    }
    const id = pick(fresh);
    state.asked.push(id);
    save();

    quiz = quizzes[id];
    $("pick_button").hidden = true;
    $("round").hidden = false;
    renderScores();
    displayQuiz();
}

// Random players for a round: nobody plays twice before everyone has played
function pickPlayers(n) {
    const all = state.players.map((_, i) => i);
    const chosen = [];
    while (chosen.length < Math.min(n, all.length)) {
        const left = all.filter(i => !state.turn.includes(i) && !chosen.includes(i));
        if (!left.length) { state.turn = [...chosen]; continue; }
        chosen.push(pick(left));
        state.turn.push(chosen[chosen.length - 1]);
    }
    return chosen;
}

function beginRound(queue, hard = false) {
    if (!quizzes.length || locked || hasMission()) return;
    mode = "round";
    hardOnly = hard;
    roundQueue = queue;
    qIndex = 0;
    locked = true;
    queue.forEach(i => { if (!state.turn.includes(i)) state.turn.push(i); });
    startQuiz();
}

function endRound() {
    current = null;
    locked = false;
    mode = "round";
    roundQueue = [];
    hardOnly = false;
    $("round").hidden = true;
    $("pick_button").hidden = false;
    renderScores();
}

$("player_count").addEventListener("change", renderNames);

$("start_button").addEventListener("click", () => {
    const names = [...$("name_fields").children]
        .map((el, i) => el.value.trim() || "Player " + (i + 1));
    state = newState(names, $("mission_option").checked);
    current = null;
    save();
    show();
});

$("reset_button").addEventListener("click", () => {
    if (!confirm("Start a new game? Names and scores will be lost.")) return;
    state = newState([], false);
    current = null;
    locked = false;
    mode = "round";
    roundQueue = [];
    hardOnly = false;
    save();
    $("round").hidden = true;
    $("names_panel").hidden = true;
    $("pick_button").hidden = false;
    show();
});

$("edit_button").addEventListener("click", () => {
    $("edit_fields").replaceChildren(...state.players.map(p => {
        const input = document.createElement("input");
        input.value = p.name;
        input.maxLength = 16;
        return input;
    }));
    $("names_panel").hidden = false;
});

$("cancel_names").addEventListener("click", () => { $("names_panel").hidden = true; });

$("save_names").addEventListener("click", () => {
    [...$("edit_fields").children].forEach((el, i) => {
        state.players[i].name = el.value.trim() || state.players[i].name;
    });
    save();
    $("names_panel").hidden = true;
    renderScores();
    if (current !== null) updateTitle();
});

$("pick_button").addEventListener("click", () => {
    if (!quizzes.length || locked) return;
    if (hasMission()) {
        mode = "mission";
        locked = true;
        startQuiz();
    } else {
        beginRound(pickPlayers(perRound()));
    }
});

$("confirm_button").addEventListener("click", () => {
    const buttons = document.querySelectorAll(".answer-button");
    buttons.forEach(b => {
        b.disabled = true;
        if (b.dataset.correct === "true") b.classList.add("correct");
    });

    const player = state.players[current];
    const right = selected.dataset.correct === "true";
    let message;

    if (mode === "mission") {
        if (right) {
            player.missions++;
            message = "Correct! Mission card kept.";
        } else {
            selected.classList.add("wrong");
            message = "Wrong, Mission card discarded.";
        }
        state.missionQueue.shift();
    } else if (right) {
        player.points = Math.min(player.points + POINT_STEP, MAX_POINTS);
        message = `Correct! Action validated, +${POINT_STEP} pt`;
    } else {
        selected.classList.add("wrong");
        player.points = Math.max(player.points - POINT_STEP, -MAX_POINTS);
        message = `Wrong, Action cancelled, -${POINT_STEP} pt`;
    }

    $("answer").textContent = message + "\n" + quiz.explanation;
    $("answer").hidden = false;
    $("confirm_button").disabled = true;
    $("reload_button").textContent = hasMore() ? "Next quiz"
        : mode === "mission" ? "Start the game" : "Next round";
    $("reload_button").hidden = false;
    save();
    renderScores();
});

$("reload_button").addEventListener("click", () => {
    answer.textContent = "";
    answer.hidden = true;
    if (hasMore()) {
        if (mode === "round") qIndex++;
        startQuiz();
    } else {
        endRound();
    }
});

async function init() {
    renderNames();
    show();
    try {
        quizzes = await (await fetch("./quiz_list.json")).json();
        $("pick_button").disabled = false;
        renderScores();
    } catch {
        $("pick_button").textContent = "Could not load questions";
    }
}

init();