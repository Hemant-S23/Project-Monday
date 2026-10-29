/**
 * PROJECT MONDAY — AI COPILOT INTERACTIVE CONVERSATION CONTROLLER
 * Simulates real conversational trading partner dialogues (Setup Execution & Psychological Tilt Shield)
 * Powered by Web Speech synthesis in authentic Hinglish and English.
 */

import { sfx } from '../../components/sfx.js';

export class CopilotDemoController {
  constructor() {
    this.currentScenario = 'setup';
    this.currentLang = 'hi-IN';

    this.scenarios = {
      setup: {
        title: 'Institutional Setup Confirmation',
        tag: 'EXECUTION BLUEPRINT',
        tagColor: 'var(--profit)',
        userMsg: 'Bhai, BTC me buy karun kya abhi? Setup ready hai?',
        mondayMsg: '🟢 **Haan bhai, setup Grade A+ confirm ho chuka hai!**\n\n• **1H Bias:** Bullish Triple-EMA stack locked.\n• **Entry Blueprint:** $68,430.00 | **Stop Loss:** $67,950.00\n• **Target:** $69,966.00 with strict **1:3.2 Asymmetric R:R**.\n\nRisk strictly 1% ($20.00) calculated hai. Execution panel se initiate kar sakte ho!',
        speechText: 'Haan bhai, BTC ka setup Grade A confirm ho chuka hai! Entry 68,430 par hai aur Stop loss strictly 67,950 par lock hai. 1:3.2 risk reward ratio ready hai!'
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

    this.init();
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
        this.playVoiceSpeech();
      });
    }
  }

  renderScenario() {
    const s = this.scenarios[this.currentScenario];
    if (!s) return;

    const userBubble = document.getElementById('copilot_msg_user');
    const mondayBubble = document.getElementById('copilot_msg_monday');
    const tagEl = document.getElementById('copilot_scenario_tag');

    if (tagEl) {
      tagEl.textContent = s.tag;
      tagEl.style.color = s.tagColor;
    }
    if (userBubble) userBubble.textContent = s.userMsg;
    if (mondayBubble) mondayBubble.innerHTML = s.mondayMsg.replace(/\n/g, '<br>');
  }

  playVoiceSpeech() {
    const s = this.scenarios[this.currentScenario];
    if (!s) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(s.speechText);
      utterance.lang = this.currentLang;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
      sfx.playClick();
    }
  }
}

