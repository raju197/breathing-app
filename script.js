// --- State (v13) ---
let dailyTargetHours = parseFloat(localStorage.getItem('study_target_v11')) || 4;
let tasks = JSON.parse(localStorage.getItem('study_tasks_v11')) || [];
let weeklyHistory = JSON.parse(localStorage.getItem('study_weekly_v11')) || {};

let activeTaskId = null;
let timerInterval = null;
let breatheActive = false;
let viewingDate = new Date().toLocaleDateString();

function persist() {
    localStorage.setItem('study_tasks_v11', JSON.stringify(tasks));
    localStorage.setItem('study_weekly_v11', JSON.stringify(weeklyHistory));
    localStorage.setItem('study_target_v11', dailyTargetHours.toString());
}

window.switchTab = function (tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(tab + '-section').classList.add('active');
    if (tab === 'todo') {
        checkDailyReset();
        viewToday();
    }
}

function checkDailyReset() {
    const today = new Date().toLocaleDateString();
    const lastDate = localStorage.getItem('study_last_date_v11');

    if (lastDate && lastDate !== today) {
        weeklyHistory[lastDate] = JSON.parse(JSON.stringify(tasks));
        const historyKeys = Object.keys(weeklyHistory).sort((a, b) => new Date(b) - new Date(a));
        if (historyKeys.length > 7) {
            historyKeys.slice(7).forEach(k => delete weeklyHistory[k]);
        }
        tasks = tasks.map(t => ({ ...t, elapsed: 0, lastStarted: null }));
        persist();
    }
    localStorage.setItem('study_last_date_v11', today);
}

window.viewToday = () => {
    viewingDate = new Date().toLocaleDateString();
    renderUI();
}

window.selectHistoryDay = (dateStr) => {
    // Stop current timer if we navigate away from Today
    if (activeTaskId) stopTaskTimer(activeTaskId);
    viewingDate = dateStr;
    renderUI();
}

function renderUI() {
    const isToday = viewingDate === new Date().toLocaleDateString();
    const historyData = weeklyHistory[viewingDate];
    const currentTasks = isToday ? tasks : (historyData || []);

    document.getElementById('inputArea').style.display = isToday ? 'block' : 'none';
    document.getElementById('historyBadge').style.display = isToday ? 'none' : 'block';
    document.getElementById('backTodayBtn').style.display = isToday ? 'none' : 'block';
    document.getElementById('currentDateLabel').innerText = isToday ? 'Today' : viewingDate;

    renderTasks(currentTasks, isToday);
    renderWeeklyChart();
    updateOverallStats(currentTasks);
}

function renderWeeklyChart() {
    const chart = document.getElementById('weeklyChart');
    chart.innerHTML = '';
    const today = new Date();
    const targetMs = dailyTargetHours * 3600000;

    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const ds = d.toLocaleDateString();
        let dayTasks = (ds === new Date().toLocaleDateString()) ? tasks : (weeklyHistory[ds] || []);
        const val = dayTasks.reduce((acc, t) => acc + (t.elapsed || 0), 0);
        const pct = (val / targetMs) * 100;
        const isActive = viewingDate === ds;

        const barHtml = `
                    <div class="chart-bar-container ${isActive ? 'active-day' : ''}" onclick="selectHistoryDay('${ds}')">
                        <div class="chart-time-label">${(val / 3600000).toFixed(1)}h</div>
                        <div class="chart-bar ${val > 0 ? 'filled' : ''} ${pct >= 100 ? 'over' : ''}" style="height: ${Math.max(4, Math.min(pct, 100))}%"></div>
                        <div class="chart-label">${d.toLocaleDateString('en-US', { weekday: 'short' })[0]}</div>
                    </div>
                `;
        chart.insertAdjacentHTML('beforeend', barHtml);
    }
}

function renderTasks(taskList, isToday) {
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    if (taskList.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">No tasks recorded for this day.</p>`;
        return;
    }

    [...taskList].sort((a, b) => b.createdAt - a.createdAt).forEach(t => {
        const active = activeTaskId === t.id;
        const budgetMs = (t.budgetMinutes || 0) * 60000;
        const progressPct = budgetMs > 0 ? Math.min((t.elapsed / budgetMs) * 100, 100) : 0;

        const li = document.createElement('li');
        li.className = `task-item ${active ? 'active-task' : ''}`;
        li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
                        <div style="flex: 1; margin-right: 12px; min-width: 0;">
                            <h3 style="margin:0; font-size:1.15rem; font-weight:800; overflow:hidden; text-overflow:ellipsis;">${t.name}</h3>
                            <p style="margin:6px 0 0 0; font-size:0.85rem; color:var(--text-secondary);">${t.description || 'Focus session'}</p>
                        </div>
                        <div style="text-align: right;">
                            <span class="task-budget-label">Target: ${t.budgetMinutes || 0}m</span>
                            <div class="task-timer" id="timer-${t.id}">${formatTime(t.elapsed)}</div>
                        </div>
                    </div>
                    
                    ${budgetMs > 0 ? `
                    <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-bottom: 4px;">
                        <div id="progress-${t.id}" style="width: ${progressPct}%; height: 100%; background: ${progressPct >= 100 ? 'var(--success)' : 'var(--accent)'}; transition: width 0.3s;"></div>
                    </div>
                    ` : ''}

                    ${isToday ? `
                    <div class="task-controls">
                        ${active ? `<button class="task-btn stop-btn" onclick="stopTaskTimer('${t.id}')">PAUSE</button>` : `<button class="task-btn start-btn" onclick="startTaskTimer('${t.id}')">START</button>`}
                        <button class="task-btn delete-btn" onclick="window.deleteTask('${t.id}')">Remove</button>
                    </div>
                    ` : ''}
                `;
        list.appendChild(li);
    });
}

window.addTask = function () {
    // Guard: Cannot add tasks to history view
    if (viewingDate !== new Date().toLocaleDateString()) return;

    const name = document.getElementById('taskName').value;
    if (!name) return;
    tasks.push({
        id: Date.now().toString(), name,
        description: document.getElementById('taskDesc').value,
        budgetMinutes: parseInt(document.getElementById('taskBudget').value) || 0,
        elapsed: 0, createdAt: Date.now()
    });
    persist();
    renderUI();
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskBudget').value = '';
}

window.startTaskTimer = function (id) {
    // Guard: Cannot start timer if viewing history
    if (viewingDate !== new Date().toLocaleDateString()) return;

    if (activeTaskId) stopTaskTimer(activeTaskId);
    activeTaskId = id;
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.lastStarted = Date.now();
    timerInterval = setInterval(() => {
        const now = Date.now();
        t.elapsed += (now - t.lastStarted);
        t.lastStarted = now;
        updateOverallStats(tasks);

        const timerEl = document.getElementById(`timer-${id}`);
        if (timerEl) timerEl.innerText = formatTime(t.elapsed);

        const progressEl = document.getElementById(`progress-${id}`);
        if (progressEl) {
            const budgetMs = (t.budgetMinutes || 0) * 60000;
            if (budgetMs > 0) {
                const pct = Math.min((t.elapsed / budgetMs) * 100, 100);
                progressEl.style.width = pct + '%';
                if (pct >= 100) progressEl.style.backgroundColor = 'var(--success)';
            }
        }
        persist();
    }, 1000);
    renderUI();
}

window.stopTaskTimer = function (id) {
    clearInterval(timerInterval);
    activeTaskId = null;
    persist();
    renderUI();
}

window.deleteTask = function (id) {
    // Guard: Cannot delete tasks if viewing history
    if (viewingDate !== new Date().toLocaleDateString()) return;

    if (activeTaskId === id) stopTaskTimer(id);
    tasks = tasks.filter(t => t.id !== id);
    persist();
    renderUI();
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v < 10 ? '0' + v : v).join(':');
}

function updateOverallStats(currentTasks) {
    const total = currentTasks.reduce((acc, t) => acc + (t.elapsed || 0), 0);
    const targetMs = dailyTargetHours * 3600000;
    document.getElementById('overallTime').innerText = formatTime(total);
    const pct = Math.min((total / targetMs) * 100, 100);
    document.getElementById('totalProgressBar').style.width = pct + '%';
    const rem = targetMs - total;
    document.getElementById('goalRemaining').innerText = rem > 0 ? `${formatTime(rem)} left to hit goal` : "Daily Goal Achieved! 🏆";
}

window.openTargetModal = () => { document.getElementById('targetModal').style.display = 'flex'; }
window.closeTargetModal = () => { document.getElementById('targetModal').style.display = 'none'; }
window.saveNewTarget = () => {
    dailyTargetHours = parseFloat(document.getElementById('newTargetInput').value) || 4;
    document.getElementById('targetLabel').innerText = `Target: ${dailyTargetHours}h`;
    persist();
    closeTargetModal();
    renderUI();
}

// --- Breathing Logic ---
const ball = document.getElementById('ball');
const instruction = document.getElementById('instruction');
const countdown = document.getElementById('countdown');
const toggleBtn = document.getElementById('toggleBtn');

async function runBreatheCycle() {
    const cycleDots = document.querySelectorAll('.dot');
    for (let i = 0; i < 4; i++) {
        if (!breatheActive) break;
        cycleDots.forEach((d, idx) => d.style.background = idx === i ? 'var(--accent)' : 'rgba(255,255,255,0.1)');
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
    document.querySelectorAll('.dot').forEach(d => d.style.background = 'rgba(255,255,255,0.1)');
}

toggleBtn.onclick = () => {
    if (breatheActive) stopBreathe();
    else { breatheActive = true; toggleBtn.innerText = "STOP"; runBreatheCycle(); }
};

document.getElementById('targetLabel').innerText = `Target: ${dailyTargetHours}h`;
checkDailyReset();
renderUI();

