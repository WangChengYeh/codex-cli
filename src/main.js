const tauri = window.__TAURI__ || {};
const invoke = tauri.invoke || (() => Promise.reject(new Error('Tauri API unavailable')));
const eventApi = tauri.event || {};

const termEl = document.getElementById('terminal');
const sessOut = document.getElementById('sessionOut');
const status = document.getElementById('status');
const planText = document.getElementById('planText');
const workspaceEl = document.getElementById('workspace');

let lastRunId = null;
let currentSessionId = null;

// Terminal abstraction: prefer xterm.js if available, otherwise fall back to a <pre>.
let term = {
  write: (s) => {
    termEl.textContent += s;
    termEl.scrollTop = termEl.scrollHeight;
  }
};
if (window.Terminal) {
  try {
    const xterm = new window.Terminal({ cols: 80, rows: 24, convertEol: true });
    xterm.open(termEl);

    // Try to load FitAddon (UMD may expose different globals), best-effort.
    try {
      const FitCtor = (window.FitAddon && (window.FitAddon.FitAddon || window.FitAddon)) || window.FitAddon;
      if (typeof FitCtor === 'function') {
        const fit = new FitCtor();
        xterm.loadAddon(fit);
        // call fit once
        try { fit.fit(); } catch (e) {}
        window.addEventListener('resize', () => { try { fit.fit(); } catch (e) {} });
      }
    } catch (e) {}

    // Try to load WebLinksAddon
    try {
      const WL = (window.WebLinksAddon && (window.WebLinksAddon.WebLinksAddon || window.WebLinksAddon)) || window.WebLinksAddon;
      if (typeof WL === 'function') { xterm.loadAddon(new WL()); }
    } catch (e) {}

    // Try to load SearchAddon (expose to window for UI usage)
    try {
      const SA = (window.SearchAddon && (window.SearchAddon.SearchAddon || window.SearchAddon)) || window.SearchAddon;
      if (typeof SA === 'function') {
        const search = new SA();
        xterm.loadAddon(search);
        window._xterm_search = search;
      }
    } catch (e) {}

    term = {
      write: (s) => xterm.write(s.replace(/\n/g, '\r\n')),
    };
  } catch (e) {
    // fallback to pre-based term
  }
}

// Show workspace path
invoke('get_workspace').then(ws => {
  workspaceEl.textContent = `Workspace: ${ws}`;
}).catch(() => {});

// Listen to command-progress and session events
if (eventApi.listen) {
  eventApi.listen('command-progress', e => {
    const { phase, run_id, chunk, code } = e.payload;
    if (phase === 'start') { lastRunId = run_id; term.write(`\r\n[run ${run_id}] start\r\n`); }
    if (phase === 'stdout') term.write(chunk);
    if (phase === 'stderr') term.write(chunk);
    if (phase === 'done') term.write(`[run ${run_id}] exit code ${code}\r\n`);
  });
  eventApi.listen('session-data', e => {
    const { session_id, data, stream } = e.payload;
    sessOut.textContent += data;
    sessOut.scrollTop = sessOut.scrollHeight;
  });
  eventApi.listen('session-exit', e => {
    const { session_id, code } = e.payload;
    sessOut.textContent += `\r\n[session ${session_id}] exited ${code}\r\n`;
    sessOut.scrollTop = sessOut.scrollHeight;
  });
  eventApi.listen('plan-updated', e => {
    const plan = e.payload && e.payload.plan ? e.payload.plan : null;
    status.textContent += 'plan-updated\n';
    if (plan && plan.steps) {
      planText.value = JSON.stringify(plan.steps, null, 2);
    }
  });
}

document.getElementById('runPwd').addEventListener('click', async () => {
  await invoke('run_command', { args: ['/bin/zsh', '-lc', 'pwd'] }).catch(e => { status.textContent += `run_command error: ${e}\n`; });
});

document.getElementById('runLs').addEventListener('click', async () => {
  await invoke('run_command', { args: ['/bin/zsh', '-lc', 'ls -la'] }).catch(e => { status.textContent += `run_command error: ${e}\n`; });
});

document.getElementById('startSession').addEventListener('click', async () => {
  try {
    const sid = await invoke('start_session', { req: { input: '', cwd: null } });
    currentSessionId = sid;
    sessOut.textContent += `[session ${currentSessionId}] started\n`;
  } catch (e) {
    status.textContent += `start_session error: ${e}\n`;
  }
});

document.getElementById('sendHello').addEventListener('click', async () => {
  if (!currentSessionId) return;
  await invoke('send_input', { session_id: currentSessionId, data: 'hello\n' }).catch(e => { status.textContent += `send_input error: ${e}\n`; });
});

document.getElementById('stopSession').addEventListener('click', async () => {
  if (!currentSessionId) return;
  await invoke('stop_session', { session_id: currentSessionId }).catch(e => { status.textContent += `stop_session error: ${e}\n`; });
  currentSessionId = null;
});

document.getElementById('loadPlan').addEventListener('click', async () => {
  try {
    const plan = await invoke('get_plan');
    planText.value = JSON.stringify(plan.steps || [], null, 2);
  } catch (e) {
    status.textContent += `get_plan error: ${e}\n`;
  }
});

document.getElementById('savePlan').addEventListener('click', async () => {
  try {
    const steps = JSON.parse(planText.value);
    await invoke('update_plan', { req: { steps } });
    status.textContent += 'Plan saved.\n';
  } catch (e) {
    status.textContent += `Plan error: ${e}\n`;
  }
});
