(() => {
  'use strict';
  const KEYS = { user: 'studywell.user.v1', session: 'studywell.session.v1', tasks: 'studywell.tasks.v1:' };
  const $ = (id) => document.getElementById(id);
  const taskForm = $('task-form'), titleInput = $('task-title'), courseInput = $('task-course');
  let user = read(KEYS.user, null), tasks = [], filter = 'all';

  function read(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  function userTasksKey() { return KEYS.tasks + encodeURIComponent(user?.email || 'guest'); }
  function safeText(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }
  function dateLabel(date) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date); }
  function updateUser() {
    const name = user?.name || 'Student';
    $('profile-name').textContent = name;
    $('avatar').textContent = name.trim().charAt(0).toUpperCase() || 'S';
  }
  function showApp() {
    $('login-screen').hidden = true;
    $('profile').style.display = 'flex';
    tasks = read(userTasksKey(), []);
    if (!Array.isArray(tasks)) tasks = [];
    updateUser(); render();
  }
  function showLogin() { $('login-screen').hidden = false; $('profile').style.display = 'none'; }
  function render() {
    const visible = tasks.filter((task) => filter === 'all' || (filter === 'active' ? !task.completed : task.completed));
    const completed = tasks.filter((task) => task.completed).length;
    const remaining = tasks.length - completed;
    const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    $('total-stat').textContent = tasks.length;
    $('done-stat').textContent = completed;
    $('left-stat').textContent = remaining;
    $('nav-count').textContent = remaining;
    $('task-total').textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;
    $('progress-label').textContent = `${percent}%`;
    $('progress-fill').style.width = `${percent}%`;
    $('progress-note').textContent = tasks.length ? (percent === 100 ? 'You did it — every task complete!' : `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left in your plan`) : 'Your first step is waiting';
    $('list-subtitle').textContent = tasks.length ? `${remaining} still to do` : 'A fresh start';
    $('task-list').innerHTML = visible.map((task) => `<article class="task-row${task.completed ? ' completed' : ''}" data-id="${safeText(task.id)}"><button class="task-check" type="button" data-action="toggle" aria-label="Mark ${safeText(task.title)} ${task.completed ? 'incomplete' : 'complete'}" aria-pressed="${task.completed}">${task.completed ? '✓' : ''}</button><div class="task-copy"><span class="task-name">${safeText(task.title)}</span><span class="task-meta">${task.course ? `<span class="course-tag">${safeText(task.course)}</span>` : '<span>Study task</span>'}<span>·</span><span>${safeText(dateLabel(new Date(task.createdAt)))}</span></span></div><button class="delete-task" type="button" data-action="delete" aria-label="Delete ${safeText(task.title)}" title="Delete task">×</button></article>`).join('');
    const noTasks = tasks.length === 0;
    $('empty-state').classList.toggle('show', noTasks);
    $('task-list').style.display = noTasks ? 'none' : 'grid';
    $('empty-state').querySelector('h3').textContent = noTasks ? 'Your plan starts here' : 'Nothing in this view';
    $('empty-state').querySelector('p').textContent = noTasks ? 'No tasks yet. Add a study task above and give your next session a little direction.' : (filter === 'active' ? 'You have no tasks to do right now. Nice work!' : 'No completed tasks yet. Finish a task to see it here.');
    $('empty-add').style.display = noTasks ? '' : 'none';
    if (!noTasks && visible.length === 0) $('empty-state').classList.add('show');
    $('task-list').style.display = visible.length ? 'grid' : 'none';
    document.querySelectorAll('.filter').forEach((button) => { const active = button.dataset.filter === filter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  }
  function persist() {
    if (!write(userTasksKey(), tasks)) alert('Your browser could not save this change. Check that local storage is enabled.');
  }
  function clearTitleError() { titleInput.classList.remove('invalid'); titleInput.removeAttribute('aria-invalid'); $('title-error').textContent = ''; }
  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) { titleInput.classList.add('invalid'); titleInput.setAttribute('aria-invalid', 'true'); $('title-error').textContent = 'Please enter a task title before adding it.'; titleInput.focus(); return; }
    tasks.unshift({ id: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`), title, course: courseInput.value.trim(), completed: false, createdAt: new Date().toISOString() });
    persist(); taskForm.reset(); clearTitleError(); render(); titleInput.focus();
  });
  titleInput.addEventListener('input', clearTitleError);
  $('task-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('.task-row');
    const task = tasks.find((item) => item.id === row?.dataset.id);
    if (!task) return;
    if (button.dataset.action === 'toggle') task.completed = !task.completed;
    else if (button.dataset.action === 'delete') tasks = tasks.filter((item) => item.id !== task.id);
    persist(); render();
  });
  document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { filter = button.dataset.filter; render(); }));
  $('empty-add').addEventListener('click', () => titleInput.focus());
  $('logout').addEventListener('click', () => { localStorage.removeItem(KEYS.session); showLogin(); });
  $('toggle-password').addEventListener('click', () => { const field = $('login-password'); const showing = field.type === 'text'; field.type = showing ? 'password' : 'text'; $('toggle-password').textContent = showing ? 'Show' : 'Hide'; $('toggle-password').setAttribute('aria-label', showing ? 'Show password' : 'Hide password'); });
  $('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('login-name').value.trim(), email = $('login-email').value.trim().toLowerCase(), password = $('login-password').value;
    const error = $('login-error');
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.trim().length < 4) { error.textContent = 'Enter your name, a valid email address, and a password of at least 4 characters.'; return; }
    user = { name, email };
    write(KEYS.user, user); write(KEYS.session, true);
    error.textContent = '';
    showApp();
  });
  const now = new Date();
  $('today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(now);
  if (user && read(KEYS.session, false)) showApp(); else showLogin();
})();
