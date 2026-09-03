const WebSocket = require('ws');

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 2) result[argv[i].replace(/^-/, '')] = argv[i + 1];
  return result;
}

class StreamDockRuntime {
  constructor(argv = process.argv) {
    this.args = parseArgs(argv);
    this.actions = new Map();
    this.actionSettings = new Map();
    this.lastTitles = new Map();
    this.lastImages = new Map();
    this.globalSettings = {};
    this.onGlobalSettings = null;
    this.onSendToPlugin = null;
  }

  connect() {
    this.ws = new WebSocket(`ws://127.0.0.1:${this.args.port}`);
    this.ws.on('open', () => {
      this.send({ event: this.args.registerEvent, uuid: this.args.pluginUUID });
      this.send({ event: 'getGlobalSettings', context: this.args.pluginUUID });
    });
    this.ws.on('message', raw => this.handle(JSON.parse(raw.toString())));
    this.ws.on('error', error => console.error('StreamDock WebSocket:', error.message));
  }

  handle(message) {
    if (message.event === 'willAppear') {
      this.actions.set(message.context, message.action.split('.').pop());
      this.actionSettings.set(message.context, message.payload?.settings || {});
    }
    if (message.event === 'didReceiveSettings') this.actionSettings.set(message.context, message.payload?.settings || {});
    if (message.event === 'willDisappear') {
      this.actions.delete(message.context);
      this.actionSettings.delete(message.context);
      this.lastTitles.delete(message.context);
      this.lastImages.delete(message.context);
    }
    if (message.event === 'didReceiveGlobalSettings') {
      this.globalSettings = message.payload?.settings || {};
      this.onGlobalSettings?.(this.globalSettings);
    }
    if (message.event === 'sendToPlugin') this.onSendToPlugin?.(message.payload || {}, message.context);
    this.onEvent?.(message);
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }
  setTitle(context, title) {
    if (this.lastTitles.get(context) === title) return;
    this.lastTitles.set(context, title);
    this.send({ event: 'setTitle', context, payload: { target: 0, title } });
  }
  setImage(context, image) {
    if (this.lastImages.get(context) === image) return;
    this.lastImages.set(context, image);
    this.send({ event: 'setImage', context, payload: { target: 0, image } });
  }
  setGlobalSettings(settings) { this.globalSettings = settings; this.send({ event: 'setGlobalSettings', context: this.args.pluginUUID, payload: settings }); }
  setSettings(context, settings) { this.actionSettings.set(context, settings); this.send({ event: 'setSettings', context, payload: settings }); }
  openUrl(url) { this.send({ event: 'openUrl', payload: { url } }); }
  sendToPI(context, payload) { this.send({ event: 'sendToPropertyInspector', context, payload }); }
}

module.exports = { StreamDockRuntime, parseArgs };
