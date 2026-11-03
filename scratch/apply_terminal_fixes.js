import fs from 'fs';

// 1. terminal.html
let termHtml = fs.readFileSync('terminal.html', 'utf8');
termHtml = termHtml.replace(
  /title="Autonomous AI Execution: MONDAY will automatically enter confirmed Grade A setups with strict 1% risk \(Max 2 open trades\)"/g,
  'title="Autonomous AI Execution: MONDAY will automatically enter confirmed Grade A setups with strict 1:2 R:R (Configurable Standards)"'
);
termHtml = termHtml.replace(
  '<strong>1R = 1 Trade par maximum predefined risk (1% of $2,000 = $20.00)</strong>',
  '<strong id="r_explainer_callout">1R = 1 Trade par active risk unit (Configured Margin & Structural Stop Loss)</strong>'
);
fs.writeFileSync('terminal.html', termHtml, 'utf8');
console.log('terminal.html updated successfully');
