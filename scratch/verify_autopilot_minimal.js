import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');

const requiredIds = [
  'id="modal_autopilot_settings"',
  'id="close_autopilot_settings_btn"',
  'id="backdrop_autopilot_settings"',
  'id="btn_apply_recommended_preset"',
  'id="input_autopilot_margin"',
  'id="select_autopilot_leverage"',
  'id="select_autopilot_maxtrades"',
  'id="input_autopilot_confluence"',
  'id="label_autopilot_confluence"',
  'id="badge_confluence_val"',
  'id="select_autopilot_min_rr"',
  'id="switch_autopilot_event_shield"',
  'id="btn_reset_autopilot_settings"',
  'id="btn_save_autopilot_settings"'
];

console.log('--- HTML REQUIRED IDS ---');
let allIdsFound = true;
for (const id of requiredIds) {
  const found = html.includes(id);
  console.log(id, found ? '✅' : '❌');
  if (!found) allIdsFound = false;
}

// Check that Question Mark tooltips are present
const tooltipCount = (html.match(/help-tooltip-trigger/g) || []).length;
console.log('\nHelp Tooltip Triggers Count:', tooltipCount, tooltipCount >= 6 ? '✅' : '❌');

// Check that bulky chips and boxes were removed
const hasBulkyChips = html.includes('preset-chips-grid');
console.log('Bulky 6-chip preset grid removed:', !hasBulkyChips ? '✅' : '❌');

const hasBulkyShieldBox = html.includes('shield-field-box');
console.log('Bulky shield nested box removed:', !hasBulkyShieldBox ? '✅' : '❌');

const css = fs.readFileSync('css/components.css', 'utf8');
const cssClasses = [
  '.preset-banner-minimal',
  '.help-tooltip-trigger',
  '.help-tooltip-trigger::after',
  '.shield-row-minimal',
  '[data-theme="light"] .help-tooltip-trigger'
];

console.log('\n--- CSS CHECKS ---');
let allCssFound = true;
for (const c of cssClasses) {
  const found = css.includes(c);
  console.log(c, found ? '✅' : '❌');
  if (!found) allCssFound = false;
}

if (allIdsFound && tooltipCount >= 6 && !hasBulkyChips && !hasBulkyShieldBox && allCssFound) {
  console.log('\n🎉 ALL AUTOPILOT MODAL MINIMAL VERIFICATIONS PASSED!');
  process.exit(0);
} else {
  console.error('\n❌ VERIFICATION FAILED');
  process.exit(1);
}
