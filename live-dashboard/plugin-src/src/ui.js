function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char]));
}

function valueFontSize(value) {
  const length = String(value).length;
  if (length <= 3) return 48;
  if (length <= 5) return 36;
  if (length <= 7) return 27;
  if (length <= 9) return 20;
  return 18;
}

function compactMetric(value) {
  const number = Math.max(0, Number(value) || 0);
  const units = ['', 'k', 'm', 'b'];
  let unit = Math.min(units.length - 1, Math.floor(Math.log10(Math.max(1, number)) / 3));
  let scaled = number / (1000 ** unit);
  let decimals = unit > 0 && scaled < 10 ? 1 : 0;
  let rounded = Number(scaled.toFixed(decimals));
  if (rounded >= 1000 && unit < units.length - 1) {
    unit += 1;
    scaled = number / (1000 ** unit);
    decimals = scaled < 10 ? 1 : 0;
    rounded = Number(scaled.toFixed(decimals));
  }
  return `${rounded.toFixed(decimals).replace(/\.0$/, '').replace('.', ',')}${units[unit]}`;
}

function formatDurationMs(value) {
  const seconds = Math.max(0, Math.floor((Number(value) || 0) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(number => String(number).padStart(2, '0')).join(':');
}

function healthSvg(cpu, fps, drops, title = 'OBS HEALTH') {
  const rows = [
    ['CPU', `${Math.max(0, Number(cpu) || 0).toFixed(1)}%`],
    ['FPS', `${Math.max(0, Number(fps) || 0).toFixed(1)}`],
    ['DROPS', `${Math.max(0, Number(drops) || 0).toFixed(1)}%`]
  ];
  const body = rows.map((row, index) => {
    const y = 61 + index * 29;
    const color = row[0] === 'DROPS' && Number(drops) >= 1 ? '#ef4444' : '#ffffff';
    return `<text x="20" y="${y}" font-family="Arial" font-size="12" font-weight="700" fill="#9ca3af">${row[0]}</text><text x="124" y="${y}" text-anchor="end" font-family="Arial" font-size="19" font-weight="700" fill="${color}">${row[1]}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#0b1020"/><rect x="7" y="7" width="130" height="130" rx="14" fill="#151d31" stroke="#293653" stroke-width="2"/><text x="72" y="27" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#a78bfa">${escapeXml(truncateLabel(title, 16))}</text>${body}</svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function truncateLabel(value, max = 16) {
  const text = String(value || 'SELECT INPUT');
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 3))}...`;
}

function dbWidth(db) { const value = Number(db); return Math.round(Math.max(0, Math.min(1, ((Number.isFinite(value) ? value : -60) + 60) / 60)) * 108); }

function audioMeterSvg(name, currentDb = -60, peakDb = -60, held = false, title = 'AUDIO CHECK') {
  const current = Math.max(-60, Number(currentDb) || -60);
  const peak = Math.max(-60, Number(peakDb) || -60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#0b1020"/><rect x="7" y="7" width="130" height="130" rx="14" fill="#151d31" stroke="#293653" stroke-width="2"/><text x="72" y="24" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#a78bfa">${escapeXml(truncateLabel(title, 16))}</text><text x="72" y="41" text-anchor="middle" font-family="Arial" font-size="10" fill="#d1d5db">${escapeXml(truncateLabel(name, 18))}</text><text x="18" y="61" font-family="Arial" font-size="10" fill="#9ca3af">NOW</text><text x="126" y="61" text-anchor="end" font-family="Arial" font-size="13" font-weight="700" fill="#fff">${current.toFixed(1)} dB</text><rect x="18" y="68" width="108" height="13" rx="6" fill="#273149"/><rect x="18" y="68" width="${dbWidth(current)}" height="13" rx="6" fill="#22c55e"/><text x="18" y="101" font-family="Arial" font-size="10" fill="#9ca3af">${held ? 'PEAK HOLD' : 'PEAK'}</text><text x="126" y="101" text-anchor="end" font-family="Arial" font-size="13" font-weight="700" fill="#fff">${peak.toFixed(1)} dB</text><rect x="18" y="108" width="108" height="10" rx="5" fill="#273149"/><rect x="18" y="108" width="${dbWidth(peak)}" height="10" rx="5" fill="#f59e0b"/></svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function balanceState(delta) {
  const value = Number(delta) || 0;
  return value >= 6 && value <= 12 ? 'OK' : ((value >= 3 && value < 15) ? 'EDGE' : 'BAD');
}

function audioBalanceSvg(target, reference, delta, targetDb = -60, referenceDb = -60, title = 'AUDIO BALANCE') {
  const value = Number(delta) || 0;
  const status = balanceState(value);
  const color = status === 'OK' ? '#22c55e' : (status === 'EDGE' ? '#f59e0b' : '#ef4444');
  return keySvg(title, `${value >= 0 ? '+' : ''}${value.toFixed(1)}`, `T ${Number(targetDb).toFixed(0)} • R ${Number(referenceDb).toFixed(0)}`, color);
}

function audioBalanceStatusSvg(targetName, referenceName, delta, title = 'AUDIO BALANCE') {
  const status = balanceState(delta);
  const color = status === 'OK' ? '#22c55e' : (status === 'EDGE' ? '#f59e0b' : '#ef4444');
  return keySvg(title, status, `${truncateLabel(targetName, 7)} / ${truncateLabel(referenceName, 7)}`, color);
}

function audioBalanceMetersSvg(targetName, referenceName, target = {}, reference = {}, title = 'BALANCE METERS') {
  const rows = [
    { name: targetName, y: 47, peak: target.peakDb ?? -60, color: '#22c55e' },
    { name: referenceName, y: 100, peak: reference.peakDb ?? -60, color: '#60a5fa' }
  ];
  const body = rows.map(row => {
    return `<text x="18" y="${row.y}" font-family="Arial" font-size="10" font-weight="700" fill="#fff">${escapeXml(truncateLabel(row.name, 9))}</text><text x="126" y="${row.y}" text-anchor="end" font-family="Arial" font-size="10" fill="#9ca3af">${Number(row.peak).toFixed(1)} dB</text><rect x="18" y="${row.y + 9}" width="108" height="14" rx="7" fill="#273149"/><rect x="18" y="${row.y + 9}" width="${dbWidth(row.peak)}" height="14" rx="7" fill="${row.color}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#0b1020"/><rect x="7" y="7" width="130" height="130" rx="14" fill="#151d31" stroke="#293653" stroke-width="2"/><text x="72" y="25" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#a78bfa">${escapeXml(truncateLabel(title, 16))}</text>${body}</svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function avatarSvg(name, avatar, connected, title = '') {
  const image = avatar ? `<defs><clipPath id="c"><circle cx="72" cy="62" r="39"/></clipPath></defs><image href="${avatar}" x="33" y="23" width="78" height="78" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>` : `<circle cx="72" cy="62" r="39" fill="#293653"/><text x="72" y="75" text-anchor="middle" font-family="Arial" font-size="40" fill="#a78bfa">T</text>`;
  const heading = title ? `<text x="72" y="19" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#a78bfa">${escapeXml(truncateLabel(title, 17))}</text>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#0b1020"/><rect x="7" y="7" width="130" height="130" rx="14" fill="#151d31" stroke="#293653" stroke-width="2"/>${heading}${image}<circle cx="105" cy="91" r="9" fill="${connected ? '#22c55e' : '#ef4444'}" stroke="#151d31" stroke-width="3"/><text x="72" y="123" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#fff">${escapeXml(truncateLabel(name || (connected ? 'TWITCH' : 'SETUP')))}</text></svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function formatTimerMs(value) {
  const negative = Number(value) < 0;
  const seconds = Math.floor(Math.abs(Number(value) || 0) / 1000);
  const formatted = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(number => String(number).padStart(2, '0')).join(':');
  return negative ? `-${formatted}` : formatted;
}

function absoluteState(db, minDb = -20, maxDb = -8) {
  const value = Number(db);
  if (value < Number(minDb)) return 'QUIET';
  if (value > Number(maxDb)) return 'LOUD';
  return 'OK';
}

function audioAbsoluteSvg(name, peakDb, minDb, maxDb, title = 'ABSOLUTE LEVEL') {
  const status = absoluteState(peakDb, minDb, maxDb);
  const color = status === 'OK' ? '#22c55e' : '#f59e0b';
  return keySvg(title, `${Number(peakDb).toFixed(1)}`, `${status} • ${Number(minDb).toFixed(0)}…${Number(maxDb).toFixed(0)} dB`, color);
}

function audioAbsoluteStatusSvg(name, peakDb, minDb, maxDb, title = 'ABSOLUTE LEVEL') {
  const status = absoluteState(peakDb, minDb, maxDb);
  return keySvg(title, status, `${truncateLabel(name, 10)} • ${Number(peakDb).toFixed(1)} dB`, status === 'OK' ? '#22c55e' : '#f59e0b');
}

function audioAbsoluteMeterSvg(name, peakDb, minDb, maxDb, title = 'ABSOLUTE LEVEL') {
  const peak = Number(peakDb);
  const status = absoluteState(peak, minDb, maxDb);
  const x1 = 18 + dbWidth(minDb), x2 = 18 + dbWidth(maxDb), peakX = 18 + dbWidth(peak);
  const color = status === 'OK' ? '#22c55e' : '#f59e0b';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#0b1020"/><rect x="7" y="7" width="130" height="130" rx="14" fill="#151d31" stroke="#293653" stroke-width="2"/><text x="72" y="25" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#a78bfa">${escapeXml(truncateLabel(title, 16))}</text><text x="72" y="45" text-anchor="middle" font-family="Arial" font-size="10" fill="#d1d5db">${escapeXml(truncateLabel(name, 18))}</text><rect x="18" y="62" width="108" height="18" rx="9" fill="#273149"/><rect x="${x1}" y="62" width="${Math.max(1, x2 - x1)}" height="18" fill="#14532d"/><line x1="${peakX}" y1="57" x2="${peakX}" y2="85" stroke="${color}" stroke-width="4"/><text x="72" y="108" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${color}">${peak.toFixed(1)}</text><text x="72" y="126" text-anchor="middle" font-family="Arial" font-size="10" font-weight="700" fill="#9ca3af">${status} • ${Number(minDb).toFixed(0)}…${Number(maxDb).toFixed(0)} dB</text></svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function keySvg(label, value, subtitle = '', color = '#ffffff') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
    <rect width="144" height="144" rx="18" fill="#0b1020"/>
    <rect x="7" y="7" width="130" height="130" rx="14" fill="#151d31" stroke="#293653" stroke-width="2"/>
    <text x="72" y="32" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" letter-spacing="1" fill="#a78bfa">${escapeXml(truncateLabel(label, 16))}</text>
    <text x="72" y="83" text-anchor="middle" font-family="Arial" font-size="${valueFontSize(value)}" font-weight="700" fill="${color}">${escapeXml(value)}</text>
    <text x="72" y="113" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#9ca3af">${escapeXml(subtitle)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function timerSvg(value, subtitle, color = '#ffffff', title = 'TIMER') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#0b1020"/><rect x="7" y="7" width="130" height="130" rx="14" fill="#151d31" stroke="#293653" stroke-width="2"/><text x="72" y="27" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" letter-spacing="1" fill="#a78bfa">${escapeXml(truncateLabel(title, 16))}</text><text x="72" y="82" text-anchor="middle" font-family="Impact,Arial Narrow,Arial" font-size="27" font-stretch="condensed" fill="${color}">${escapeXml(value)}</text><text x="72" y="112" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#9ca3af">${escapeXml(subtitle)}</text></svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

module.exports = { absoluteState, audioAbsoluteMeterSvg, audioAbsoluteStatusSvg, audioAbsoluteSvg, audioBalanceMetersSvg, audioBalanceStatusSvg, audioBalanceSvg, audioMeterSvg, avatarSvg, balanceState, compactMetric, escapeXml, formatDurationMs, formatTimerMs, healthSvg, keySvg, timerSvg, truncateLabel, valueFontSize };
