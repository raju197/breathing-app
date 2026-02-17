// --- State ---
let dailyTargetHours = parseFloat(localStorage.getItem('study_target_v14')) || 4;
let tasks = JSON.parse(localStorage.getItem('study_tasks_v14')) || [];
let weeklyHistory = JSON.parse(localStorage.getItem('study_weekly_v14')) || {};
let dailyPlanners = JSON.parse(localStorage.getItem('study_planners_v14')) || {};
let dailyExpenses = JSON.parse(localStorage.getItem('study_expenses_v14')) || {};

let activeTaskId = null;
let timerInterval = null;
let breatheActive = false;
let viewingDate = new Date().toLocaleDateString();

function persist() {
    localStorage.setItem('study_tasks_v14', JSON.stringify(tasks));
    localStorage.setItem('study_weekly_v14', JSON.stringify(weeklyHistory));
    localStorage.setItem('study_target_v14', dailyTargetHours.toString());
    localStorage.setItem('study_planners_v14', JSON.stringify(dailyPlanners));
    localStorage.setItem('study_expenses_v14', JSON.stringify(dailyExpenses));
}

window.switchTab = function (tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(tab + '-section').classList.add('active');
    if (tab === 'todo') { checkDailyReset(); viewToday(); }
}

function checkDailyReset() {
    const today = new Date().toLocaleDateString();
    const lastDate = localStorage.getItem('study_last_date_v14');
    if (lastDate && lastDate !== today) {
        weeklyHistory[lastDate] = JSON.parse(JSON.stringify(tasks));
        tasks = tasks.map(t => ({ ...t, elapsed: 0, lastStarted: null }));
        persist();
    }
    localStorage.setItem('study_last_date_v14', today);
}

window.viewToday = () => {
    viewingDate = new Date().toLocaleDateString();
    renderUI();
    setTimeout(scrollToEnd, 50);
}

window.selectHistoryDay = (dateStr) => {
    if (activeTaskId) stopTaskTimer();
    viewingDate = dateStr;
    renderUI();
}

function renderUI() {
    const isToday = viewingDate === new Date().toLocaleDateString();
    const currentTasks = isToday ? tasks : (weeklyHistory[viewingDate] || []);

    document.getElementById('inputArea').style.display = isToday ? 'block' : 'none';
    document.getElementById('expenseInputArea').style.display = isToday ? 'grid' : 'none';
    document.getElementById('historyBadge').style.display = isToday ? 'none' : 'block';
    document.getElementById('backTodayBtn').style.display = isToday ? 'none' : 'block';

    // const dObj = new Date(viewingDate);
    // debugger
    // const viewingDate = "21/01/2026";

// Split the string by the slash
const [day, month, year] = viewingDate.split('/');

// Create the date object (Note: Month is 0-indexed, so Jan is 0)
const dObj = new Date(year, month - 1, day)
    document.getElementById('currentDateLabel').innerText = isToday ? 'Today' : dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    // Planner
    const plan = dailyPlanners[viewingDate] || { done: '', todo: '' };
    document.getElementById('planDone').value = plan.done;
    document.getElementById('planTodo').value = plan.todo;
    document.getElementById('planDone').readOnly = !isToday;
    document.getElementById('planTodo').readOnly = !isToday;

    renderTasks(currentTasks, isToday);
    renderWeeklyChart();
    updateOverallStats(currentTasks);
    renderExpenses();
}

// --- Planner Logic ---
window.savePlanner = () => {
    const today = new Date().toLocaleDateString();
    if (viewingDate !== today) return;
    dailyPlanners[today] = {
        done: document.getElementById('planDone').value,
        todo: document.getElementById('planTodo').value
    };
    persist();
}

// --- Expense Logic ---
window.addExpense = () => {
    const name = document.getElementById('expName').value;
    const amt = parseFloat(document.getElementById('expAmt').value);
    if (!name || !amt) return;

    if (!dailyExpenses[viewingDate]) dailyExpenses[viewingDate] = [];
    dailyExpenses[viewingDate].push({ id: Date.now(), name, amount: amt });

    document.getElementById('expName').value = '';
    document.getElementById('expAmt').value = '';
    persist(); renderExpenses();
}

function renderExpenses() {
    const list = document.getElementById('expenseList');
    const expData = dailyExpenses[viewingDate] || [];
    const total = expData.reduce((acc, e) => acc + e.amount, 0);

    document.getElementById('expenseTotal').innerText = `₹${total}`;
    list.innerHTML = expData.length ? '' : '<div style="color:var(--text-secondary); font-size:0.75rem; text-align:center; padding:10px;">No expenses logged.</div>';

    expData.slice().reverse().forEach(e => {
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `<span>${e.name}</span><span style="font-weight:700;">₹${e.amount}</span>`;
        list.appendChild(item);
    });
}

// --- Study Chart & Tasks ---
function renderWeeklyChart() {
    const chart = document.getElementById('weeklyChart');
    chart.innerHTML = '';
    const today = new Date();
    const targetMs = dailyTargetHours * 3600000;

    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const monthName = d.toLocaleString('en-US', { month: 'short' }); 
        const ds = d.toLocaleDateString();
        const dayTasks = (ds === new Date().toLocaleDateString()) ? tasks : (weeklyHistory[ds] || []);
        const val = dayTasks.reduce((acc, t) => acc + (t.elapsed || 0), 0);
        const pct = (val / targetMs) * 100;
        const isActive = viewingDate === ds;

        chart.insertAdjacentHTML('beforeend', `
                    <div class="chart-bar-container ${isActive ? 'active-day' : ''}" onclick="selectHistoryDay('${ds}')">
                        <div style="font-size:0.6rem; color:var(--text-secondary); height:12px;">${val > 0 ? (val / 3600000).toFixed(1) + 'h' : ''}</div>
                        <div class="chart-bar ${val > 0 ? 'filled' : ''} ${pct >= 100 ? 'over' : ''}" style="height: ${Math.max(4, Math.min(pct, 100))}%"></div>
                        <div class="chart-day-label">${d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div class="chart-date-label">${d.getDate() }${monthName}</div>
                    </div>
                `);
    }
}

function renderTasks(taskList, isToday) {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    [...taskList].sort((a, b) => b.createdAt - a.createdAt).forEach(t => {
        const active = activeTaskId === t.id;
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <div>
                            <h3 style="margin:0; font-size:1.1rem;">${t.name}</h3>
                            <p style="margin:4px 0; font-size:0.8rem; color:var(--text-secondary);">${t.description || ''}</p>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:1.4rem; color:var(--accent); font-weight:800;" id="timer-${t.id}">${formatTime(t.elapsed)}</div>
                        </div>
                    </div>
                    ${isToday ? `<div style="display:flex; gap:12px; margin-top:16px;">
                        ${active ? `<button class="task-btn stop-btn" onclick="stopTaskTimer()">STOP</button>` : `<button class="task-btn start-btn" onclick="startTaskTimer('${t.id}')">START</button>`}
                        <button class="task-btn" style="background:rgba(255,255,255,0.05); color:var(--text-secondary); flex:0.4;" onclick="deleteTask('${t.id}')">Delete</button>
                    </div>` : ''}
                `;
        list.appendChild(li);
    });
}

window.addTask = () => {
    const name = document.getElementById('taskName').value;
    if (!name) return;
    tasks.push({ id: Date.now().toString(), name, description: document.getElementById('taskDesc').value, elapsed: 0, createdAt: Date.now() });
    persist(); renderUI();
    document.getElementById('taskName').value = ''; document.getElementById('taskDesc').value = '';
}

window.startTaskTimer = (id) => {
    if (activeTaskId) stopTaskTimer();
    activeTaskId = id;
    const t = tasks.find(x => x.id === id);
    t.lastStarted = Date.now();
    timerInterval = setInterval(() => {
        const now = Date.now();
        t.elapsed += (now - t.lastStarted); t.lastStarted = now;
        const el = document.getElementById(`timer-${id}`);
        if (el) el.innerText = formatTime(t.elapsed);
        updateOverallStats(tasks);
        persist();
    }, 1000);
    renderUI();
}

window.stopTaskTimer = () => { clearInterval(timerInterval); activeTaskId = null; persist(); renderUI(); }
window.deleteTask = (id) => { if (activeTaskId === id) stopTaskTimer(); tasks = tasks.filter(x => x.id !== id); persist(); renderUI(); }

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function updateOverallStats(cur) {
    const total = cur.reduce((a, t) => a + (t.elapsed || 0), 0);
    document.getElementById('overallTime').innerText = formatTime(total);
    const targetMs = dailyTargetHours * 3600000;
    const rem = targetMs - total;
    document.getElementById('goalRemaining').innerText = rem > 0 ? `${formatTime(rem)} until goal` : "Goal Achieved! 🏆";
}

function scrollToEnd() { const w = document.getElementById('chartWrapper'); if (w) w.scrollLeft = w.scrollWidth; }
window.openTargetModal = () => document.getElementById('targetModal').style.display = 'flex';
window.closeTargetModal = () => document.getElementById('targetModal').style.display = 'none';
window.saveNewTarget = () => {
    dailyTargetHours = parseFloat(document.getElementById('newTargetInput').value) || 4;
    document.getElementById('targetLabel').innerText = `Goal: ${dailyTargetHours}h`;
    persist(); closeTargetModal(); renderUI();
}

// --- Breathe Logic ---
async function runBreathe() {
    while (breatheActive) {
        const ball = document.getElementById('ball'); const ins = document.getElementById('instruction');
        ins.innerText = "Inhale"; ball.className = "inner-circle inhale"; await timer(4); if (!breatheActive) break;
        ins.innerText = "Hold"; ball.className = "inner-circle hold"; await timer(7); if (!breatheActive) break;
        ins.innerText = "Exhale"; ball.className = "inner-circle exhale"; await timer(8); if (!breatheActive) break;
    }
}
function timer(s) {
    return new Promise(r => {
        let l = s; document.getElementById('countdown').innerText = l;
        const i = setInterval(() => {
            l--; if (l <= 0 || !breatheActive) { clearInterval(i); r(); }
            else document.getElementById('countdown').innerText = l;
        }, 1000);
    });
}
document.getElementById('toggleBtn').onclick = () => {
    if (breatheActive) {
        breatheActive = false; document.getElementById('toggleBtn').innerText = "START";
        document.getElementById('instruction').innerText = "Ready?"; document.getElementById('countdown').innerText = "";
    } else {
        breatheActive = true; document.getElementById('toggleBtn').innerText = "STOP"; runBreathe();
    }
}

renderUI();