
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('adminLoginForm');
  const loginBox = document.getElementById('adminLogin');
  const dashboard = document.getElementById('adminDashboard');
  const loginMessage = document.getElementById('adminLoginMessage');
  const sessionsMessage = document.getElementById('sessionsMessage');
  const sessionsList = document.getElementById('sessionsList');

  const totalSessions = document.getElementById('totalSessions');
  const connectedSessions = document.getElementById('connectedSessions');

  const loginBtn = document.getElementById('adminLoginBtn');
  const refreshBtn = document.getElementById('refreshSessions');
  const logoutBtn = document.getElementById('adminLogout');

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
      throw new Error(data.error || 'Request failed.');
    }

    return data;
  }

  function showMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? '#ff6464' : '#00ffcc';
  }

  function showDashboard() {
    loginBox.hidden = true;
    dashboard.hidden = false;
    loadSessions();
  }

  function showLogin() {
    loginBox.hidden = false;
    dashboard.hidden = true;
  }

  function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-item';

    const details = document.createElement('div');
    details.className = 'session-details';

    const number = document.createElement('strong');
    number.textContent = session.number || 'Unknown number';

    const status = document.createElement('p');
    status.textContent = session.connected ? 'CONNECTED' : 'OFFLINE';
    status.className = session.connected ? 'session-connected' : 'session-offline';

    const id = document.createElement('small');
    id.textContent = session.id;

    details.append(number, status, id);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-session-btn';
    deleteBtn.textContent = 'DELETE';

    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this saved WhatsApp session?')) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'DELETING...';

      try {
        await api('/api/admin/sessions/' + encodeURIComponent(session.id), {
          method: 'DELETE'
        });

        showMessage(sessionsMessage, 'Session deleted.');
        await loadSessions();
      } catch (error) {
        showMessage(sessionsMessage, error.message, true);
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'DELETE';
      }
    });

    card.append(details, deleteBtn);
    return card;
  }

  async function loadSessions() {
    sessionsList.textContent = 'Loading sessions...';
    showMessage(sessionsMessage, '');

    try {
      const data = await api('/api/admin/sessions');

      totalSessions.textContent = data.total ?? 0;
      connectedSessions.textContent = data.connected ?? 0;

      sessionsList.replaceChildren();

      if (!data.sessions || data.sessions.length === 0) {
        sessionsList.textContent = 'No saved pairing sessions found.';
        return;
      }

      data.sessions.forEach(session => {
        sessionsList.appendChild(createSessionCard(session));
      });
    } catch (error) {
      sessionsList.textContent = error.message;

      if (error.message.toLowerCase().includes('log in')) {
        showLogin();
      }
    }
  }

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();

    loginBtn.disabled = true;
    loginBtn.textContent = 'SIGNING IN...';

    showMessage(loginMessage, '');

    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      loginForm.reset();
      showDashboard();
    } catch (error) {
      showMessage(loginMessage, error.message, true);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'LOGIN TO DASHBOARD →';
    }
  });

  refreshBtn?.addEventListener('click', loadSessions);

  logoutBtn?.addEventListener('click', async () => {
    try {
      await api('/api/admin/logout', {
        method: 'POST'
      });

      showLogin();
      showMessage(loginMessage, 'You have logged out.');
    } catch (error) {
      showMessage(sessionsMessage, error.message, true);
    }
  });

  // Restore an existing admin login when the page is opened.
  api('/api/admin/me')
    .then(showDashboard)
    .catch(showLogin);
});
