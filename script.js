// --- State Management (localStorage v9) ---
let dailyTargetHours = parseFloat(localStorage.getItem('study_target_v9')) || 4;
let tasks = JSON.parse(localStorage.getItem('study_tasks_v9')) || [];
let weeklyHistory = JSON.parse(localStorage.getItem('study_weekly_v9')) || {};
let activeTaskId = null;
let timerInterval = null;
let breatheActive = false;

function persist() {
    localStorage.setItem('study_tasks_v9', JSON.stringify(tasks));
    localStorage.setItem('study_weekly_v9', JSON.stringify(weeklyHistory));
    localStorage.setItem('study_target_v9', dailyTargetHours.toString());
}

// --- Navigation ---
window.switchTab = function (tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(tab + '-section').classList.add('active');

    // Clear focus on inputs when switching
    document.querySelectorAll('input, textarea').forEach(el => el.blur());

    if (tab === 'todo') {
        checkDailyReset();
        renderTasks();
        renderWeeklyChart();
    }
}

// --- Data Handling ---
function checkDailyReset() {
    const today = new Date().toLocaleDateString();
    document.getElementById('currentDateLabel').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const lastDate = localStorage.getItem('study_last_date_v9');
    if (lastDate && lastDate !== today) {
        // Archive yesterday's total before reset
        const total = tasks.reduce((acc, t) => acc + (t.elapsed || 0), 0);
        weeklyHistory[lastDate] = total;

        // Reset daily elapsed for all tasks
        tasks = tasks.map(t => ({ ...t, elapsed: 0, lastStarted: null }));
        persist();
    }
    localStorage.setItem('study_last_date_v9', today);
}

window.addTask = function () {
    const name = document.getElementById('taskName').value;
    if (!name) return;
    const newTask = {
        id: Date.now().toString(),
        name,
        description: document.getElementById('taskDesc').value,
        budgetMinutes: parseInt(document.getElementById('taskBudget').value) || 0,
        elapsed: 0,
        createdAt: Date.now()
    };
    tasks.push(newTask);
    persist();
    renderTasks();

    // Clear inputs and hide keyboard
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskBudget').value = '';
    document.activeElement.blur();
}

window.startTaskTimer = function (id) {
    if (activeTaskId) stopTaskTimer(activeTaskId);
    activeTaskId = id;
    const t = tasks.find(x => x.id === id);
    t.lastStarted = Date.now();

    timerInterval = setInterval(() => {
        const now = Date.now();
        const delta = now - t.lastStarted;
        t.elapsed += delta;
        t.lastStarted = now;
        updateOverallStats();
        const timerEl = document.getElementById(`timer-${id}`);
        if (timerEl) timerEl.innerText = formatTime(t.elapsed);
        persist();
    }, 1000);
    renderTasks();
}

window.stopTaskTimer = function (id) {
    clearInterval(timerInterval);
    activeTaskId = null;
    persist();
    renderTasks();
    renderWeeklyChart();
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return [hrs, mins, secs].map(v => v < 10 ? '0' + v : v).join(':');
}

function updateOverallStats() {
    const total = tasks.reduce((acc, t) => acc + (t.elapsed || 0), 0);
    const targetMs = dailyTargetHours * 3600000;
    document.getElementById('overallTime').innerText = formatTime(total);
    const pct = Math.min((total / targetMs) * 100, 100);
    document.getElementById('totalProgressBar').style.width = pct + '%';

    const rem = targetMs - total;
    document.getElementById('goalRemaining').innerText = rem > 0 ? `${formatTime(rem)} left for target` : "Daily Target Smashed! 🔥";
}

// --- Visuals ---
function renderWeeklyChart() {
    const chart = document.getElementById('weeklyChart');
    chart.innerHTML = '';
    const today = new Date();
    const targetMs = dailyTargetHours * 3600000;

    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const ds = d.toLocaleDateString();
        const val = (i === 0) ? tasks.reduce((acc, t) => acc + (t.elapsed || 0), 0) : (weeklyHistory[ds] || 0);
        const pct = (val / targetMs) * 100;
        chart.insertAdjacentHTML('beforeend', `
                    <div class="chart-bar-container">
                        <div class="chart-time-label">${(val / 3600000).toFixed(1)}h</div>
                        <div class="chart-bar ${val > 0 ? 'filled' : ''} ${pct >= 100 ? 'over' : ''}" style="height: ${Math.max(4, Math.min(pct, 100))}%"></div>
                        <div class="chart-label">${d.toLocaleDateString('en-US', { weekday: 'short' })[0]}</div>
                    </div>
                `);
    }
}

window.renderTasks = function () {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    tasks.sort((a, b) => b.createdAt - a.createdAt).forEach(t => {
        const active = activeTaskId === t.id;
        const li = document.createElement('li');
        li.className = `task-item ${active ? 'active-task' : ''}`;
        li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="flex: 1; margin-right: 10px;">
                            <h3 style="margin:0; font-size:1.1rem; overflow:hidden; text-overflow:ellipsis;">${t.name}</h3>
                            <p style="margin:4px 0; font-size:0.8rem; color:var(--text-secondary); line-height: 1.2;">${t.description || 'Focus session'}</p>
                        </div>
                        <div style="display:flex;flex-direction:column;" >
                        <div> <span class="task-timer" >Time : ${t.budgetMinutes} Min</span> </div>
                         <div class="task-timer" id="timer-${t.id}">
                                              
                        ${formatTime(t.elapsed)}</div>
                        </div>
                       
                    </div>
                    <div class="task-controls">
                        ${active ? `<button class="task-btn stop-btn" onclick="stopTaskTimer('${t.id}')">PAUSE</button>` : `<button class="task-btn start-btn" onclick="startTaskTimer('${t.id}')">START</button>`}
                        <button class="task-btn delete-btn" onclick="window.deleteTask('${t.id}')">Delete</button>
                    </div>
                `;
        list.appendChild(li);
    });
    updateOverallStats();
}

window.deleteTask = function (id) {
    if (activeTaskId === id) stopTaskTimer(id);
    tasks = tasks.filter(t => t.id !== id);
    persist();
    renderTasks();
}

window.openTargetModal = () => {
    document.getElementById('newTargetInput').value = dailyTargetHours;
    document.getElementById('targetModal').style.display = 'flex';
}
window.closeTargetModal = () => { document.getElementById('targetModal').style.display = 'none'; }
window.saveNewTarget = () => {
    dailyTargetHours = parseFloat(document.getElementById('newTargetInput').value) || 4;
    document.getElementById('targetLabel').innerText = `Target: ${dailyTargetHours}h`;
    persist();
    closeTargetModal();
    updateOverallStats();
    renderWeeklyChart();
}

// --- Breathing Interaction ---
const ball = document.getElementById('ball');
const instruction = document.getElementById('instruction');
const countdown = document.getElementById('countdown');
const toggleBtn = document.getElementById('toggleBtn');

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

// --- Initial Load ---
document.getElementById('targetLabel').innerText = `Target: ${dailyTargetHours}h`;
checkDailyReset();
renderTasks();
renderWeeklyChart();