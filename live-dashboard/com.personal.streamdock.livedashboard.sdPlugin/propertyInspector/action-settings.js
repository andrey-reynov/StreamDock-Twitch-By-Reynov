let socket, uuid, context, action, settings = {}, globals = {};
const byId = id => document.getElementById(id);
const mode = document.body.dataset.mode;

function send(message) { socket?.send(JSON.stringify(message)); }
function fillSelect(select, selected) {
  const inputs = globals.connectionStatus?.obsInputs || [];
  select.replaceChildren();
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Select an OBS input…';
  select.appendChild(empty);
  for (const name of inputs) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  select.value = selected || '';
}
function updateTrackModeVisibility() {
  if (mode !== 'track') return;
  byId('rangeSection').hidden = byId('displayMode').value === 'live';
}
function render() {
  if (byId('customTitle')) byId('customTitle').value = settings.customTitle || '';
  if (mode === 'track') {
    fillSelect(byId('inputName'), settings.inputName);
    byId('holdPeak').checked = Boolean(settings.holdPeak);
    byId('displayMode').value = settings.displayMode || (action?.endsWith('.audioabsolute') ? 'meter' : 'live');
    byId('minDb').value = Number.isFinite(Number(settings.minDb)) ? settings.minDb : -20;
    byId('maxDb').value = Number.isFinite(Number(settings.maxDb)) ? settings.maxDb : -8;
    updateTrackModeVisibility();
  }
  if (mode === 'balance') {
    fillSelect(byId('targetInput'), settings.targetInput);
    fillSelect(byId('referenceInput'), settings.referenceInput);
    byId('levelMode').value = settings.levelMode || 'peak';
    byId('displayMode').value = settings.displayMode || (action?.endsWith('.audiobalancemeters') ? 'meters' : 'number');
    byId('holdTargetPeak').checked = Boolean(settings.holdTargetPeak);
    byId('holdReferencePeak').checked = Boolean(settings.holdReferencePeak);
  }
  if (mode === 'timer') {
    const total = Math.max(0, Number(settings.durationSeconds) || 300);
    byId('hours').value = Math.floor(total / 3600);
    byId('minutes').value = Math.floor(total / 60) % 60;
    byId('seconds').value = total % 60;
  }
  if (mode === 'marker') byId('description').value = settings.description || '';
}
function save(next) {
  settings = { ...settings, ...next };
  send({ event: 'setSettings', context, payload: settings });
  // Some StreamDock builds acknowledge setSettings in the inspector but do
  // not forward didReceiveSettings to the plugin. Mirror the update through
  // global settings so the plugin can persist it for this action context.
  send({
    event: 'setGlobalSettings',
    context: uuid,
    payload: {
      ...globals,
      actionSettingsRequest: { id: Date.now(), context, settings }
    }
  });
  byId('status').textContent = 'Saved.';
}

window.connectElgatoStreamDeckSocket = (port, inUuid, registerEvent, info, actionInfo) => {
  uuid = inUuid;
  const parsed = JSON.parse(actionInfo);
  context = parsed.context;
  action = parsed.action;
  settings = parsed.payload?.settings || {};
  socket = new WebSocket(`ws://127.0.0.1:${port}`);
  socket.onopen = () => {
    send({ event: registerEvent, uuid });
    send({ event: 'getSettings', context });
    send({ event: 'getGlobalSettings', context: uuid });
  };
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.event === 'didReceiveSettings') settings = message.payload?.settings || {};
    if (message.event === 'didReceiveGlobalSettings') globals = message.payload?.settings || {};
    render();
  };
  render();
};

byId('save').onclick = () => {
  const customTitle = byId('customTitle')?.value.trim() || '';
  if (mode === 'title') save({ customTitle });
  if (mode === 'track') {
    const minDb = Math.min(Number(byId('minDb').value), Number(byId('maxDb').value));
    const maxDb = Math.max(Number(byId('minDb').value), Number(byId('maxDb').value));
    save({ customTitle, inputName: byId('inputName').value, holdPeak: byId('holdPeak').checked, displayMode: byId('displayMode').value, minDb, maxDb });
  }
  if (mode === 'balance') save({ customTitle, targetInput: byId('targetInput').value, referenceInput: byId('referenceInput').value, levelMode: byId('levelMode').value, displayMode: byId('displayMode').value, holdTargetPeak: byId('holdTargetPeak').checked, holdReferencePeak: byId('holdReferencePeak').checked });
  if (mode === 'timer') save({ customTitle, durationSeconds: Math.max(0, Number(byId('hours').value) * 3600 + Number(byId('minutes').value) * 60 + Number(byId('seconds').value)), resetNonce: Date.now() });
  if (mode === 'marker') save({ customTitle, description: byId('description').value.trim().slice(0, 140) });
};

if (mode === 'track') byId('displayMode').onchange = updateTrackModeVisibility;
