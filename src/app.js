
const $ = (id) => document.getElementById(id);

const appMeta = {
  launch:{title:'Launchpad', icon:'launch'},
  todo:{title:'Todo', icon:'todo'},
  focus:{title:'Focus', icon:'focus'},
  study:{title:'Study', icon:'study'},
  notepad:{title:'Notepad', icon:'notepad'},
  paint:{title:'Paint', icon:'paint'},
  assistant:{title:'Assistant', icon:'assistant'},
  imagestudio:{title:'Image Studio', icon:'imagestudio'},
  calculator:{title:'Calculator', icon:'calculator'},
  clockapp:{title:'Clock', icon:'clockapp'},
  weather:{title:'Weather', icon:'weather'},
  aimode:{title:'AI Mind', icon:'assistant'},
  settings:{title:'Settings', icon:'settings'},
  quicktools:{title:'Quick Tools', icon:'quicktools'},
  water:{title:'Water Intake', icon:'water'},
  workout:{title:'AI Workout Trainer', icon:'workout'}
};

const state = {
  windows:{},
  z:20,
  todos: JSON.parse(localStorage.getItem('akaora.todos') || '[]'),
  water: JSON.parse(localStorage.getItem('akaora.water') || '{"amount":0,"goal":3000}'),
  notes: localStorage.getItem('akaora.notepad.html') || '',
  noteTitle: localStorage.getItem('akaora.notepad.title') || 'Untitled Note',
  focusSeconds: 25 * 60,
  focusMode: 'Pomodoro',
  focusTimer: null
};

function boot(){
  setTimeout(() => {
    $('boot')?.classList.add('hidden');
    $('os')?.classList.remove('hidden');
  }, 450);
  playBootSound();
  updateClock();
  setInterval(updateClock, 1000);
  bindLaunchers();
  initTopMenus();
  updateWidgets();
}

function updateClock(){
  const now = new Date();
  const time = now.toLocaleTimeString([], {hour12:false});
  const date = now.toLocaleDateString([], {weekday:'short', day:'numeric', month:'short'});
  if($('menuClock')) $('menuClock').textContent = time;
  if($('centerDesktopClock')) $('centerDesktopClock').textContent = time;
  if($('menuDate')) $('menuDate').textContent = date;
  if($('widgetDate')) $('widgetDate').textContent = now.toLocaleDateString([], {weekday:'long', day:'numeric', month:'long'});
}

function bindLaunchers(){
  document.querySelectorAll('[data-app]').forEach(btn => btn.onclick = () => openApp(btn.dataset.app));
  document.querySelectorAll('[data-widget-app]').forEach(btn => btn.onclick = () => openApp(btn.dataset.widgetApp));
  const force = $('forceQuitBtn');
  if(force) force.onclick = forceQuitAll;
}

function openUrl(url){
  if(window.akaora && window.akaora.openExternal) window.akaora.openExternal(url);
  else window.open(url, '_blank');
}

function openApp(app){
  if(!appMeta[app]) return;
  if(state.windows[app]){
    const existing = state.windows[app];
    existing.classList.remove('minimized');
    existing.style.display = 'block';
    focusWindow(app);
    return;
  }
  const layer = $('windowLayer');
  if(!layer) return;

  const win = document.createElement('section');
  win.className = 'app-window';
  win.dataset.appWindow = app;
  const offset = Object.keys(state.windows).length;
  win.style.left = (60 + (offset * 26) % 220) + 'px';
  win.style.top = (60 + (offset * 22) % 140) + 'px';
  win.style.zIndex = ++state.z;
  setDefaultSize(win, app);
  win.innerHTML = `
    <header class="window-head">
      <div class="window-controls">
        <button class="control-btn control-close"></button>
        <button class="control-btn control-min"></button>
        <button class="control-btn control-max"></button>
      </div>
      <div class="window-title"><img src="assets/${appMeta[app].icon}.png" alt="">${appMeta[app].title}</div>
      <div></div>
    </header>
    <div class="window-body">${renderApp(app)}</div>
    <div class="resize-grip"></div>
  `;
  layer.appendChild(win);
  state.windows[app] = win;
  bindControls(app, win);
  makeDraggable(win);
  bindResize(win);
  bindApp(app, win);
  focusWindow(app);
}

function setDefaultSize(win, app){
  const sizes = {
    calculator:['360px','560px'],
    paint:['980px','650px'],
    imagestudio:['1120px','760px'],
    study:['980px','680px'],
    settings:['980px','680px'],
    notepad:['940px','660px'],
    todo:['720px','560px'],
    assistant:['620px','560px']
  };
  const s = sizes[app] || ['720px','520px'];
  win.style.setProperty('--win-w', s[0]);
  win.style.setProperty('--win-h', s[1]);
}

function focusWindow(app){
  const win = state.windows[app];
  if(!win) return;
  win.style.zIndex = ++state.z;
  document.querySelectorAll('.dock-item').forEach(d => d.classList.toggle('active', d.dataset.app === app));
}

function bindControls(app, win){
  win.querySelector('.control-close').onclick = () => {
    win.remove();
    delete state.windows[app];
  };
  win.querySelector('.control-min').onclick = () => win.style.display = 'none';
  win.querySelector('.control-max').onclick = () => {
    win.classList.toggle('maximized');
    if(app === 'paint') setTimeout(() => resizePaintCanvas(win), 100);
  };
}

function makeDraggable(win){
  const head = win.querySelector('.window-head');
  let drag = null;
  head.onmousedown = (e) => {
    if(win.classList.contains('maximized')) return;
    drag = {x:e.clientX,y:e.clientY,left:parseFloat(win.style.left)||0,top:parseFloat(win.style.top)||0};
    focusWindow(win.dataset.appWindow);
  };
  window.addEventListener('mousemove', e => {
    if(!drag) return;
    win.style.left = Math.max(0, drag.left + e.clientX - drag.x) + 'px';
    win.style.top = Math.max(0, drag.top + e.clientY - drag.y) + 'px';
  });
  window.addEventListener('mouseup', () => drag = null);
}

function bindResize(win){
  const grip = win.querySelector('.resize-grip');
  let active = null;
  grip.onmousedown = (e) => {
    if(win.classList.contains('maximized')) return;
    e.preventDefault();
    e.stopPropagation();
    active = {x:e.clientX,y:e.clientY,w:win.offsetWidth,h:win.offsetHeight};
    document.body.style.userSelect = 'none';
  };
  window.addEventListener('mousemove', e => {
    if(!active) return;
    const w = Math.max(360, Math.min(window.innerWidth - 20, active.w + e.clientX - active.x));
    const h = Math.max(280, Math.min(window.innerHeight - 70, active.h + e.clientY - active.y));
    win.style.setProperty('--win-w', w + 'px');
    win.style.setProperty('--win-h', h + 'px');
    if(win.dataset.appWindow === 'paint') resizePaintCanvas(win);
  });
  window.addEventListener('mouseup', () => {
    active = null;
    document.body.style.userSelect = '';
  });
}

function renderApp(app){
  if(app === 'launch'){
    const apps = ['todo','focus','water','workout','study','notepad','paint','assistant','aimode','imagestudio','clockapp','weather','calculator','quicktools','settings'];
    return `<div class="launch-grid">${apps.map(a => `<button data-launch-app="${a}"><img src="assets/${appMeta[a].icon}.png"><span>${appMeta[a].title}</span></button>`).join('')}</div>`;
  }
  if(app === 'todo'){
    return `<div class="todo-app-clean">
      <div class="todo-top"><input id="todoText" placeholder="Add a new task"><select id="todoPriority"><option>High</option><option selected>Medium</option><option>Low</option></select><button class="primary" id="addTodo">Add Task</button></div>
      <div class="todo-summary"><div class="todo-stat"><strong id="todoTotal">0</strong><span>Total</span></div><div class="todo-stat"><strong id="todoActive">0</strong><span>Active</span></div><div class="todo-stat"><strong id="todoDone">0</strong><span>Done</span></div></div>
      <div class="todo-grid" id="todoList"></div>
    </div>`;
  }
  if(app === 'focus'){
    return `<div class="focus-app-pro">
      <div class="focus-hero">
        <div class="focus-orbit">
          <div class="focus-core">
            <strong id="focusDisplay">${formatTime(state.focusSeconds)}</strong>
            <span id="focusAppMode">${state.focusMode}</span>
          </div>
        </div>
      </div>

      <div class="focus-modes">
        <button data-mode="Pomodoro" data-min="25">Pomodoro</button>
        <button data-mode="Deep Work" data-min="45">Deep Work</button>
        <button data-mode="Study" data-min="60">Study</button>
        <button data-mode="Break" data-min="5">Break</button>
      </div>

      <div class="custom-timer">
        <input id="customMinutes" type="number" min="1" placeholder="Minutes">
        <input id="customMode" placeholder="Custom mode">
        <button id="setCustomTimer">Set</button>
      </div>

      <div class="focus-actions">
        <button class="primary" id="focusStart">Start</button>
        <button id="focusPause">Pause</button>
        <button id="focusReset">Reset</button>
      </div>
    </div>`;
  }
  if(app === 'water'){
    return `<div class="water-app-pro">
      <div class="water-hero">
        <div class="water-glass-big"><i id="waterFillBig"></i></div>
        <div>
          <span>WATER INTAKE</span>
          <strong id="waterAmountBig">${state.water.amount}ml</strong>
          <p>Goal: <b id="waterGoalBig">${state.water.goal}ml</b></p>
          <div class="water-progress"><i id="waterProgressBar"></i></div>
        </div>
      </div>

      <div class="water-actions">
        <button data-water-add="100">+100ml</button>
        <button data-water-add="250">+250ml</button>
        <button data-water-add="500">+500ml</button>
        <button data-water-add="750">+750ml</button>
      </div>

      <div class="water-settings">
        <input id="waterGoalInput" type="number" value="${state.water.goal}" placeholder="Daily goal ml">
        <button class="primary" id="setWaterGoal">Set Goal</button>
        <button id="resetWaterToday">Reset Today</button>
      </div>

      <div class="water-tip" id="waterTip">Tip: Drink water before you feel thirsty.</div>
    </div>`;
  }

  if(app === 'workout'){
    return `<div class="workout-app">
      <div class="workout-hero">
        <div>
          <span>AI WORKOUT TRAINER</span>
          <strong id="workoutTitle">Build your custom workout</strong>
          <p id="workoutSubtitle">Choose your goal and generate a plan.</p>
        </div>
        <div class="workout-badge">AI</div>
      </div>

      <div class="workout-controls">
        <select id="workoutGoal">
          <option value="muscle">Build Muscle</option>
          <option value="fatloss">Fat Loss</option>
          <option value="strength">Strength</option>
          <option value="home">Home Workout</option>
          <option value="mobility">Mobility</option>
        </select>
        <select id="workoutLevel">
          <option>Beginner</option>
          <option selected>Intermediate</option>
          <option>Advanced</option>
        </select>
        <input id="workoutMinutes" type="number" value="45" placeholder="Minutes">
        <button class="primary" id="generateWorkout">Generate</button>
      </div>

      <div class="workout-grid">
        <div class="workout-plan" id="workoutPlan"></div>
        <div class="workout-coach">
          <h3>AI Coach</h3>
          <div id="coachMessage">Ready when you are.</div>
          <button id="nextWorkoutTip">New Tip</button>
          <button id="startWorkoutTimer">Start Timer</button>
          <strong id="workoutTimer">00:00</strong>
        </div>
      </div>
    </div>`;
  }

  if(app === 'study'){
    return `<div class="study-pro"><aside class="study-sidebar"><button class="study-tab active" data-tab="library">Library</button><button class="study-tab" data-tab="notes">Notes</button><button class="study-tab" data-tab="flashcards">Flashcards</button><button class="study-tab" data-tab="progress">Progress</button></aside><main class="study-main"><section class="study-panel active" id="study-library"><div class="study-toolbar"><input type="file" id="studyFile" accept=".txt,.md,.pdf,.mp4,.webm,.mp3,.wav,.ogg"><button id="studyClearViewer">Clear</button></div><div class="study-viewer" id="studyViewer">Add study material.</div></section><section class="study-panel" id="study-notes"><div class="study-toolbar"><button class="primary" id="saveStudyNotes">Save</button><button id="downloadStudyNotes">Download</button></div><textarea id="studyNotesArea" class="note-editor"></textarea></section><section class="study-panel" id="study-flashcards"><div class="todo-top"><input id="flashQ" placeholder="Question"><input id="flashA" placeholder="Answer"><button class="primary" id="addFlashcard">Add</button></div><div id="flashcardList"></div></section><section class="study-panel" id="study-progress"><div class="todo-summary"><div class="todo-stat"><strong id="studyMinutes">0</strong><span>Minutes</span></div><div class="todo-stat"><strong id="studyFiles">0</strong><span>Files</span></div><div class="todo-stat"><strong id="studyBookmarks">0</strong><span>Bookmarks</span></div></div></section></main></div>`;
  }
  if(app === 'notepad'){
    return `<div class="notepad-pro"><div class="note-toolbar"><input id="noteTitle" value="${escapeHtml(state.noteTitle)}"><select id="noteFont"><option>Inter</option><option>Arial</option><option>Georgia</option><option>Courier New</option></select><select id="noteSize"><option>14</option><option selected>16</option><option>18</option><option>22</option><option>28</option></select><button data-note-style="bold"><b>B</b></button><button data-note-style="italic"><i>I</i></button><button data-note-style="underline"><u>U</u></button><input type="color" id="noteColor" value="#ffffff"><button class="primary" id="saveNoteBtn">Save</button><button id="downloadNoteBtn">Download</button><button id="clearNoteBtn">Clear</button></div><div id="notepadArea" class="note-editor" contenteditable="true">${state.notes}</div></div>`;
  }
  if(app === 'paint'){
    return `<div class="paint-shell"><div class="paint-toolbar"><button id="paintBrush" class="active-tool">Brush</button><button id="paintEraser">Eraser</button><button id="paintLine">Line</button><button id="paintRect">Rect</button><button id="paintCircle">Circle</button><input id="paintColor" type="color" value="#0a84ff"><input id="paintSize" type="range" min="2" max="40" value="8"><button id="paintUndo">Undo</button><button id="paintClear">Clear</button><button class="primary" id="paintSave">Save</button></div><div class="paint-stage"><canvas id="paintCanvas"></canvas></div></div>`;
  }
  if(app === 'assistant'){
    return `<div class="chat-box" id="chatBox"><div class="msg bot">Ask me about focus, study, tasks, or Akaora OS.</div></div><div class="row"><input id="chatInput" placeholder="Ask something..."><button class="primary" id="sendChat">Send</button></div>`;
  }
  if(app === 'imagestudio'){
    return `<div class="image-studio"><aside class="image-studio-sidebar"><div class="control-card"><label>Upload Image</label><input type="file" id="studioUpload" accept="image/*"></div><button class="primary" id="studioRemoveBg">Remove BG</button><div class="control-card"><label>Background</label><div class="row"><button data-bg="transparent">Transparent</button><button data-bg="#ffffff">White</button><button data-bg="#000000">Black</button></div></div><div class="control-card"><label>Resize</label><input id="resizeW" type="number" placeholder="Width"><input id="resizeH" type="number" placeholder="Height"><button id="studioApplyResize">Resize</button></div><button id="studioEnhance">Enhance</button><button id="studioDownloadPng">PNG</button><button id="studioDownloadJpg">JPG</button></aside><main class="image-studio-main"><div class="studio-topbar"><strong>Akaora Image Studio</strong><span id="studioStatus">Professional image editor</span></div><div class="studio-workspace" id="studioWorkspace">Upload image</div></main></div>`;
  }
  if(app === 'clockapp'){
    return `<div class="clock-app">
      <aside class="clock-sidebar">
        <button class="clock-tab active" data-clock-tab="clock">Clock</button>
        <button class="clock-tab" data-clock-tab="alarm">Alarm</button>
        <button class="clock-tab" data-clock-tab="timer">Timer</button>
        <button class="clock-tab" data-clock-tab="world">World Clock</button>
      </aside>
      <main>
        <section class="clock-panel active" id="clock-clock">
          <div class="clock-big"><div><strong id="clockNow">00:00:00</strong><p id="clockDate">Today</p></div></div>
        </section>
        <section class="clock-panel" id="clock-alarm">
          <div class="alarm-row"><input type="time" id="alarmTime"><button class="primary" id="setAlarmBtn">Set Alarm</button></div>
          <div class="clock-list" id="alarmList"></div>
        </section>
        <section class="clock-panel" id="clock-timer">
          <div class="clock-big"><div><strong id="clockTimerDisplay">05:00</strong><p>Timer</p></div></div>
          <div class="clock-controls"><input type="number" id="clockTimerMin" placeholder="Minutes" value="5"><button class="primary" id="clockTimerStart">Start</button><button id="clockTimerPause">Pause</button><button id="clockTimerReset">Reset</button><button id="clockTimerPopout">Popout</button></div>
        </section>
        <section class="clock-panel" id="clock-world">
          <div class="clock-list" id="worldClockList"></div>
        </section>
      </main>
    </div>`;
  }

  if(app === 'aimode'){
    return `<div class="ai-mind-app">
      <div class="mind-hero">
        <span>AI MIND MODE</span>
        <strong id="mindThought">Discipline is choosing what you want most over what you want now.</strong>
        <p>Infinite motivational and productivity thoughts.</p>
      </div>

      <div class="mind-actions">
        <button class="primary" id="newThoughtBtn">New Thought</button>
        <button id="copyThoughtBtn">Copy</button>
        <button id="speakThoughtBtn">Speak</button>
      </div>

      <div class="mind-grid">
        <div class="mind-card">
          <h3>Focus</h3>
          <p id="focusQuoteMini">Small steps every day create massive results.</p>
        </div>
        <div class="mind-card">
          <h3>Growth</h3>
          <p id="growthQuoteMini">Your future is built by your habits.</p>
        </div>
      </div>
    </div>`;
  }

  if(app === 'weather'){
    return `<div class="weather-app">
      <div class="weather-hero">
        <div>
          <p>Current Weather</p>
          <div class="weather-temp">28°C</div>
          <strong>Haldwani, India</strong>
          <p>Partly cloudy • Offline preview</p>
        </div>
        <div class="weather-icon">⛅</div>
      </div>
      <div class="weather-grid">
        <div class="weather-card"><strong>Humidity</strong><p>62%</p></div>
        <div class="weather-card"><strong>Wind</strong><p>9 km/h</p></div>
        <div class="weather-card"><strong>Feels Like</strong><p>30°C</p></div>
        <div class="weather-card"><strong>UV Index</strong><p>Moderate</p></div>
      </div>
      <div class="forecast-row">
        <div class="forecast-day"><strong>Today</strong><p>⛅ 28°</p></div>
        <div class="forecast-day"><strong>Sat</strong><p>☀️ 31°</p></div>
        <div class="forecast-day"><strong>Sun</strong><p>🌦️ 29°</p></div>
        <div class="forecast-day"><strong>Mon</strong><p>☁️ 27°</p></div>
        <div class="forecast-day"><strong>Tue</strong><p>☀️ 30°</p></div>
      </div>
    </div>`;
  }

  if(app === 'calculator'){
    const keys = [
      ['AC','clear','top'], ['±','sign','top'], ['%','percent','top'], ['÷','/','op'],
      ['7','7',''], ['8','8',''], ['9','9',''], ['×','*','op'],
      ['4','4',''], ['5','5',''], ['6','6',''], ['−','-','op'],
      ['1','1',''], ['2','2',''], ['3','3',''], ['+','+','op'],
      ['0','0','zero'], ['.','.',''], ['=','=','op']
    ];
    return `<div class="calc-shell"><div class="calc-display" id="calcDisplay">0</div><div class="calc-grid">${keys.map(k => `<button data-calc="${k[1]}" class="${k[2]}">${k[0]}</button>`).join('')}</div></div>`;
  }
  if(app === 'quicktools'){
    return `<div class="quick-tools">
      <div class="tool-card">
        <h3>Password Generator</h3>
        <button class="primary" id="genPassword">Generate</button>
        <div class="tool-result" id="passwordResult">Click generate</div>
      </div>
      <div class="tool-card">
        <h3>Word Counter</h3>
        <textarea id="wordText" placeholder="Type or paste text"></textarea>
        <div class="tool-result" id="wordResult">0 words • 0 characters</div>
      </div>
      <div class="tool-card">
        <h3>Color Picker</h3>
        <input type="color" id="quickColor" value="#0a84ff">
        <div class="tool-result" id="colorResult">#0a84ff</div>
      </div>
      <div class="tool-card">
        <h3>Text Case</h3>
        <input id="caseInput" placeholder="Enter text">
        <button id="upperCaseBtn">UPPERCASE</button>
        <button id="lowerCaseBtn">lowercase</button>
        <div class="tool-result" id="caseResult"></div>
      </div>
    </div>`;
  }
  if(app === 'settings'){
    return `<div class="settings-pro"><aside class="settings-sidebar"><button class="settings-tab active" data-tab="appearance">Appearance</button><button class="settings-tab" data-tab="system">System</button><button class="settings-tab" data-tab="about">About</button></aside><main class="settings-main"><section class="settings-panel active" id="settings-appearance"><div class="settings-card"><h3>Theme</h3><button id="lightThemeBtn">Light</button><button class="primary" id="darkThemeBtn">Dark</button></div><div class="settings-card"><h3>UI Scale</h3><input type="range" id="uiScaleRange" min="85" max="115" value="100"></div></section><section class="settings-panel" id="settings-system"><div class="settings-card"><h3>Performance</h3><label><input type="checkbox" id="reduceMotion"> Reduce animations</label></div></section><section class="settings-panel" id="settings-about"><div class="settings-card"><h2>Akaora OS</h2><p><strong>Developed By Akshay Goyal</strong></p><p>Productivity workspace for focus, study and execution.</p></div></section></main></div>`;
  }
  return `<div class="file-card">${appMeta[app].title} is ready.</div>`;
}

function bindApp(app, win){
  if(app === 'launch') win.querySelectorAll('[data-launch-app]').forEach(b => b.onclick = () => openApp(b.dataset.launchApp));
  if(app === 'todo') bindTodo(win);
  if(app === 'focus') bindFocus(win);
  if(app === 'water') bindWaterApp(win);
  if(app === 'workout') bindWorkoutTrainer(win);
  if(app === 'study') bindStudy(win);
  if(app === 'notepad') bindNotepad(win);
  if(app === 'paint') bindPaint(win);
  if(app === 'assistant') bindAssistant(win);
  if(app === 'aimode') bindAIMode(win);
  if(app === 'imagestudio') bindImageStudio(win);
  if(app === 'clockapp') bindClockApp(win);
  if(app === 'weather') bindWeatherApp(win);
  if(app === 'calculator') bindCalculator(win);
  if(app === 'quicktools') bindQuickTools(win);
  if(app === 'settings') bindSettings(win);
}

function bindTodo(win){
  const render = () => {
    const total = state.todos.length, done = state.todos.filter(t=>t.done).length, active = total - done;
    win.querySelector('#todoTotal').textContent = total;
    win.querySelector('#todoActive').textContent = active;
    win.querySelector('#todoDone').textContent = done;
    const list = win.querySelector('#todoList');
    list.innerHTML = total ? state.todos.map((t,i)=>`<div class="todo-item ${t.done?'done':''}"><input type="checkbox" ${t.done?'checked':''} data-check="${i}"><div><div class="todo-title">${escapeHtml(t.text)}</div><small>${t.priority}</small></div><button data-del="${i}">Delete</button></div>`).join('') : '<div class="file-card">No tasks yet.</div>';
    list.querySelectorAll('[data-check]').forEach(b => b.onchange = () => { state.todos[b.dataset.check].done = b.checked;
      if(b.checked){
        showNotification('Task Completed', state.todos[b.dataset.check].text);
      }
      saveTodos(); render(); updateWidgets(); });
    list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { state.todos.splice(Number(b.dataset.del),1); saveTodos(); render(); updateWidgets(); });
  };
  win.querySelector('#addTodo').onclick = () => {
    const input = win.querySelector('#todoText');
    if(!input.value.trim()) return;
    state.todos.push({text:input.value.trim(), priority:win.querySelector('#todoPriority').value, done:false});
    input.value = '';
    saveTodos(); render(); updateWidgets();
  };
  win.querySelector('#todoText').onkeydown = e => { if(e.key === 'Enter') win.querySelector('#addTodo').click(); };
  render();
}

function bindFocus(win){
  win.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setFocus(Number(b.dataset.min), b.dataset.mode, win));
  win.querySelector('#setCustomTimer').onclick = () => setFocus(Number(win.querySelector('#customMinutes').value)||25, win.querySelector('#customMode').value||'Custom', win);
  win.querySelector('#focusStart').onclick = startFocus;
  win.querySelector('#focusPause').onclick = pauseFocus;
  win.querySelector('#focusReset').onclick = () => setFocus(25, 'Pomodoro', win);
}


function bindWaterApp(win){
  const tips = [
    'Drink one glass after waking up.',
    'Keep a bottle near your desk.',
    'Drink water before meals.',
    'Small sips all day beat drinking too much at once.',
    'Hydration improves focus and workout performance.'
  ];

  const update = () => {
    const pct = Math.min(100, (state.water.amount / state.water.goal) * 100);
    win.querySelector('#waterAmountBig').textContent = state.water.amount + 'ml';
    win.querySelector('#waterGoalBig').textContent = state.water.goal + 'ml';
    win.querySelector('#waterFillBig').style.height = pct + '%';
    win.querySelector('#waterProgressBar').style.width = pct + '%';
    updateWidgets();
    localStorage.setItem('akaora.water', JSON.stringify(state.water));

    if(state.water.amount >= state.water.goal){
      showNotification('Water Goal Completed', 'You reached your daily hydration goal.');
    }
  };

  win.querySelectorAll('[data-water-add]').forEach(btn => {
    btn.onclick = () => {
      state.water.amount += Number(btn.dataset.waterAdd);
      win.querySelector('#waterTip').textContent = tips[Math.floor(Math.random()*tips.length)];
      update();
    };
  });

  win.querySelector('#setWaterGoal').onclick = () => {
    const goal = Number(win.querySelector('#waterGoalInput').value);
    if(goal > 0) state.water.goal = goal;
    update();
  };

  win.querySelector('#resetWaterToday').onclick = () => {
    state.water.amount = 0;
    update();
  };

  update();
}

function bindWorkoutTrainer(win){
  const plans = {
    muscle:['Push-ups / Bench Press - 4 sets','Rows - 4 sets','Squats - 4 sets','Shoulder Press - 3 sets','Biceps + Triceps - 3 sets','Core finisher - 5 min'],
    fatloss:['Jumping Jacks - 3 min','Bodyweight Squats - 4 sets','Mountain Climbers - 4 sets','Burpees - 3 sets','Fast Walk / Jog - 15 min','Stretching - 5 min'],
    strength:['Heavy Squat - 5 sets','Deadlift Pattern - 4 sets','Press - 4 sets','Pull Movement - 4 sets','Farmer Carry - 4 rounds','Core Brace - 5 min'],
    home:['Push-ups - 4 sets','Chair Dips - 3 sets','Lunges - 4 sets','Plank - 4 rounds','Superman Hold - 3 sets','Mobility - 5 min'],
    mobility:['Neck Rolls - 2 min','Shoulder Circles - 2 min','Hip Openers - 5 min','Hamstring Stretch - 4 min','Deep Squat Hold - 3 min','Breathing - 3 min']
  };

  const tips = [
    'Control the movement. Quality beats ego.',
    'Rest 60–90 seconds between sets.',
    'Progress slowly every week.',
    'Warm up before training heavy.',
    'Protein, sleep, and consistency build the body.',
    'Track your reps to beat your last session.',
    'Stop if pain feels sharp or unsafe.'
  ];

  let timer = null;
  let seconds = 0;

  const renderPlan = () => {
    const goal = win.querySelector('#workoutGoal').value;
    const level = win.querySelector('#workoutLevel').value;
    const minutes = Number(win.querySelector('#workoutMinutes').value) || 45;
    const list = plans[goal] || plans.muscle;

    win.querySelector('#workoutTitle').textContent = `${level} ${goal.toUpperCase()} Plan`;
    win.querySelector('#workoutSubtitle').textContent = `${minutes} minute session`;
    win.querySelector('#workoutPlan').innerHTML = list.map((x,i)=>`
      <div class="exercise-card">
        <b>${String(i+1).padStart(2,'0')}</b>
        <span>${x}</span>
      </div>
    `).join('');

    win.querySelector('#coachMessage').textContent = tips[Math.floor(Math.random()*tips.length)];
  };

  win.querySelector('#generateWorkout').onclick = renderPlan;
  win.querySelector('#nextWorkoutTip').onclick = () => {
    win.querySelector('#coachMessage').textContent = tips[Math.floor(Math.random()*tips.length)];
  };

  win.querySelector('#startWorkoutTimer').onclick = () => {
    if(timer){
      clearInterval(timer);
      timer = null;
      win.querySelector('#startWorkoutTimer').textContent = 'Start Timer';
      return;
    }
    timer = setInterval(()=>{
      seconds++;
      win.querySelector('#workoutTimer').textContent = formatTime(seconds);
    },1000);
    win.querySelector('#startWorkoutTimer').textContent = 'Pause Timer';
  };

  renderPlan();
}

function bindStudy(win){
  win.querySelectorAll('.study-tab').forEach(tab => tab.onclick = () => {
    win.querySelectorAll('.study-tab').forEach(t=>t.classList.remove('active'));
    win.querySelectorAll('.study-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    win.querySelector('#study-' + tab.dataset.tab).classList.add('active');
  });
  const viewer = win.querySelector('#studyViewer');
  win.querySelector('#studyFile').onchange = async e => {
    const file = e.target.files[0]; if(!file) return;
    const url = URL.createObjectURL(file);
    if(file.type.startsWith('video/')) viewer.innerHTML = `<video src="${url}" controls></video>`;
    else if(file.type.startsWith('audio/')) viewer.innerHTML = `<audio src="${url}" controls></audio>`;
    else if(file.type === 'application/pdf' || file.name.endsWith('.pdf')) viewer.innerHTML = `<iframe src="${url}"></iframe>`;
    else if(file.name.endsWith('.txt') || file.name.endsWith('.md')) viewer.textContent = await file.text();
    else viewer.textContent = file.name + ' added.';
  };
  win.querySelector('#studyClearViewer').onclick = () => viewer.textContent = 'Add study material.';
  win.querySelector('#saveStudyNotes').onclick = () => localStorage.setItem('akaora.study.notes', win.querySelector('#studyNotesArea').value);
  win.querySelector('#downloadStudyNotes').onclick = () => downloadText('study-notes.txt', win.querySelector('#studyNotesArea').value);
  win.querySelector('#addFlashcard').onclick = () => {
    const list = win.querySelector('#flashcardList');
    const q = win.querySelector('#flashQ').value, a = win.querySelector('#flashA').value;
    if(q && a) list.innerHTML += `<div class="file-card"><strong>${escapeHtml(q)}</strong><p>${escapeHtml(a)}</p></div>`;
  };
}

function bindNotepad(win){
  const editor = win.querySelector('#notepadArea');
  const title = win.querySelector('#noteTitle');
  win.querySelector('#noteFont').onchange = e => editor.style.fontFamily = e.target.value;
  win.querySelector('#noteSize').onchange = e => editor.style.fontSize = e.target.value + 'px';
  win.querySelector('#noteColor').oninput = e => editor.style.color = e.target.value;
  win.querySelectorAll('[data-note-style]').forEach(b => b.onclick = () => document.execCommand(b.dataset.noteStyle, false, null));
  win.querySelector('#saveNoteBtn').onclick = () => { localStorage.setItem('akaora.notepad.html', editor.innerHTML); localStorage.setItem('akaora.notepad.title', title.value); };
  win.querySelector('#downloadNoteBtn').onclick = () => downloadText((title.value || 'note') + '.html', editor.innerHTML);
  win.querySelector('#clearNoteBtn').onclick = () => editor.innerHTML = '';
}

function bindPaint(win){
  const canvas = win.querySelector('#paintCanvas');
  const ctx = canvas.getContext('2d');
  let drawing = false, tool = 'brush', history = [];
  const resize = () => {
    const stage = win.querySelector('.paint-stage'), old = document.createElement('canvas');
    old.width = canvas.width || 1; old.height = canvas.height || 1;
    if(canvas.width) old.getContext('2d').drawImage(canvas,0,0);
    canvas.width = Math.max(500, stage.clientWidth); canvas.height = Math.max(300, stage.clientHeight);
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    if(old.width > 1) ctx.drawImage(old,0,0,canvas.width,canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };
  canvas._resize = resize; setTimeout(resize, 50);
  const pos = e => { const r = canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*(canvas.width/r.width), y:(e.clientY-r.top)*(canvas.height/r.height)}; };
  canvas.onmousedown = e => { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  canvas.onmousemove = e => { if(!drawing) return; const p = pos(e); ctx.lineWidth = win.querySelector('#paintSize').value; ctx.strokeStyle = tool==='eraser'?'#fff':win.querySelector('#paintColor').value; ctx.lineTo(p.x,p.y); ctx.stroke(); };
  window.addEventListener('mouseup', () => { if(drawing) history.push(canvas.toDataURL()); drawing = false; });
  win.querySelector('#paintBrush').onclick = () => tool = 'brush';
  win.querySelector('#paintEraser').onclick = () => tool = 'eraser';
  win.querySelector('#paintClear').onclick = () => { ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); };
  win.querySelector('#paintUndo').onclick = () => { const url = history.pop(); if(url){ const img = new Image(); img.onload=()=>ctx.drawImage(img,0,0); img.src=url; } };
  win.querySelector('#paintSave').onclick = () => downloadUrl('akaora-paint.png', canvas.toDataURL('image/png'));
}

function resizePaintCanvas(win){ const c = win.querySelector('#paintCanvas'); if(c && c._resize) c._resize(); }

function bindAssistant(win){
  const input = win.querySelector('#chatInput'), box = win.querySelector('#chatBox');
  win.querySelector('#sendChat').onclick = () => {
    const q = input.value.trim(); if(!q) return;
    box.innerHTML += `<div class="msg user">${escapeHtml(q)}</div>`;
    box.innerHTML += `<div class="msg bot">${escapeHtml(assistantReply(q))}</div>`;
    input.value = ''; box.scrollTop = box.scrollHeight;
  };
}

function bindImageStudio(win){
  const upload = win.querySelector('#studioUpload'), workspace = win.querySelector('#studioWorkspace'), status = win.querySelector('#studioStatus');
  let current = null;
  const show = canvas => { current = canvas; workspace.innerHTML = ''; workspace.appendChild(canvas); };
  upload.onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img,0,0); show(c); status.textContent = file.name; }; img.src = URL.createObjectURL(file);
  };
  win.querySelector('#studioRemoveBg').onclick = () => { if(!current) return; const ctx = current.getContext('2d'), data = ctx.getImageData(0,0,current.width,current.height), p=data.data; for(let i=0;i<p.length;i+=4){ if(p[i]>220&&p[i+1]>220&&p[i+2]>220) p[i+3]=0; } ctx.putImageData(data,0,0); };
  win.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { if(!current) return; const bg=b.dataset.bg, c=document.createElement('canvas'); c.width=current.width; c.height=current.height; const ctx=c.getContext('2d'); if(bg!=='transparent'){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);} ctx.drawImage(current,0,0); show(c); });
  win.querySelector('#studioApplyResize').onclick = () => { if(!current) return; const w=Number(win.querySelector('#resizeW').value)||current.width,h=Number(win.querySelector('#resizeH').value)||current.height,c=document.createElement('canvas'); c.width=w;c.height=h;c.getContext('2d').drawImage(current,0,0,w,h);show(c); };
  win.querySelector('#studioEnhance').onclick = () => { if(!current) return; const c=document.createElement('canvas'); c.width=current.width;c.height=current.height;const ctx=c.getContext('2d');ctx.filter='contrast(1.08) saturate(1.12)';ctx.drawImage(current,0,0);show(c); };
  win.querySelector('#studioDownloadPng').onclick = () => current && downloadUrl('akaora-image.png', current.toDataURL('image/png'));
  win.querySelector('#studioDownloadJpg').onclick = () => current && downloadUrl('akaora-image.jpg', current.toDataURL('image/jpeg', .92));
}


function bindCalculator(win){
  const display = win.querySelector('#calcDisplay');
  let current = '0';
  let previous = null;
  let operator = null;
  let resetNext = false;

  function update(){
    display.textContent = current.length > 10 ? Number(current).toPrecision(8) : current;
  }

  function calculate(){
    const a = Number(previous);
    const b = Number(current);
    if(!operator || Number.isNaN(a) || Number.isNaN(b)) return;
    let result = b;
    if(operator === '+') result = a + b;
    if(operator === '-') result = a - b;
    if(operator === '*') result = a * b;
    if(operator === '/') result = b === 0 ? 'Error' : a / b;
    current = String(Number.isFinite(result) ? Number(result.toFixed(10)) : result);
    previous = null;
    operator = null;
    resetNext = true;
  }

  win.querySelectorAll('[data-calc]').forEach(btn => {
    btn.onclick = () => {
      const v = btn.dataset.calc;

      if(v === 'clear'){
        current = '0';
        previous = null;
        operator = null;
        resetNext = false;
        update();
        return;
      }

      if(v === 'sign'){
        current = current.startsWith('-') ? current.slice(1) : '-' + current;
        update();
        return;
      }

      if(v === 'percent'){
        current = String(Number(current) / 100);
        update();
        return;
      }

      if(v === '='){
        calculate();
        update();
        return;
      }

      if(['+','-','*','/'].includes(v)){
        if(previous !== null && operator) calculate();
        previous = current;
        operator = v;
        resetNext = true;
        update();
        return;
      }

      if(v === '.'){
        if(resetNext){ current = '0'; resetNext = false; }
        if(!current.includes('.')) current += '.';
        update();
        return;
      }

      if(/[0-9]/.test(v)){
        if(current === '0' || resetNext){
          current = v;
          resetNext = false;
        }else{
          current += v;
        }
        update();
      }
    };
  });

  update();
}


function bindQuickTools(win){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const pass = win.querySelector('#passwordResult');
  win.querySelector('#genPassword').onclick = () => {
    let out = '';
    for(let i=0;i<16;i++) out += chars[Math.floor(Math.random()*chars.length)];
    pass.textContent = out;
  };

  const wordText = win.querySelector('#wordText');
  const wordResult = win.querySelector('#wordResult');
  wordText.oninput = () => {
    const text = wordText.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordResult.textContent = `${words} words • ${wordText.value.length} characters`;
  };

  const color = win.querySelector('#quickColor');
  const colorResult = win.querySelector('#colorResult');
  color.oninput = () => colorResult.textContent = color.value;

  const caseInput = win.querySelector('#caseInput');
  const caseResult = win.querySelector('#caseResult');
  win.querySelector('#upperCaseBtn').onclick = () => caseResult.textContent = caseInput.value.toUpperCase();
  win.querySelector('#lowerCaseBtn').onclick = () => caseResult.textContent = caseInput.value.toLowerCase();
}


function playBootSound(){
  try{
    const audio = document.getElementById('bootSound');
    if(audio){
      audio.volume = 0.35;
      const p = audio.play();
      if(p && p.catch) p.catch(()=>{});
    }
  }catch(e){}
}

function bindClockApp(win){
  let timerSeconds = 5 * 60;
  let timerInterval = null;
  let alarms = JSON.parse(localStorage.getItem('akaora.alarms') || '[]');

  const updateLocalClock = () => {
    const now = new Date();
    const n = win.querySelector('#clockNow');
    const d = win.querySelector('#clockDate');
    if(n) n.textContent = now.toLocaleTimeString([], {hour12:false});
    if(d) d.textContent = now.toDateString();

    alarms.forEach(a => {
      if(!a.done && a.time === now.toTimeString().slice(0,5)){
        a.done = true;
        localStorage.setItem('akaora.alarms', JSON.stringify(alarms));
        alert('Alarm: ' + a.time);
      }
    });
  };

  updateLocalClock();
  const clockInt = setInterval(updateLocalClock, 1000);

  win.querySelectorAll('.clock-tab').forEach(tab => {
    tab.onclick = () => {
      win.querySelectorAll('.clock-tab').forEach(t=>t.classList.remove('active'));
      win.querySelectorAll('.clock-panel').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      win.querySelector('#clock-' + tab.dataset.clockTab).classList.add('active');
    };
  });

  const renderAlarms = () => {
    const list = win.querySelector('#alarmList');
    list.innerHTML = alarms.length ? alarms.map((a,i)=>`<div class="clock-card"><span>${a.time}</span><button data-del-alarm="${i}">Delete</button></div>`).join('') : '<div class="clock-card">No alarms set</div>';
    list.querySelectorAll('[data-del-alarm]').forEach(btn => btn.onclick = () => {
      alarms.splice(Number(btn.dataset.delAlarm),1);
      localStorage.setItem('akaora.alarms', JSON.stringify(alarms));
      renderAlarms();
    });
  };

  win.querySelector('#setAlarmBtn').onclick = () => {
    const time = win.querySelector('#alarmTime').value;
    if(!time) return;
    alarms.push({time, done:false});
    localStorage.setItem('akaora.alarms', JSON.stringify(alarms));
    renderAlarms();
  };

  const updateTimer = () => {
    const display = win.querySelector('#clockTimerDisplay');
    if(display) display.textContent = formatTime(timerSeconds);
    const pop = document.querySelector('#activePopoutTimerValue');
    if(pop) pop.textContent = formatTime(timerSeconds);
  };

  win.querySelector('#clockTimerStart').onclick = () => {
    if(!timerInterval){
      const mins = Number(win.querySelector('#clockTimerMin').value);
      if(mins > 0 && timerSeconds === 5*60) timerSeconds = mins * 60;
      timerInterval = setInterval(() => {
        timerSeconds = Math.max(0, timerSeconds - 1);
        updateTimer();
        if(timerSeconds === 0){
          clearInterval(timerInterval);
          timerInterval = null;
          alert('Timer complete');
        }
      }, 1000);
    }
  };

  win.querySelector('#clockTimerPause').onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
  };

  win.querySelector('#clockTimerReset').onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = (Number(win.querySelector('#clockTimerMin').value) || 5) * 60;
    updateTimer();
  };

  win.querySelector('#clockTimerPopout').onclick = () => {
    document.querySelector('.popout-timer')?.remove();
    const p = document.createElement('div');
    p.className = 'popout-timer';
    p.innerHTML = `<strong id="activePopoutTimerValue">${formatTime(timerSeconds)}</strong><br><button onclick="this.parentElement.remove()">Close</button>`;
    document.body.appendChild(p);
  };

  const world = [
    ['India', 'Asia/Kolkata'],
    ['New York', 'America/New_York'],
    ['London', 'Europe/London'],
    ['Dubai', 'Asia/Dubai'],
    ['Tokyo', 'Asia/Tokyo']
  ];

  const renderWorld = () => {
    const list = win.querySelector('#worldClockList');
    list.innerHTML = world.map(([name,tz]) => `<div class="clock-card"><strong>${name}</strong><span>${new Date().toLocaleTimeString([], {timeZone:tz, hour12:false})}</span></div>`).join('');
  };
  renderWorld();
  const worldInt = setInterval(renderWorld, 1000);

  win.addEventListener('remove', () => {
    clearInterval(clockInt);
    clearInterval(worldInt);
  });

  renderAlarms();
  updateTimer();
}


function showNotification(title, body){
  try{
    const push = () => {
      const card = document.createElement('div');
      card.className = 'akaora-notification';
      card.innerHTML = `<strong>${title}</strong><p>${body}</p>`;
      document.body.appendChild(card);
      setTimeout(()=>card.classList.add('show'),10);
      setTimeout(()=>{
        card.classList.remove('show');
        setTimeout(()=>card.remove(),400);
      },4200);
    };

    if('Notification' in window){
      if(Notification.permission === 'granted'){
        new Notification(title, { body });
      }else if(Notification.permission !== 'denied'){
        Notification.requestPermission().then(p => {
          if(p === 'granted'){
            new Notification(title, { body });
          }else{
            push();
          }
        });
      }else{
        push();
      }
    }else{
      push();
    }
  }catch(e){}
}

function bindAIMode(win){
  const thoughts = [
    'Discipline is choosing what you want most over what you want now.',
    'Every expert was once a beginner who refused to quit.',
    'You do not rise to the level of your goals. You fall to the level of your systems.',
    'Small daily improvements become massive results over time.',
    'Focus on consistency, not perfection.',
    'The pain of discipline is lighter than the pain of regret.',
    'Your future self is watching your decisions today.',
    'Execution creates confidence.',
    'A focused mind is more powerful than raw talent.',
    'Great things are built in silence and consistency.',
    'You become unstoppable when you work without needing motivation.',
    'The strongest people master their mind first.',
    'Success is built during the moments nobody is watching.',
    'Every hour invested in yourself compounds forever.',
    'You are one disciplined year away from a completely different life.',
    'Momentum is created by action, not overthinking.',
    'Hard work becomes easy when your purpose is clear.',
    'Your habits decide your future.',
    'Protect your focus like it is your greatest asset.',
    'A calm mind builds powerful results.'
  ];

  const main = win.querySelector('#mindThought');
  const focusMini = win.querySelector('#focusQuoteMini');
  const growthMini = win.querySelector('#growthQuoteMini');

  const nextThought = () => {
    const t1 = thoughts[Math.floor(Math.random() * thoughts.length)];
    const t2 = thoughts[Math.floor(Math.random() * thoughts.length)];
    const t3 = thoughts[Math.floor(Math.random() * thoughts.length)];

    main.textContent = t1;
    focusMini.textContent = t2;
    growthMini.textContent = t3;
  };

  win.querySelector('#newThoughtBtn').onclick = nextThought;

  win.querySelector('#copyThoughtBtn').onclick = async () => {
    try{
      await navigator.clipboard.writeText(main.textContent);
      showNotification('Copied', 'Thought copied to clipboard');
    }catch(e){}
  };

  win.querySelector('#speakThoughtBtn').onclick = () => {
    try{
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(main.textContent);
      utter.rate = 0.95;
      utter.pitch = 1;
      speechSynthesis.speak(utter);
    }catch(e){}
  };

  nextThought();
}

function bindWeatherApp(win){
  // Offline weather preview; can be connected to a real API later.
}

function bindSettings(win){
  win.querySelectorAll('.settings-tab').forEach(tab => tab.onclick = () => {
    win.querySelectorAll('.settings-tab').forEach(t=>t.classList.remove('active'));
    win.querySelectorAll('.settings-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    win.querySelector('#settings-' + tab.dataset.tab).classList.add('active');
  });
  win.querySelector('#lightThemeBtn').onclick = () => document.body.classList.add('light-theme');
  win.querySelector('#darkThemeBtn').onclick = () => document.body.classList.remove('light-theme');
  win.querySelector('#uiScaleRange').oninput = e => document.documentElement.style.zoom = e.target.value + '%';
  win.querySelector('#reduceMotion').onchange = e => document.body.classList.toggle('reduce-motion', e.target.checked);
}

function initTopMenus(){
  const layer = $('topMenuLayer');
  const menus = {
    file:[['New Note',()=>openApp('notepad')],['New Todo',()=>openApp('todo')],['Force Quit',forceQuitAll]],
    edit:[['Copy',()=>document.execCommand('copy')],['Paste',()=>document.execCommand('paste')],['Select All',()=>document.activeElement?.select?.()]],
    view:[['Full Screen',()=>document.documentElement.requestFullscreen?.()],['Toggle Theme',()=>document.body.classList.toggle('light-theme')]],
    window:[['Show Desktop',()=>Object.values(state.windows).forEach(w=>w.style.display='none')],['Close All',forceQuitAll]],
    help:[['Settings',()=>openApp('settings')],['Website',()=>openUrl('https://www.akaoratechnologies.in/')]]
  };
  document.querySelectorAll('.menu-action').forEach(btn => btn.onclick = e => {
    e.stopPropagation(); layer.innerHTML = ''; const rect = btn.getBoundingClientRect(), menu = document.createElement('div');
    menu.className='menu-dropdown'; menu.style.left=rect.left+'px'; menu.style.top='0px';
    menu.innerHTML = menus[btn.dataset.menu].map(([name])=>`<button data-cmd="${name}"><span>${name}</span></button>`).join('');
    layer.appendChild(menu);
    menu.querySelectorAll('[data-cmd]').forEach(b => b.onclick = () => { const action = menus[btn.dataset.menu].find(x=>x[0]===b.dataset.cmd)[1]; layer.innerHTML=''; action(); });
  });
  document.addEventListener('click',()=>layer.innerHTML='');
}

function forceQuitAll(){ Object.values(state.windows).forEach(w=>w.remove()); state.windows = {}; }
function saveTodos(){ localStorage.setItem('akaora.todos', JSON.stringify(state.todos)); }
function updateWidgets(){ if($('miniFocus')) $('miniFocus').textContent = formatTime(state.focusSeconds); if($('waterWidgetQty')) $('waterWidgetQty').textContent = state.water.amount + 'ml'; if($('waterWidgetGoal')) $('waterWidgetGoal').textContent = state.water.goal + 'ml'; if($('waterMiniFill')) $('waterMiniFill').style.height = Math.min(100,state.water.amount/state.water.goal*100) + '%'; }
function setFocus(min, mode, win){ pauseFocus(); state.focusSeconds = min*60; state.focusMode = mode; if(win){ win.querySelector('#focusDisplay').textContent = formatTime(state.focusSeconds); win.querySelector('#focusAppMode').textContent = mode; } updateWidgets(); }
function startFocus(){ if(state.focusTimer) return; state.focusTimer = setInterval(()=>{ state.focusSeconds=Math.max(0,state.focusSeconds-1); document.querySelectorAll('#focusDisplay').forEach(e=>e.textContent=formatTime(state.focusSeconds)); updateWidgets(); if(state.focusSeconds===0) pauseFocus(); },1000); }
function pauseFocus(){ clearInterval(state.focusTimer); state.focusTimer = null; }
function formatTime(s){ return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
function assistantReply(q){ q=q.toLowerCase(); if(q.includes('developer')) return 'Akaora OS is developed by Akshay Goyal.'; if(q.includes('focus')) return 'Use Focus app and set a timer for deep work.'; if(q.includes('study')) return 'Open Study app to upload PDF, text, audio, or video material.'; return 'I can help with focus, study, tasks, notes, image tools, and Akaora OS.'; }
function downloadText(name, text){ const blob = new Blob([text], {type:'text/plain'}); downloadUrl(name, URL.createObjectURL(blob)); }
function downloadUrl(name, url){ const a=document.createElement('a'); a.download=name; a.href=url; a.click(); }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

window.addEventListener('error', e => { console.warn('Recovered:', e.message); $('boot')?.classList.add('hidden'); $('os')?.classList.remove('hidden'); });
window.addEventListener('load', boot);
setTimeout(()=>{ $('boot')?.classList.add('hidden'); $('os')?.classList.remove('hidden'); }, 1200);


/* ===== AKAORA OS ULTIMATE MODULES ===== */
(function(){
  const ultimateApps = {
    ultimate:{title:'Ultimate Hub', icon:'appstore'},
    calendar:{title:'Smart Calendar', icon:'calendar'},
    habit:{title:'Habit Tracker', icon:'habit'},
    goals:{title:'Daily Goals', icon:'goals'},
    analytics:{title:'Deep Work Analytics', icon:'analytics'},
    resume:{title:'AI Resume Builder', icon:'resume'},
    filespro:{title:'File Manager', icon:'filespro'},
    screenshot:{title:'Screenshot Tool', icon:'screenshot'},
    clipboard:{title:'Clipboard History', icon:'clipboard'},
    voice:{title:'AI Voice Assistant', icon:'voice'},
    websitebuilder:{title:'AI Website Builder', icon:'websitebuilder'},
    summarizer:{title:'AI Notes Summarizer', icon:'summarizer'},
    pdfai:{title:'AI PDF Reader', icon:'pdfai'},
    coding:{title:'AI Coding Assistant', icon:'coding'},
    imagegen:{title:'AI Image Generator', icon:'imagegen'},
    wallpapergen:{title:'AI Wallpaper Generator', icon:'wallpapergen'},
    aicoach:{title:'AI Focus Coach', icon:'aicoach'},
    spotlight:{title:'Spotlight Search', icon:'spotlight'},
    appstore:{title:'App Store', icon:'appstore'},
    lockscreen:{title:'Lock Screen', icon:'lock'},
    profiles:{title:'User Profiles', icon:'profiles'},
    notificationcenter:{title:'Notification Center', icon:'notify'},
    controlcenter:{title:'Control Center', icon:'control'},
    sleep:{title:'Sleep Tracker', icon:'sleep'},
    eye:{title:'Eye Protection', icon:'eye'},
    stretch:{title:'Stretch Reminder', icon:'stretch'},
    steps:{title:'Step Tracker', icon:'steps'},
    mood:{title:'Mood Journal', icon:'mood'},
    meditation:{title:'Meditation Mode', icon:'meditate'},
    cloudsave:{title:'Cloud Save', icon:'cloud'},
    mobilecompanion:{title:'Mobile Companion', icon:'mobile'}
  };

  Object.assign(appMeta, ultimateApps);

  const originalRender = renderApp;
  renderApp = function(app){
    if(app === 'ultimate'){
      const groups = {
        'Productivity':['calendar','habit','goals','analytics','resume','filespro','screenshot','clipboard'],
        'AI Tools':['voice','websitebuilder','summarizer','pdfai','coding','imagegen','wallpapergen','aicoach'],
        'OS Experience':['spotlight','appstore','lockscreen','profiles','notificationcenter','controlcenter'],
        'Health + Discipline':['sleep','eye','stretch','steps','mood','meditation'],
        'SaaS':['cloudsave','mobilecompanion']
      };
      return `<div class="ultimate-hub">${Object.entries(groups).map(([title,apps])=>`
        <section class="ultimate-section">
          <h3>${title}</h3>
          <div class="ultimate-grid">${apps.map(a=>`<button data-launch-app="${a}"><img src="assets/${appMeta[a].icon}.png"><span>${appMeta[a].title}</span></button>`).join('')}</div>
        </section>`).join('')}</div>`;
    }

    if(app === 'calendar') return `<div class="ultimate-app"><div class="hero-card"><h2>Smart Calendar</h2><p>Plan your day with AI-style scheduling.</p></div><div class="toolbar"><input id="calTitle" placeholder="Event title"><input id="calTime" type="time"><button class="primary" id="addCalEvent">Add</button></div><div id="calendarList" class="pro-list"></div></div>`;
    if(app === 'habit') return `<div class="ultimate-app"><div class="hero-card"><h2>Habit Tracker</h2><p>Build streaks daily.</p></div><div class="toolbar"><input id="habitName" placeholder="Habit name"><button class="primary" id="addHabit">Add Habit</button></div><div id="habitList" class="pro-list"></div></div>`;
    if(app === 'goals') return `<div class="ultimate-app"><div class="hero-card"><h2>Daily Goals Dashboard</h2><p>Track your top goals.</p></div><div class="toolbar"><input id="goalInput" placeholder="Goal"><button class="primary" id="addGoal">Add</button></div><div id="goalList" class="pro-list"></div></div>`;
    if(app === 'analytics') return `<div class="ultimate-app"><div class="hero-card"><h2>Deep Work Analytics</h2><p>Focus score and productivity graph.</p></div><div class="analytics-grid"><div class="stat-card"><strong id="deepSessions">0</strong><span>Sessions</span></div><div class="stat-card"><strong id="deepMinutes">0</strong><span>Minutes</span></div><div class="stat-card"><strong>92%</strong><span>Focus Score</span></div></div><button class="primary" id="logDeepWork">Log 25 Min Session</button></div>`;
    if(app === 'resume') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Resume Builder</h2><p>Generate a clean resume draft.</p></div><input id="resumeName" placeholder="Your name"><input id="resumeRole" placeholder="Target role"><textarea id="resumeSkills" placeholder="Skills"></textarea><button class="primary" id="buildResume">Build Resume</button><textarea id="resumeOutput"></textarea></div>`;
    if(app === 'filespro') return `<div class="ultimate-app"><div class="hero-card"><h2>File Manager</h2><p>Folders and drag-drop file metadata.</p></div><div class="toolbar"><input type="file" id="fileManagerInput" multiple><button class="primary" id="newFolderPro">New Folder</button></div><div id="fileManagerList" class="files-grid"></div></div>`;
    if(app === 'screenshot') return `<div class="ultimate-app"><div class="hero-card"><h2>Screenshot Tool</h2><p>Capture OS mock screenshot as a downloadable card.</p></div><button class="primary" id="makeScreenshot">Generate Screenshot</button><canvas id="screenshotCanvas" width="900" height="520"></canvas></div>`;
    if(app === 'clipboard') return `<div class="ultimate-app"><div class="hero-card"><h2>Clipboard History</h2><p>Save useful copied text.</p></div><div class="toolbar"><input id="clipText" placeholder="Text to save"><button class="primary" id="addClip">Save</button></div><div id="clipList" class="pro-list"></div></div>`;
    if(app === 'voice') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Voice Assistant</h2><p>Speak your thoughts and commands.</p></div><button class="primary" id="startVoice">Start Listening</button><div id="voiceOutput" class="result-box">Voice output will appear here.</div></div>`;
    if(app === 'websitebuilder') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Website Builder</h2><p>Generate a landing page draft.</p></div><input id="siteBusiness" placeholder="Business name"><input id="siteType" placeholder="Website type"><button class="primary" id="buildSite">Generate</button><textarea id="siteOutput"></textarea></div>`;
    if(app === 'summarizer') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Notes Summarizer</h2></div><textarea id="summaryInput" placeholder="Paste notes"></textarea><button class="primary" id="summarizeBtn">Summarize</button><div id="summaryOutput" class="result-box"></div></div>`;
    if(app === 'pdfai') return `<div class="ultimate-app"><div class="hero-card"><h2>AI PDF Reader</h2><p>Open PDF and create study prompts.</p></div><input type="file" id="pdfAiInput" accept="application/pdf"><iframe id="pdfAiViewer"></iframe><button class="primary" id="pdfPromptBtn">Generate Study Questions</button><div id="pdfPromptOutput" class="result-box"></div></div>`;
    if(app === 'coding') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Coding Assistant</h2></div><textarea id="codeInput" placeholder="Paste code or describe problem"></textarea><button class="primary" id="codeHelpBtn">Explain / Fix</button><div id="codeOutput" class="result-box"></div></div>`;
    if(app === 'imagegen') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Image Generator</h2><p>Prompt-to-card concept generator.</p></div><input id="imagePrompt" placeholder="Describe image"><button class="primary" id="genImageMock">Generate Concept</button><div id="imageMock" class="image-mock">Your concept preview will appear here.</div></div>`;
    if(app === 'wallpapergen') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Wallpaper Generator</h2></div><input id="wallPrompt" placeholder="Wallpaper mood"><button class="primary" id="genWallpaper">Generate Wallpaper</button><canvas id="wallCanvas" width="900" height="500"></canvas></div>`;
    if(app === 'aicoach') return `<div class="ultimate-app"><div class="hero-card"><h2>AI Focus Coach</h2><p id="coachQuote">Start before you feel ready.</p></div><button class="primary" id="newCoachQuote">New Coaching Thought</button></div>`;
    if(app === 'spotlight') return `<div class="ultimate-app"><div class="hero-card"><h2>Spotlight Search</h2></div><input id="spotlightInput" placeholder="Search apps..."><div id="spotlightResults" class="ultimate-grid"></div></div>`;
    if(app === 'appstore') return `<div class="ultimate-app"><div class="hero-card"><h2>App Store</h2><p>Install-ready Akaora modules.</p></div><div class="ultimate-grid">${Object.keys(ultimateApps).filter(a=>a!=='ultimate').map(a=>`<button data-launch-app="${a}"><img src="assets/${appMeta[a].icon}.png"><span>${appMeta[a].title}</span></button>`).join('')}</div></div>`;
    if(app === 'lockscreen') return `<div class="lock-screen-app"><h1>Akaora OS</h1><p>Locked workspace preview</p><button class="primary" onclick="this.closest('.app-window').querySelector('.control-close').click()">Unlock</button></div>`;
    if(app === 'profiles') return `<div class="ultimate-app"><div class="hero-card"><h2>User Profiles</h2></div><div class="toolbar"><input id="profileName" placeholder="Profile name"><button class="primary" id="saveProfile">Save</button></div><div id="profileOutput" class="result-box"></div></div>`;
    if(app === 'notificationcenter') return `<div class="ultimate-app"><div class="hero-card"><h2>Notification Center</h2></div><button class="primary" id="testNotify">Test Notification</button><div id="notifyList" class="pro-list"></div></div>`;
    if(app === 'controlcenter') return `<div class="ultimate-app"><div class="hero-card"><h2>Control Center</h2></div><div class="control-grid"><button id="ccTheme">Theme</button><button id="ccFocus">Focus</button><button id="ccFullscreen">Fullscreen</button><button id="ccMute">Mute UI</button></div></div>`;
    if(app === 'sleep') return `<div class="ultimate-app"><div class="hero-card"><h2>Sleep Tracker</h2></div><input type="time" id="sleepTime"><input type="time" id="wakeTime"><button class="primary" id="saveSleep">Save Sleep</button><div id="sleepOutput" class="result-box"></div></div>`;
    if(app === 'eye') return `<div class="ultimate-app"><div class="hero-card"><h2>Eye Protection</h2><p>20-20-20 reminder.</p></div><button class="primary" id="startEyeReminder">Start Reminder</button></div>`;
    if(app === 'stretch') return `<div class="ultimate-app"><div class="hero-card"><h2>Stretch Reminder</h2></div><button class="primary" id="stretchNow">Give Stretch</button><div id="stretchOutput" class="result-box"></div></div>`;
    if(app === 'steps') return `<div class="ultimate-app"><div class="hero-card"><h2>Step Tracker</h2></div><div class="toolbar"><input id="stepInput" type="number" placeholder="Steps"><button class="primary" id="addSteps">Add</button></div><div id="stepOutput" class="result-box"></div></div>`;
    if(app === 'mood') return `<div class="ultimate-app"><div class="hero-card"><h2>Mood Journal</h2></div><select id="moodSelect"><option>Focused</option><option>Happy</option><option>Tired</option><option>Stressed</option><option>Calm</option></select><textarea id="moodNote" placeholder="Why?"></textarea><button class="primary" id="saveMood">Save Mood</button><div id="moodList" class="pro-list"></div></div>`;
    if(app === 'meditation') return `<div class="ultimate-app"><div class="hero-card"><h2>Meditation Mode</h2><p id="breathText">Breathe in...</p></div><button class="primary" id="startMeditation">Start 1 Min</button></div>`;
    if(app === 'cloudsave') return `<div class="ultimate-app"><div class="hero-card"><h2>Cloud Save</h2><p>Local export/import ready for future cloud sync.</p></div><button class="primary" id="exportData">Export Data</button><input type="file" id="importData"></div>`;
    if(app === 'mobilecompanion') return `<div class="ultimate-app"><div class="hero-card"><h2>Mobile Companion App</h2><p>Future Android/iOS companion concept.</p></div><div class="result-box">Sync tasks, focus, health and AI notes from mobile.</div></div>`;

    return originalRender(app);
  };

  const originalBind = bindApp;
  bindApp = function(app, win){
    try{ originalBind(app, win); }catch(e){ console.warn(e); }
    if(app === 'ultimate' || app === 'appstore') bindLaunchButtons(win);
    if(app === 'calendar') bindCalendar(win);
    if(app === 'habit') bindHabit(win);
    if(app === 'goals') bindGoals(win);
    if(app === 'analytics') bindAnalytics(win);
    if(app === 'resume') bindResume(win);
    if(app === 'filespro') bindFilesPro(win);
    if(app === 'screenshot') bindScreenshot(win);
    if(app === 'clipboard') bindClipboard(win);
    if(app === 'voice') bindVoice(win);
    if(app === 'websitebuilder') bindWebsiteBuilder(win);
    if(app === 'summarizer') bindSummarizer(win);
    if(app === 'pdfai') bindPdfAi(win);
    if(app === 'coding') bindCoding(win);
    if(app === 'imagegen') bindImageGen(win);
    if(app === 'wallpapergen') bindWallpaperGen(win);
    if(app === 'aicoach') bindAICoach(win);
    if(app === 'spotlight') bindSpotlight(win);
    if(app === 'profiles') bindProfiles(win);
    if(app === 'notificationcenter') bindNotificationCenter(win);
    if(app === 'controlcenter') bindControlCenter(win);
    if(app === 'sleep') bindSleep(win);
    if(app === 'eye') bindEye(win);
    if(app === 'stretch') bindStretch(win);
    if(app === 'steps') bindSteps(win);
    if(app === 'mood') bindMood(win);
    if(app === 'meditation') bindMeditation(win);
    if(app === 'cloudsave') bindCloudSave(win);
  };

  function store(key, fallback){ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function bindLaunchButtons(win){ win.querySelectorAll('[data-launch-app]').forEach(b=>b.onclick=()=>openApp(b.dataset.launchApp)); }
  function listRender(el, items, map){ el.innerHTML = items.length ? items.map(map).join('') : '<div class="result-box">Nothing yet.</div>'; }

  function bindCalendar(win){ let data=store('akaora.calendar',[]); const render=()=>listRender(win.querySelector('#calendarList'),data,(x,i)=>`<div class="list-item"><b>${x.time}</b><span>${escapeHtml(x.title)}</span><button data-del="${i}">Done</button></div>`); win.querySelector('#addCalEvent').onclick=()=>{data.push({title:win.querySelector('#calTitle').value||'Untitled',time:win.querySelector('#calTime').value||'Anytime'});save('akaora.calendar',data);render();}; win.addEventListener('click',e=>{if(e.target.dataset.del){data.splice(+e.target.dataset.del,1);save('akaora.calendar',data);render();}});render();}
  function bindHabit(win){ let data=store('akaora.habits',[]); const render=()=>listRender(win.querySelector('#habitList'),data,(x,i)=>`<div class="list-item"><b>${escapeHtml(x.name)}</b><span>${x.streak} day streak</span><button data-habit="${i}">+1</button></div>`); win.querySelector('#addHabit').onclick=()=>{data.push({name:win.querySelector('#habitName').value||'New Habit',streak:0});save('akaora.habits',data);render();}; win.addEventListener('click',e=>{if(e.target.dataset.habit){data[+e.target.dataset.habit].streak++;save('akaora.habits',data);render();}});render();}
  function bindGoals(win){ let data=store('akaora.goals',[]); const render=()=>listRender(win.querySelector('#goalList'),data,(x,i)=>`<div class="list-item"><span>${escapeHtml(x)}</span><button data-goal="${i}">Complete</button></div>`); win.querySelector('#addGoal').onclick=()=>{data.push(win.querySelector('#goalInput').value||'New Goal');save('akaora.goals',data);render();}; win.addEventListener('click',e=>{if(e.target.dataset.goal){data.splice(+e.target.dataset.goal,1);save('akaora.goals',data);render();}});render();}
  function bindAnalytics(win){ let sessions=Number(localStorage.getItem('akaora.deep.sessions')||0), mins=Number(localStorage.getItem('akaora.deep.mins')||0); const render=()=>{win.querySelector('#deepSessions').textContent=sessions;win.querySelector('#deepMinutes').textContent=mins;}; win.querySelector('#logDeepWork').onclick=()=>{sessions++;mins+=25;localStorage.setItem('akaora.deep.sessions',sessions);localStorage.setItem('akaora.deep.mins',mins);render();}; render();}
  function bindResume(win){ win.querySelector('#buildResume').onclick=()=>{win.querySelector('#resumeOutput').value=`${win.querySelector('#resumeName').value}\nTarget Role: ${win.querySelector('#resumeRole').value}\n\nSummary:\nMotivated professional with strong execution, learning ability and digital skills.\n\nSkills:\n${win.querySelector('#resumeSkills').value}\n\nExperience:\nAdd project work and achievements here.`;};}
  function bindFilesPro(win){ let files=[]; const render=()=>win.querySelector('#fileManagerList').innerHTML=files.map(f=>`<div class="file-card">📄 ${escapeHtml(f.name)}<br><small>${f.size} KB</small></div>`).join('')||'<div class="file-card">No files added.</div>'; win.querySelector('#fileManagerInput').onchange=e=>{files=[...files,...[...e.target.files].map(f=>({name:f.name,size:Math.round(f.size/1024)}))];render();}; win.querySelector('#newFolderPro').onclick=()=>{files.push({name:'New Folder',size:0});render();}; render();}
  function bindScreenshot(win){ win.querySelector('#makeScreenshot').onclick=()=>{const c=win.querySelector('#screenshotCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#0c0d10';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.font='48px sans-serif';ctx.fillText('Akaora OS Screenshot',80,150);ctx.fillStyle='#0a84ff';ctx.fillRect(80,200,740,180);};}
  function bindClipboard(win){ let data=store('akaora.clips',[]); const render=()=>listRender(win.querySelector('#clipList'),data,(x)=>`<div class="list-item"><span>${escapeHtml(x)}</span></div>`); win.querySelector('#addClip').onclick=()=>{data.unshift(win.querySelector('#clipText').value);save('akaora.clips',data);render();}; render();}
  function bindVoice(win){ win.querySelector('#startVoice').onclick=()=>{const out=win.querySelector('#voiceOutput'); if(window.SpeechRecognition||window.webkitSpeechRecognition){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new SR();r.onresult=e=>out.textContent=e.results[0][0].transcript;r.start();}else out.textContent='Speech recognition is not supported in this browser.';};}
  function bindWebsiteBuilder(win){ win.querySelector('#buildSite').onclick=()=>{win.querySelector('#siteOutput').value=`Hero: ${win.querySelector('#siteBusiness').value}\nHeadline: Grow your brand with premium digital solutions.\nSections: Services, Portfolio, Testimonials, Contact.\nCTA: Start your project today.`;};}
  function bindSummarizer(win){ win.querySelector('#summarizeBtn').onclick=()=>{const text=win.querySelector('#summaryInput').value;win.querySelector('#summaryOutput').textContent=text.split(/[.!?]/).filter(Boolean).slice(0,3).join('. ') + '.';};}
  function bindPdfAi(win){ win.querySelector('#pdfAiInput').onchange=e=>{const f=e.target.files[0]; if(f) win.querySelector('#pdfAiViewer').src=URL.createObjectURL(f);}; win.querySelector('#pdfPromptBtn').onclick=()=>win.querySelector('#pdfPromptOutput').innerHTML='1. What are the key ideas?<br>2. What should be revised?<br>3. Explain the topic in simple words.';}
  function bindCoding(win){ win.querySelector('#codeHelpBtn').onclick=()=>win.querySelector('#codeOutput').textContent='Check syntax, isolate the failing function, review console errors, and test one feature at a time.';}
  function bindImageGen(win){ win.querySelector('#genImageMock').onclick=()=>{win.querySelector('#imageMock').textContent='Concept: '+win.querySelector('#imagePrompt').value;};}
  function bindWallpaperGen(win){ win.querySelector('#genWallpaper').onclick=()=>{const c=win.querySelector('#wallCanvas'),ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#0a84ff');g.addColorStop(1,'#af52de');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.font='54px sans-serif';ctx.fillText(win.querySelector('#wallPrompt').value||'AKAORA OS',80,260);};}
  function bindAICoach(win){ const q=['One focused hour can change your day.','Start small, finish strong.','Protect your attention.']; win.querySelector('#newCoachQuote').onclick=()=>win.querySelector('#coachQuote').textContent=q[Math.floor(Math.random()*q.length)];}
  function bindSpotlight(win){ const apps=Object.keys(appMeta); const render=(q='')=>{win.querySelector('#spotlightResults').innerHTML=apps.filter(a=>appMeta[a].title.toLowerCase().includes(q.toLowerCase())).map(a=>`<button data-launch-app="${a}"><img src="assets/${appMeta[a].icon}.png"><span>${appMeta[a].title}</span></button>`).join(''); bindLaunchButtons(win);}; win.querySelector('#spotlightInput').oninput=e=>render(e.target.value); render();}
  function bindProfiles(win){ win.querySelector('#saveProfile').onclick=()=>{localStorage.setItem('akaora.profile',win.querySelector('#profileName').value);win.querySelector('#profileOutput').textContent='Profile saved: '+win.querySelector('#profileName').value;};}
  function bindNotificationCenter(win){ win.querySelector('#testNotify').onclick=()=>{showNotification('Akaora OS','Notification Center is working');win.querySelector('#notifyList').innerHTML+='<div class="list-item">Test notification sent</div>';};}
  function bindControlCenter(win){ win.querySelector('#ccTheme').onclick=()=>document.body.classList.toggle('light-theme'); win.querySelector('#ccFocus').onclick=()=>document.body.classList.toggle('focus-mode'); win.querySelector('#ccFullscreen').onclick=()=>document.documentElement.requestFullscreen?.(); win.querySelector('#ccMute').onclick=()=>document.querySelectorAll('audio').forEach(a=>a.muted=!a.muted);}
  function bindSleep(win){ win.querySelector('#saveSleep').onclick=()=>win.querySelector('#sleepOutput').textContent=`Sleep: ${win.querySelector('#sleepTime').value} to ${win.querySelector('#wakeTime').value}`;}
  function bindEye(win){ win.querySelector('#startEyeReminder').onclick=()=>showNotification('Eye Protection','Every 20 minutes, look 20 feet away for 20 seconds.');}
  function bindStretch(win){ const s=['Neck rolls 30 sec','Shoulder circles 30 sec','Hamstring stretch 45 sec','Deep breathing 1 min']; win.querySelector('#stretchNow').onclick=()=>win.querySelector('#stretchOutput').textContent=s[Math.floor(Math.random()*s.length)];}
  function bindSteps(win){ let steps=Number(localStorage.getItem('akaora.steps')||0); const out=win.querySelector('#stepOutput'); const render=()=>out.textContent=steps+' steps today'; win.querySelector('#addSteps').onclick=()=>{steps+=Number(win.querySelector('#stepInput').value)||0;localStorage.setItem('akaora.steps',steps);render();}; render();}
  function bindMood(win){ let data=store('akaora.mood',[]); const render=()=>listRender(win.querySelector('#moodList'),data,x=>`<div class="list-item"><b>${x.mood}</b><span>${escapeHtml(x.note)}</span></div>`); win.querySelector('#saveMood').onclick=()=>{data.unshift({mood:win.querySelector('#moodSelect').value,note:win.querySelector('#moodNote').value});save('akaora.mood',data);render();}; render();}
  function bindMeditation(win){ win.querySelector('#startMeditation').onclick=()=>{let i=0,txt=['Breathe in...','Hold...','Breathe out...'];const p=win.querySelector('#breathText');const int=setInterval(()=>{p.textContent=txt[i++%3];if(i>18)clearInterval(int);},3000);};}
  function bindCloudSave(win){ win.querySelector('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(localStorage,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='akaora-os-data.json';a.click();};}
})();



/* ===== Akaora OS v3 Core System Layer ===== */
(function(){
  const OSV3 = {
    notifications: JSON.parse(localStorage.getItem('akaora.v3.notifications') || '[]'),
    settings: JSON.parse(localStorage.getItem('akaora.v3.settings') || '{"snap":true,"reduceMotion":false,"focusMode":false}'),
    save(){
      localStorage.setItem('akaora.v3.notifications', JSON.stringify(this.notifications.slice(0,50)));
      localStorage.setItem('akaora.v3.settings', JSON.stringify(this.settings));
    }
  };

  function ensureV3UI(){
    if(!document.querySelector('.snap-preview')){
      const snap = document.createElement('div');
      snap.className = 'snap-preview';
      document.body.appendChild(snap);
    }

    if(!document.querySelector('.os-command-palette')){
      const palette = document.createElement('div');
      palette.className = 'os-command-palette';
      palette.innerHTML = `<input id="commandSearch" placeholder="Search apps, tools, actions..."><div class="command-results" id="commandResults"></div>`;
      document.body.appendChild(palette);
    }

    if(!document.querySelector('.notification-drawer')){
      const drawer = document.createElement('div');
      drawer.className = 'notification-drawer';
      drawer.innerHTML = `<h3>Notification Center</h3><div id="drawerNotifications"></div><button id="clearV3Notifications">Clear</button>`;
      document.body.appendChild(drawer);
    }

    if(!document.querySelector('.control-drawer')){
      const drawer = document.createElement('div');
      drawer.className = 'control-drawer';
      drawer.innerHTML = `<h3>Control Center</h3>
        <div class="control-grid-v3">
          <button id="v3ThemeToggle">Theme</button>
          <button id="v3FocusToggle">Focus</button>
          <button id="v3MotionToggle">Motion</button>
          <button id="v3FullscreenToggle">Fullscreen</button>
          <button id="v3SnapToggle">Snap</button>
          <button id="v3SaveWorkspace">Save</button>
        </div>`;
      document.body.appendChild(drawer);
    }
  }

  function renderNotifications(){
    const wrap = document.getElementById('drawerNotifications');
    if(!wrap) return;
    wrap.innerHTML = OSV3.notifications.length
      ? OSV3.notifications.map(n => `<div class="drawer-card"><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.body)}</p><small>${new Date(n.time).toLocaleTimeString()}</small></div>`).join('')
      : '<div class="drawer-card">No notifications yet.</div>';
  }

  const oldShowNotification = window.showNotification;
  window.showNotification = function(title, body){
    OSV3.notifications.unshift({title, body, time:Date.now()});
    OSV3.save();
    renderNotifications();
    if(typeof oldShowNotification === 'function') oldShowNotification(title, body);
  };

  function openCommandPalette(){
    ensureV3UI();
    const palette = document.querySelector('.os-command-palette');
    const input = document.getElementById('commandSearch');
    palette.classList.add('active');
    input.value = '';
    renderCommandResults('');
    setTimeout(()=>input.focus(),20);
  }

  function closeCommandPalette(){
    document.querySelector('.os-command-palette')?.classList.remove('active');
  }

  function renderCommandResults(query){
    const wrap = document.getElementById('commandResults');
    if(!wrap || typeof appMeta === 'undefined') return;

    const apps = Object.keys(appMeta)
      .filter(key => appMeta[key].title.toLowerCase().includes(query.toLowerCase()))
      .slice(0,24);

    wrap.innerHTML = apps.map(key => `
      <button data-command-app="${key}">
        <img src="assets/${appMeta[key].icon}.png">
        <span>${appMeta[key].title}</span>
      </button>
    `).join('') || '<div class="drawer-card">No results</div>';

    wrap.querySelectorAll('[data-command-app]').forEach(btn => {
      btn.onclick = () => {
        closeCommandPalette();
        openApp(btn.dataset.commandApp);
      };
    });
  }

  function toggleDrawer(type){
    ensureV3UI();
    const n = document.querySelector('.notification-drawer');
    const c = document.querySelector('.control-drawer');

    if(type === 'notifications'){
      c.classList.remove('active');
      n.classList.toggle('active');
      renderNotifications();
    }

    if(type === 'control'){
      n.classList.remove('active');
      c.classList.toggle('active');
    }
  }

  function saveWorkspace(){
    const positions = {};
    Object.entries(state.windows || {}).forEach(([app, win]) => {
      positions[app] = {
        left: win.style.left,
        top: win.style.top,
        width: win.style.getPropertyValue('--win-w'),
        height: win.style.getPropertyValue('--win-h')
      };
    });
    localStorage.setItem('akaora.v3.workspace', JSON.stringify(positions));
    showNotification('Workspace Saved', 'Your current window layout has been saved.');
  }

  function restoreWorkspacePosition(app, win){
    const positions = JSON.parse(localStorage.getItem('akaora.v3.workspace') || '{}');
    if(positions[app]){
      win.style.left = positions[app].left || win.style.left;
      win.style.top = positions[app].top || win.style.top;
      if(positions[app].width) win.style.setProperty('--win-w', positions[app].width);
      if(positions[app].height) win.style.setProperty('--win-h', positions[app].height);
    }
  }

  // Wrap openApp so saved layout and active state work better
  if(typeof openApp === 'function' && !window.__v3OpenWrapped){
    window.__v3OpenWrapped = true;
    const oldOpenApp = openApp;
    openApp = function(app){
      oldOpenApp(app);
      const win = state.windows?.[app];
      if(win){
        restoreWorkspacePosition(app, win);
        document.querySelectorAll('.app-window').forEach(w=>w.classList.remove('active-window'));
        win.classList.add('active-window');
      }
    };
  }

  // Wrap focusWindow for active visual state
  if(typeof focusWindow === 'function' && !window.__v3FocusWrapped){
    window.__v3FocusWrapped = true;
    const oldFocus = focusWindow;
    focusWindow = function(app){
      oldFocus(app);
      document.querySelectorAll('.app-window').forEach(w=>w.classList.remove('active-window'));
      state.windows?.[app]?.classList.add('active-window');
    };
  }

  // Wrap dragging with window snapping preview
  if(typeof makeDraggable === 'function' && !window.__v3DragWrapped){
    window.__v3DragWrapped = true;
    const oldMakeDraggable = makeDraggable;
    makeDraggable = function(win){
      oldMakeDraggable(win);
      const head = win.querySelector('.window-head');
      if(!head) return;

      let snapSide = null;
      const preview = () => document.querySelector('.snap-preview');

      head.addEventListener('mousemove', e => {
        if(!OSV3.settings.snap || win.classList.contains('maximized')) return;
        const p = preview();
        if(!p) return;

        const zone = 42;
        snapSide = null;

        if(e.clientX < zone) snapSide = 'left';
        else if(e.clientX > window.innerWidth - zone) snapSide = 'right';
        else if(e.clientY < 70) snapSide = 'top';

        if(snapSide === 'left'){
          Object.assign(p.style,{display:'block',left:'10px',top:'52px',width:'calc(50vw - 14px)',height:'calc(100vh - 72px)'});
        }else if(snapSide === 'right'){
          Object.assign(p.style,{display:'block',left:'calc(50vw + 4px)',top:'52px',width:'calc(50vw - 14px)',height:'calc(100vh - 72px)'});
        }else if(snapSide === 'top'){
          Object.assign(p.style,{display:'block',left:'10px',top:'52px',width:'calc(100vw - 20px)',height:'calc(100vh - 72px)'});
        }else{
          p.style.display='none';
        }
      });

      window.addEventListener('mouseup', () => {
        const p = preview();
        if(p) p.style.display = 'none';
        if(!snapSide) return;

        win.classList.remove('maximized');

        if(snapSide === 'left'){
          win.style.left='10px'; win.style.top='52px';
          win.style.setProperty('--win-w','calc(50vw - 14px)');
          win.style.setProperty('--win-h','calc(100vh - 72px)');
        }

        if(snapSide === 'right'){
          win.style.left='calc(50vw + 4px)'; win.style.top='52px';
          win.style.setProperty('--win-w','calc(50vw - 14px)');
          win.style.setProperty('--win-h','calc(100vh - 72px)');
        }

        if(snapSide === 'top'){
          win.classList.add('maximized');
        }

        snapSide = null;
      });
    };
  }

  window.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      openCommandPalette();
    }

    if(e.key === 'Escape'){
      closeCommandPalette();
      document.querySelector('.notification-drawer')?.classList.remove('active');
      document.querySelector('.control-drawer')?.classList.remove('active');
    }
  });

  window.addEventListener('load', () => {
    ensureV3UI();
    renderNotifications();

    document.getElementById('quickSpotlight')?.addEventListener('click', openCommandPalette);
    document.getElementById('quickNotificationCenter')?.addEventListener('click', () => toggleDrawer('notifications'));
    document.getElementById('quickControlCenter')?.addEventListener('click', () => toggleDrawer('control'));

    document.getElementById('commandSearch')?.addEventListener('input', e => renderCommandResults(e.target.value));
    document.getElementById('clearV3Notifications')?.addEventListener('click', () => {
      OSV3.notifications = [];
      OSV3.save();
      renderNotifications();
    });

    document.getElementById('v3ThemeToggle')?.addEventListener('click', () => document.body.classList.toggle('light-theme'));
    document.getElementById('v3FocusToggle')?.addEventListener('click', () => {
      OSV3.settings.focusMode = !OSV3.settings.focusMode;
      document.body.classList.toggle('focus-mode-active', OSV3.settings.focusMode);
      OSV3.save();
    });
    document.getElementById('v3MotionToggle')?.addEventListener('click', () => {
      OSV3.settings.reduceMotion = !OSV3.settings.reduceMotion;
      document.body.classList.toggle('reduce-motion', OSV3.settings.reduceMotion);
      OSV3.save();
    });
    document.getElementById('v3FullscreenToggle')?.addEventListener('click', () => document.documentElement.requestFullscreen?.());
    document.getElementById('v3SnapToggle')?.addEventListener('click', () => {
      OSV3.settings.snap = !OSV3.settings.snap;
      OSV3.save();
      showNotification('Window Snap', OSV3.settings.snap ? 'Enabled' : 'Disabled');
    });
    document.getElementById('v3SaveWorkspace')?.addEventListener('click', saveWorkspace);

    document.body.classList.toggle('reduce-motion', OSV3.settings.reduceMotion);
    document.body.classList.toggle('focus-mode-active', OSV3.settings.focusMode);
  });
})();
