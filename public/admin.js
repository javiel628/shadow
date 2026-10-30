
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const sessionList = document.getElementById('sessionList');

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  loadSessions();
}

function showLogin() {
  dashboardView.hidden = true;
  loginView.hidden = false;
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginMessage.textContent = 'Checking login...';

  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value
      })
    });

    loginForm.reset();
    loginMessage.textContent = '';
    showDashboard();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

async function checkLogin() {
  try {
    await api('/api/admin/me');
    showDashboard();
  } catch {
    showLogin();
  }
}

function makeElement(tag, className, content) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = content;
  return element;
}

function renderSessions(sessions) {
  sessionList.replaceChildren();

  document.getElementById('totalCount').textContent = sessions.length;
  document.getElementById('connectedCount').textContent =
    sessions.filter(item => item.connected).length;
  document.getElementById('disconnectedCount').textContent =
    sessions.filter(item => !item.connected).length;

  if (!sessions.length) {
    sessionList.append(
      makeElement('div', 'empty', 'No portal accounts have been paired yet.')
    );
    return;
  }

  sessions.forEach(item => {
    const card = makeElement('article', 'session-card', '');
    const info = makeElement('div', 'account-info', '');
    const phone = makeElement('div', 'phone', item.phone);
    const id = makeElement('div', 'session-id', `SESSION: ${item.id}`);
    const status = makeElement(
      'div',
      `connection ${item.connected ? 'online' : 'offline'}`,
      item.connected ? '● CONNECTED' : '● DISCONNECTED'
    );

    info.append(phone, id, status);

    const remove = makeElement('button', 'delete-btn', 'DELETE');
    remove.type = 'button';
    remove.addEventListener('click', () => deleteSession(item.id, remove));

    card.append(info, remove);
    sessionList.append(card);
  });
}

async function loadSessions() {
  sessionList.replaceChildren(
    makeElement('div', 'empty', 'Loading paired accounts...')
  );

  try {
    const data = await api('/api/admin/sessions');
    renderSessions(data.sessions || []);
  } catch (error) {
    sessionList.replaceChildren(
      makeElement('div', 'empty', error.message)
    );
  }
}

async function deleteSession(id, button) {
  const confirmed = confirm(
    'Delete this paired account? This logs out the WhatsApp account and removes its saved session files. This cannot be undone.'
  );

  if (!confirmed) return;

  button.disabled = true;
  button.textContent = 'DELETING...';

  try {
    await api(`/api/admin/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    await loadSessions();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
    button.textContent = 'DELETE';
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadSessions);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await api('/api/admin/logout', { method: 'POST' });
  } finally {
    showLogin();
  }
});

checkLogin();
