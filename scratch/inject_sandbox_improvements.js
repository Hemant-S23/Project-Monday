import fs from 'fs';

let html = fs.readFileSync('landing.html', 'utf8');

const targetCss = '.step-check-item.confirmed {';
const newCss = `
    .step-check-item.failed {
      border-color: var(--risk-border);
      background: rgba(239, 68, 68, 0.08);
      color: var(--risk);
    }

    .nifty-closed-tag {
      font-size: 0.6rem;
      font-family: var(--font-mono);
      font-weight: 700;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 1px 5px;
      border-radius: 4px;
      margin-left: 5px;
      vertical-align: middle;
    }

    .session-closed-mode {
      filter: grayscale(0.85) contrast(0.9);
      opacity: 0.72;
      transition: all 0.3s ease;
    }

    .sandbox-conversion-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
      padding: 14px 20px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .sandbox-terminal-link {
      color: var(--cyan);
      font-size: 0.825rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .sandbox-terminal-link:hover {
      color: #ffffff;
      transform: translateX(3px);
    }
`;

// Inject CSS
const confirmedCssBlock = html.indexOf(targetCss);
if (confirmedCssBlock !== -1) {
  const closingBrace = html.indexOf('}', confirmedCssBlock);
  if (closingBrace !== -1) {
    html = html.slice(0, closingBrace + 1) + newCss + html.slice(closingBrace + 1);
    console.log('CSS injected successfully!');
  }
} else {
  console.log('CSS target not found');
}

// Inject Sandbox Conversion Strip right before </section> of #sandbox
const sandboxSectionIdx = html.indexOf('id="sandbox"');
if (sandboxSectionIdx !== -1) {
  const sectionEndIdx = html.indexOf('</section>', sandboxSectionIdx);
  if (sectionEndIdx !== -1) {
    // Find the last </div> before </section>
    const lastDivIdx = html.lastIndexOf('</div>', sectionEndIdx);
    const conversionStripHtml = `
      <!-- Sandbox Real-Time Conversion Strip -->
      <div class="sandbox-conversion-strip">
        <div class="flex items-center gap-2 text-xs text-mid">
          <span class="ai-pulse-dot" style="background: var(--cyan); box-shadow: 0 0 8px var(--cyan);"></span>
          <span><b>Interactive Sandbox Replay:</b> Continuous tick-by-tick neural confluence scanner streams live inside Terminal.</span>
        </div>
        <a href="terminal.html" class="sandbox-terminal-link">
          Launch Live Terminal Scanner <i class="ph-bold ph-arrow-up-right"></i>
        </a>
      </div>
    `;
    html = html.slice(0, lastDivIdx) + conversionStripHtml + html.slice(lastDivIdx);
    console.log('Conversion strip injected into sandbox!');
  }
}

fs.writeFileSync('landing.html', html, 'utf8');
console.log('landing.html updated successfully!');

