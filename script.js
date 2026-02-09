// --- State ---
let dailyTargetHours = parseFloat(localStorage.getItem('study_target_v8')) || 4;
let tasks = JSON.parse(localStorage.getItem('study_tasks_v8')) || [];
let weeklyHistory = JSON.parse(localStorage.getItem('study_weekly_v8')) || {};
let activeTaskId = null;
let timerInterval = null;

// --- Navigation ---
function switchTab(tab) {
    document.getElementById('breatheTab').classList.toggle('active', tab === 'breathe');
    document.getElementById('todoTab').classList.toggle('active', tab === 'todo');
    document.getElementById('breathe-section').style.display = tab === 'breathe' ? 'flex' : 'none';
    document.getElementById('todo-section').style.display = tab === 'todo' ? 'flex' : 'none';
    if (tab === 'todo') { checkDailyReset(); renderTasks(); renderWeeklyChart(); }
}

// --- Breathing ---
const ball = document.getElementById('ball');
const instruction = document.getElementById('instruction');
const countdown = document.getElementById('countdown');
const toggleBtn = document.getElementById('toggleBtn');
let breatheActive = false;

async function runBreatheCycle() {
    const cycleDots = document.querySelectorAll('.dot');
    for (let i = 0; i < 4; i++) {
        if (!breatheActive) break;
        cycleDots.forEach((d, idx) => d.style.background = idx === i ? 'var(--accent)' : '#334155');

        instruction.innerText = "Inhale"; ball.className = "inner-circle inhale";
        await timer(4); if (!breatheActive) break;

        instruction.innerText = "Hold"; ball.className = "inner-circle hold";
        await timer(7); if (!breatheActive) break;

        instruction.innerText = "Exhale"; ball.className = "inner-circle exhale";
        await timer(8); if (!breatheActive) break;
    }
    stopBreathe();
}

function timer(sec) {
    return new Promise(r => {
        let left = sec; countdown.innerText = left;
        const int = setInterval(() => {
            left--;
            if (left <= 0 || !breatheActive) { clearInterval(int); r(); }
            else countdown.innerText = left;
        }, 1000);
    });
}

function stopBreathe() {
    breatheActive = false; toggleBtn.innerText = "START";
    instruction.innerText = "Ready?"; countdown.innerText = "";
    ball.className = "inner-circle";
    document.querySelectorAll('.dot').forEach(d => d.style.background = '#334155');
}

toggleBtn.onclick = () => {
    if (breatheActive) stopBreathe();
    else { breatheActive = true; toggleBtn.innerText = "STOP"; runBreatheCycle(); }
};

// --- Tracker ---
function checkDailyReset() {
    const today = new Date().toLocaleDateString();
    document.getElementById('currentDateLabel').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    document.getElementById('targetLabel').innerText = `Target: ${dailyTargetHours}h`;

    const lastDate = localStorage.getItem('study_last_date_v8');
    if (lastDate && lastDate !== today) {
        const total = tasks.reduce((acc, t) => acc + t.elapsed, 0);
        weeklyHistory[lastDate] = total;
        tasks.forEach(t => { t.elapsed = 0; t.lastStarted = null; });
        localStorage.setItem('study_weekly_v8', JSON.stringify(weeklyHistory));
    }
    localStorage.setItem('study_last_date_v8', today);
}

function addTask() {
    const name = document.getElementById('taskName').value;
    if (!name) return;
    tasks.push({
        id: Date.now(),
        name,
        description: document.getElementById('taskDesc').value,
        budgetMinutes: parseInt(document.getElementById('taskBudget').value) || 0,
        elapsed: 0
    });
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskBudget').value = '';
    save(); renderTasks();
}

function startTaskTimer(id) {
    if (activeTaskId) stopTaskTimer(activeTaskId);
    activeTaskId = id;
    const t = tasks.find(x => x.id === id);
    t.lastStarted = Date.now();
    timerInterval = setInterval(() => {
        const now = Date.now();
        t.elapsed += (now - t.lastStarted);
        t.lastStarted = now;
        updateOverallStats();
        const timerEl = document.getElementById(`timer-${id}`);
        if (timerEl) timerEl.innerText = formatTime(t.elapsed);
    }, 500);
    renderTasks();
}

function stopTaskTimer(id) {
    clearInterval(timerInterval);
    const t = tasks.find(x => x.id === id);
    if (t) t.lastStarted = null;
    activeTaskId = null;
    save(); renderTasks(); renderWeeklyChart();
}

function save() { localStorage.setItem('study_tasks_v8', JSON.stringify(tasks)); }

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v < 10 ? '0' + v : v).join(':');
}

function updateOverallStats() {
    const total = tasks.reduce((acc, t) => acc + t.elapsed, 0);
    const targetMs = dailyTargetHours * 3600000;
    document.getElementById('overallTime').innerText = formatTime(total);
    const pct = Math.min((total / targetMs) * 100, 100);
    document.getElementById('totalProgressBar').style.width = pct + '%';
    document.getElementById('totalProgressBar').className = pct >= 100 ? 'analytics-fill fill-complete' : 'analytics-fill';

    const rem = targetMs - total;
    document.getElementById('goalRemaining').innerText = rem > 0 ? `${formatTime(rem)} left for target` : "Daily Target Smashed! 🔥";
}

function renderWeeklyChart() {
    const chart = document.getElementById('weeklyChart');
    chart.innerHTML = '';
    const today = new Date();
    const targetMs = dailyTargetHours * 3600000;

    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const ds = d.toLocaleDateString();
        const val = (i === 0) ? tasks.reduce((acc, t) => acc + t.elapsed, 0) : (weeklyHistory[ds] || 0);
        const pct = (val / targetMs) * 100;
        chart.insertAdjacentHTML('beforeend', `
                    <div class="chart-bar-container">
                        <div class="chart-time-label">${(val / 3600000).toFixed(1)}h</div>
                        <div class="chart-bar ${val > 0 ? 'filled' : ''} ${pct >= 100 ? 'over' : ''}" style="height: ${Math.min(pct, 100)}%"></div>
                        <div class="chart-label">${d.toLocaleDateString('en-US', { weekday: 'short' })[0]}</div>
                    </div>
                `);
    }
}

function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    tasks.forEach(t => {
        const active = activeTaskId === t.id;
        const li = document.createElement('li');
        li.className = `task-item ${active ? 'active-task' : ''}`;
        li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; font-size:1.1rem;">${t.name}</h3>
                            <p style="margin:4px 0; font-size:0.8rem; color:var(--text-secondary);">${t.description || 'Focus session'}</p>
                        </div>
                        <div class="task-timer" id="timer-${t.id}">${formatTime(t.elapsed)}</div>
                    </div>
                    <div class="task-controls">
                        ${active ? `<button class="task-btn stop-btn" onclick="stopTaskTimer(${t.id})">PAUSE</button>` : `<button class="task-btn start-btn" onclick="startTaskTimer(${t.id})">START</button>`}
                        <button class="task-btn delete-btn" onclick="tasks=tasks.filter(x=>x.id!=${t.id});save();renderTasks();">Delete</button>
                    </div>
                `;
        list.appendChild(li);
    });
    updateOverallStats();
}

// --- Modal ---
function openTargetModal() { document.getElementById('targetModal').style.display = 'flex'; }
function closeTargetModal() { document.getElementById('targetModal').style.display = 'none'; }
function saveNewTarget() {
    dailyTargetHours = parseFloat(document.getElementById('newTargetInput').value) || 4;
    localStorage.setItem('study_target_v8', dailyTargetHours);
    checkDailyReset(); renderWeeklyChart(); updateOverallStats(); closeTargetModal();
}

window.onload = () => { checkDailyReset(); updateOverallStats(); renderWeeklyChart(); };
