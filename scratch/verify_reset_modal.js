import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');

const htmlChecks = [
  'id="modal_reset_confirm"',
  'id="backdrop_reset_confirm"',
  'id="close_reset_confirm_btn"',
  'id="btn_cancel_reset"',
  'id="btn_confirm_reset"',
  'Reset Paper Trading Account',
  'Are you sure you want to reset your paper account?'
];

console.log('--- HTML CHECKS ---');
let htmlOk = true;
for (const c of htmlChecks) {
  const ok = html.includes(c);
  console.log(c, ok ? '✅' : '❌');
  if (!ok) htmlOk = false;
}

const css = fs.readFileSync('css/components.css', 'utf8');
const cssChecks = [
  '.reset-confirm-modal {',
  'z-index: 10000000 !important;',
  '.reset-confirm-card {',
  '.reset-impact-preview {',
  '.btn-confirm-reset {',
  '[data-theme="light"] .reset-confirm-card {'
];

console.log('\n--- CSS CHECKS ---');
let cssOk = true;
for (const c of cssChecks) {
  const ok = css.includes(c);
  console.log(c, ok ? '✅' : '❌');
  if (!ok) cssOk = false;
}

const js = fs.readFileSync('js/ui/terminalUI.js', 'utf8');
const jsChecks = [
  'document.getElementById(\'modal_reset_confirm\')',
  'document.getElementById(\'btn_confirm_reset\')',
  'confirmResetBtn.addEventListener(\'click\'',
  'closeResetConfirmModal()'
];

console.log('\n--- JS CHECKS ---');
let jsOk = true;
for (const c of jsChecks) {
  const ok = js.includes(c);
  console.log(c, ok ? '✅' : '❌');
  if (!ok) jsOk = false;
}

// Make sure NO native confirm in reset handler
const hasOldHindiConfirm = js.includes('Kya tum account balance aur journal reset');
console.log('\nOld Native Confirm Removed:', !hasOldHindiConfirm ? '✅' : '❌');

if (!htmlOk || !cssOk || !jsOk || hasOldHindiConfirm) {
  console.error('\n❌ RESET MODAL AUDIT FAILED');
  process.exit(1);
} else {
  console.log('\n🎉 ALL RESET MODAL AUDIT TESTS PASSED!');
}
