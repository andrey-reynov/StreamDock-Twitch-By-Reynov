const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const manifest = require(path.resolve(__dirname, '../../com.personal.streamdock.livedashboard.sdPlugin/manifest.json'));

test('only Dashboard setup exposes the shared connection property inspector', () => {
  const shared = manifest.Actions.filter(action => action.PropertyInspectorPath === 'propertyInspector/index.html');
  assert.deepEqual(shared.map(action => action.UUID), ['com.personal.streamdock.livedashboard.setup']);
  assert.equal(manifest.Actions.length, 19);
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.audiocheck')).PropertyInspectorPath, 'propertyInspector/track.html');
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.audiobalance')).PropertyInspectorPath, 'propertyInspector/balance.html');
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.audiobalancemeters')).PropertyInspectorPath, 'propertyInspector/balance.html');
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.audioabsolute')).PropertyInspectorPath, 'propertyInspector/track.html');
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.peakreset')).PropertyInspectorPath, 'propertyInspector/title.html');
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.audiobalancemeters')).VisibleInActionsList, false);
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.audioabsolute')).VisibleInActionsList, false);
  const visibleAudio = manifest.Actions.filter(action => action.VisibleInActionsList !== false && /audio/i.test(`${action.Name} ${action.Tooltip}`));
  assert.deepEqual(visibleAudio.map(action => action.Name), ['[AUDIO] Track', '[AUDIO] Compare', '[AUDIO] Reset Peaks']);
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.timer')).PropertyInspectorPath, 'propertyInspector/timer.html');
  assert.equal(manifest.Actions.find(action => action.UUID.endsWith('.marker')).PropertyInspectorPath, 'propertyInspector/marker.html');
  for (const action of manifest.Actions.filter(action => action.UUID !== 'com.personal.streamdock.livedashboard.setup')) {
    assert.equal(action.Controllers.includes('Keypad') || action.Controllers.includes('Information'), true);
  }
});

test('visible actions use purpose prefixes and package version matches manifest', () => {
  const packageJson = require('../package.json');
  const prefixes = new Set(['[SETUP]', '[OBS]', '[AUDIO]', '[TWITCH]', '[TOOLS]', '[INFO]']);
  for (const action of manifest.Actions.filter(action => action.VisibleInActionsList !== false)) {
    assert.equal(prefixes.has(action.Name.split(' ')[0]), true, action.Name);
  }
  assert.equal(manifest.Version, packageJson.version);
  assert.equal(manifest.Name, 'Reynov Live Dashboard');
});
