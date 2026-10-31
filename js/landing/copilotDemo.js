/**
 * PROJECT MONDAY — AI COPILOT INTERACTIVE CONVERSATION CONTROLLER
 * Simulates real conversational trading partner dialogues (Setup Execution & Psychological Tilt Shield)
 * Powered by Web Speech synthesis in authentic Hinglish and English.
 * Dynamically binds with live real-time BTC price and strict 1:3.0 Asymmetry.
 */

import { sfx } from '../../components/sfx.js';

export class CopilotDemoController {
  constructor() {
    this.currentScenario = 'setup';
    this.currentLang = 'hi-IN';
    this.liveBtc = 77140.0;

    this.scenarios = {
      setup: {
        title: 'Institutional Setup Confirmation',
        tag: 'EXECUTION BLUEPRINT',
        tagColor: 'var(--profit)',
        userMsg: 'Bhai, BTC me buy karun kya abhi? Setup ready hai?',
        mondayMsg: '',
        speechText: ''
      },
      tilt: {
        title: 'Psychological Tilt & Anti-Revenge Shield',
        tag: 'EMOTIONAL ARMOR',
        tagColor: 'var(--shield)',
        userMsg: 'Yaar do stop loss hit ho gaye! Mood kharab ho gaya, full leverage pe revenge trade le raha hoon!',
        mondayMsg: '🛑 **Deep breath lo! Screen se haath hatao!**\n\nTrading me consecutive losses sab face karte hain, even top hedge funds bhi. Isliye humne **Strict 1% Risk Rule** banaya tha taaki 2 losses par bhi account sirf -2R (-$40) hi down ho.\n\nRevenge trade lene ka matlab market ko free donation dena hai. Terminal minimize karo, ek cup chai piyo, market kal bhi yahi rahega! 😊',
        speechText: 'Deep breath lo! Screen se haath hatao. Revenge trade lena emotional tilt hai. Terminal minimize karo, hum kal fresh setup par trade karenge!'
      }
    };

    this.formatSetupBlueprint();
    this.init();
  }

  formatSetupBlueprint() {
    const p = Math.round(this.liveBtc);
    const riskDist = Math.round(p * 0.0065); // ~0.65% stop
    const sl = p - riskDist;
    const tp = p + (riskDist * 3.0); // Exact 1:3.0

    this.scenarios.setup.mondayMsg = `🟢 **Haan bhai, setup Grade A+ confirm ho chuka hai!**\n\n• **1H Bias:** Bullish Triple-EMA stack locked.\n• **Entry Blueprint:** $${p.toLocaleString()} | **Stop Loss:** $${sl.toLocaleString()}\n• **Target:** $${tp.toLocaleString()} with strict **1:3.0 Asymmetric R:R**.\n\nRisk strictly 1% ($20.00) calculated hai. Execution panel se initiate kar sakte ho!`;
    this.scenarios.setup.speechText = `Haan bhai, BTC ka setup Grade A confirm ho chuka hai! Entry ${p.toLocaleString()} par hai aur Stop loss strictly ${sl.toLocaleString()} par lock hai. Strict 1:3 risk reward ratio ready hai!`;
  }

  updateLiveBtc(livePrice) {
    const p = parseFloat(livePrice);
    if (!isNaN(p) && p > 0) {
      this.liveBtc = p;
      this.formatSetupBlueprint();
      if (this.currentScenario === 'setup') {
        this.renderScenario();
      }
    }
  }

  init() {
    this.bindButtons();
    this.renderScenario();
  }

  bindButtons() {
    const btnSetup = document.getElementById('copilot_tab_setup');
    const btnTilt = document.getElementById('copilot_tab_tilt');
    const btnPlayVoice = document.getElementById('copilot_btn_voice_play');

    if (btnSetup) {
      btnSetup.addEventListener('click', () => {
        btnSetup.classList.add('active');
        if (btnTilt) btnTilt.classList.remove('active');
        this.currentScenario = 'setup';
        this.renderScenario();
        sfx.playClick();
      });
    }

    if (btnTilt) {
      btnTilt.addEventListener('click', () => {
        btnTilt.classList.add('active');
        if (btnSetup) btnSetup.classList.remove('active');
        this.currentScenario = 'tilt';
        this.renderScenario();
        sfx.playClick();
      });
    }

    if (btnPlayVoice) {
      btnPlayVoice.addEventListener('click', () => {
        this.playVoice();
      });
    }
  }

  renderScenario() {
    const sc = this.scenarios[this.currentScenario];
    if (!sc) return;

    const userMsgEl = document.getElementById('copilot_user_msg');
    const mondayMsgEl = document.getElementById('copilot_monday_msg');
    const tagEl = document.getElementById('copilot_scenario_tag');

    if (userMsgEl) userMsgEl.textContent = sc.userMsg;
    if (mondayMsgEl) {
      // Parse markdown bold and bullets
      const formatted = sc.mondayMsg
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/• /g, '&bull; ');
      mondayMsgEl.innerHTML = formatted;
    }
    if (tagEl) {
      tagEl.textContent = sc.tag;
      tagEl.style.borderColor = sc.tagColor;
      tagEl.style.color = sc.tagColor;
    }
  }

  playVoice() {
    const sc = this.scenarios[this.currentScenario];
    if (!sc) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sc.speechText);
      utterance.lang = this.currentLang;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      sfx.playClick();
    }
  }
}
