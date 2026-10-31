
'use strict';

const form = document.getElementById('pairForm');
const numberInput = document.getElementById('number');
const generateBtn = document.getElementById('generateBtn');
const result = document.getElementById('result');
const statusPill = document.getElementById('statusPill');
const message = document.getElementById('message');
const codeBox = document.getElementById('codeBox');
const codeEl = document.getElementById('code');
const instructions = document.getElementById('instructions');
const copyBtn = document.getElementById('copyBtn');

let pollTimer = null;
let activeRequestId = null;
let checkingStatus = false;

const terminalStatuses = ['connected', 'error', 'expired'];

function showStatus(status, text) {
  result.classList.remove('hidden');

  statusPill.textContent = String(status || 'unknown')
    .replace(/_/g, ' ')
    .toUpperCase();

  statusPill.className = 'status-pill';

  if (status === 'connected') {
    statusPill.classList.add('good');
  }

  if (status === 'error' || status === 'expired') {
    statusPill.classList.add('bad');
  }

  message.textContent = text || 'Waiting for an update...';
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  checkingStatus = false;
}

function finishRequest(buttonText = 'GENERATE NEW CODE') {
  stopPolling();
  activeRequestId = null;
  generateBtn.disabled = false;

  const span = generateBtn.querySelector('span');
  if (span) span.textContent = buttonText;
}

async function pollStatus(requestId) {
  if (!requestId || checkingStatus || requestId !== activeRequestId) {
    return;
  }

  checkingStatus = true;

  try {
    const response = await fetch(
      `/api/status/${encodeURIComponent(requestId)}`,
      { cache: 'no-store' }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Could not check pairing status.');
    }

    showStatus(data.status, data.message);

    if (data.status === 'code_ready' && data.code) {
      codeEl.textContent = data.code;
      codeBox.classList.remove('hidden');
      instructions.classList.remove('hidden');
    } else {
      codeBox.classList.add('hidden');
      instructions.classList.toggle(
        'hidden',
        data.status !== 'connected'
      );
    }

    if (terminalStatuses.includes(data.status)) {
      finishRequest('GENERATE NEW CODE');
    }
  } catch (err) {
    showStatus(
      'error',
      err.message || 'Status check failed. Please try again.'
    );

    finishRequest('TRY AGAIN');
  } finally {
    checkingStatus = false;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const number = numberInput.value.replace(/\D/g, '');

  if (!/^\d{8,15}$/.test(number) || number.startsWith('0')) {
    showStatus(
      'error',
      'Enter a valid international phone number including its country code.'
    );
    return;
  }

  stopPolling();
  activeRequestId = null;

  codeBox.classList.add('hidden');
  instructions.classList.add('hidden');
  codeEl.textContent = '';

  generateBtn.disabled = true;

  const buttonText = generateBtn.querySelector('span');
  if (buttonText) buttonText.textContent = 'STARTING SESSION…';

  showStatus(
    'starting',
    'Contacting SHADOW MD and requesting a WhatsApp pairing code…'
  );

  try {
    const response = await fetch('/api/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ number })
    });

    const data = await response.json();

    if (!response.ok || !data.ok || !data.requestId) {
      throw new Error(data.error || 'Pairing request failed.');
    }

    activeRequestId = data.requestId;

    await pollStatus(activeRequestId);

    // Start polling only if the request is still active.
    if (activeRequestId && generateBtn.disabled) {
      pollTimer = setInterval(() => {
        pollStatus(activeRequestId);
      }, 2200);

      if (buttonText) buttonText.textContent = 'PAIRING IN PROGRESS…';
    }

  } catch (err) {
    showStatus(
      'error',
      err.message || 'Could not start pairing.'
    );

    finishRequest('TRY AGAIN');
  }
});

copyBtn.addEventListener('click', async () => {
  const code = codeEl.textContent.trim();

  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);
    copyBtn.textContent = 'COPIED';

    setTimeout(() => {
      copyBtn.textContent = 'COPY CODE';
    }, 1500);

  } catch {
    copyBtn.textContent = 'SELECT CODE';
  }
});
