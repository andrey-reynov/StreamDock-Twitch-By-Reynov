const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, StreamDockRuntime } = require('../src/runtime');

test('parses StreamDock named launch arguments', () => {
  assert.deepEqual(parseArgs(['node', 'index.js', '-port', '1234', '-pluginUUID', 'com.test', '-registerEvent', 'registerPlugin']), {
    port: '1234', pluginUUID: 'com.test', registerEvent: 'registerPlugin'
  });
});

test('does not resend identical titles and images every render tick', () => {
  const runtime = new StreamDockRuntime(['node', 'index.js', '-pluginUUID', 'com.test']);
  const sent = [];
  runtime.ws = { readyState: 1, send(raw) { sent.push(JSON.parse(raw)); } };
  runtime.setTitle('key-1', '');
  runtime.setTitle('key-1', '');
  runtime.setImage('key-1', 'data:image/svg+xml,one');
  runtime.setImage('key-1', 'data:image/svg+xml,one');
  runtime.setImage('key-1', 'data:image/svg+xml,two');
  assert.deepEqual(sent.map(message => message.event), ['setTitle', 'setImage', 'setImage']);
});
