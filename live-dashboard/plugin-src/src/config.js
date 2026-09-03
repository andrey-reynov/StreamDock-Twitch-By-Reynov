const DEFAULT_TWITCH_CLIENT_ID = 'zci0ckdfg7fjdokb3ux1b0gvjvg8o0';
const TWITCH_APPLICATION_NAME = 'Reynov Live Dashboard';

function effectiveTwitchClientId(settings = {}) {
  return String(settings.twitchClientId || '').trim() || DEFAULT_TWITCH_CLIENT_ID;
}

module.exports = { DEFAULT_TWITCH_CLIENT_ID, TWITCH_APPLICATION_NAME, effectiveTwitchClientId };
