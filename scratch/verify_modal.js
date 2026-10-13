import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');

const checks = [
  'id="btn_autopilot_settings"',
  'id="modal_autopilot_settings"',
  'id="backdrop_autopilot_settings"',
  'id="close_autopilot_settings_btn"',
  'id="btn_apply_recommended_preset"',
  'id="btn_save_autopilot_settings"',
  'id="input_autopilot_margin"',
  'id="select_autopilot_leverage"',
  'id="select_autopilot_maxtrades"',
  'id="input_autopilot_confluence"',
  'id="select_autopilot_min_rr"',
  'id="switch_autopilot_event_shield"',
  'onclick="if(window.openAutopilotSettings) window.openAutopilotSettings(event);"'
];

console.log('--- HTML CHECKS ---');
let allHtmlOk = true;
for (const c of checks) {
  const ok = html.includes(c);
  console.log(c, ok ? '✅' : '❌');
  if (!ok) allHtmlOk = false;
}

const css = fs.readFileSync('css/components.css', 'utf8');
const cssChecks = [
  '.terminal-modal {',
  'position: fixed !important',
  'z-index: 999999 !important',
  '.terminal-modal .modal-backdrop {',
  'backdrop-filter: blur(10px) !important',
  '.autopilot-settings-btn {',
  '.autopilot-settings-btn i {'
];

console.log('\n--- CSS CHECKS ---');
let allCssOk = true;
for (const c of cssChecks) {
  const ok = css.includes(c);
  console.log(c, ok ? '✅' : '❌');
  if (!ok) allCssOk = false;
}

const js = fs.readFileSync('js/ui/terminalUI.js', 'utf8');
const jsChecks = [
  'window.openAutopilotSettings = openAutopilotSettings;',
  'window.closeAutopilotSettings = closeAutopilotSettings;',
  "autopilotSettingsModal.classList.add('open');",
  "autopilotSettingsModal.style.display = 'flex';"
];

console.log('\n--- JS CHECKS ---');
let allJsOk = true;
for (const c of jsChecks) {
  const ok = js.includes(c);
  console.log(c, ok ? '✅' : '❌');
  if (!ok) allJsOk = false;
}

if (!allHtmlOk || !allCssOk || !allJsOk) {
  console.error('\n❌ AUDIT FAILED');
  process.exit(1);
} else {
  console.log('\n🎉 ALL 24/24 VERIFICATION AUDIT TESTS PASSED!');
}
