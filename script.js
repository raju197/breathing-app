const ball = document.getElementById('ball');
const instruction = document.getElementById('instruction');
const countdown = document.getElementById('countdown');
const toggleBtn = document.getElementById('toggleBtn');
const dots = document.querySelectorAll('.dot');

let isActive = false;
let currentCycle = 0;
let timerFunc = null;

async function startExercise() {
    isActive = true;
    toggleBtn.innerText = "STOP";
    currentCycle = 0;
    runCycle();
}

function stopExercise() {
    isActive = false;
    toggleBtn.innerText = "START";
    instruction.innerText = "Ready?";
    countdown.innerText = "";
    ball.className = "inner-circle";
    dots.forEach(d => d.classList.remove('active'));
}

async function runCycle() {
    if (!isActive) return;
    if (currentCycle >= 4) {
        instruction.innerText = "Done";
        stopExercise();
        return;
    }

    dots.forEach((d, i) => {
        d.classList.toggle('active', i === currentCycle);
    });

    // INHALE
    instruction.innerText = "Inhale";
    ball.className = "inner-circle inhale";
    await startTimer(4);
    if (!isActive) return;

    // HOLD
    instruction.innerText = "Hold";
    ball.className = "inner-circle hold";
    await startTimer(7);
    if (!isActive) return;

    // EXHALE
    instruction.innerText = "Exhale";
    ball.className = "inner-circle exhale";
    await startTimer(8);
    if (!isActive) return;

    currentCycle++;
    runCycle();
}

function startTimer(seconds) {
    return new Promise((resolve) => {
        let timeLeft = seconds;
        countdown.innerText = timeLeft;

        const interval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0 || !isActive) {
                clearInterval(interval);
                resolve();
            } else {
                countdown.innerText = timeLeft;
            }
        }, 1000);
    });
}

toggleBtn.addEventListener('click', () => {
    if (isActive) {
        stopExercise();
    } else {
        startExercise();
    }
});
