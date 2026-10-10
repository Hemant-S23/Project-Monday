/**
 * Voice Assistant Engine (PRD Section 3.2 & Section 22)
 * Manages browser Web Speech API:
 * 1. Speech-to-Text (STT) for natural voice commands
 * 2. Text-to-Speech (TTS) with dual-profile humanized voice engine:
 *    - Authentic Indian Accent for Hinglish / Hindi speech
 *    - Natural, Non-Robotic English Accent for pure English alerts & numbers
 *    - Phonetic Pronunciation Smoother to prevent awkward robotic TTS mispronunciations
 * 3. Audio Activity State callback for UI glowing ripples / sound waves
 */
export class VoiceAssistant {
  constructor({ onSpeechRecognized, onListeningStateChange, onSpeakingStateChange }) {
    this.onSpeechRecognized = onSpeechRecognized;
    this.onListeningStateChange = onListeningStateChange;
    this.onSpeakingStateChange = onSpeakingStateChange;

    this.isListening = false;
    this.isSpeaking = false;
    this.voiceMuted = false;
    this.recognition = null;
    this.synthesis = window.speechSynthesis || null;

    this.indianVoice = null;
    this.englishVoice = null;
    this.availableVoices = [];

    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[VoiceAssistant] SpeechRecognition not supported in this browser environment.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'hi-IN'; // Default to Hindi/Hinglish recognition, falls back to en-US naturally

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onListeningStateChange) this.onListeningStateChange(true);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('[VoiceAssistant] Recognized voice speech:', transcript);
      if (this.onSpeechRecognized) {
        this.onSpeechRecognized(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[VoiceAssistant] Recognition error:', event.error);
      this.isListening = false;
      if (this.onListeningStateChange) this.onListeningStateChange(false);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onListeningStateChange) this.onListeningStateChange(false);
    };
  }

  initSpeechSynthesis() {
    if (!this.synthesis) return;

    const configureVoices = () => {
      const voices = this.synthesis.getVoices();
      if (!voices || voices.length === 0) return;
      this.availableVoices = voices;

      // 1. Prioritize natural, humanized Indian female voices for Hinglish
      const indianVoiceMatchers = [
        // Microsoft Edge Natural Neural Indian voices
        v => v.name.includes('Swara') && v.name.includes('Natural'),
        v => v.name.includes('Neerja') && v.name.includes('Natural'),
        v => v.name.includes('Madhur') && v.name.includes('Natural'),
        // Google Chrome Neural & High-Quality Hindi/Indian voices
        v => (v.name.includes('Google') || v.name.includes('Natural')) && (v.lang === 'hi-IN' || v.lang === 'hi_IN'),
        v => (v.name.includes('Google') || v.name.includes('Natural')) && (v.lang === 'en-IN' || v.lang === 'en_IN'),
        // Standard Hindi voices
        v => v.lang === 'hi-IN' || v.lang === 'hi_IN',
        v => v.lang === 'en-IN' || v.lang === 'en_IN',
        v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'),
        v => v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('kalpana')
      ];

      for (const matcher of indianVoiceMatchers) {
        const found = voices.find(matcher);
        if (found) {
          this.indianVoice = found;
          break;
        }
      }

      // 2. Prioritize natural, humanized English female voices for English
      const englishVoiceMatchers = [
        // Microsoft Natural Neural voices
        v => v.name.includes('Jenny') && v.name.includes('Natural'),
        v => v.name.includes('Aria') && v.name.includes('Natural'),
        v => v.name.includes('Sonia') && v.name.includes('Natural'),
        v => v.name.includes('Ava') && v.name.includes('Natural'),
        v => v.name.includes('Natural') && (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')),
        // Google Chrome UK / US Female voices
        v => v.name.includes('Google UK English Female'),
        v => v.name.includes('Google US English'),
        // Generic high-quality English female voices
        v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en'),
        v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB'),
        v => v.lang.startsWith('en')
      ];

      for (const matcher of englishVoiceMatchers) {
        const found = voices.find(matcher);
        if (found) {
          this.englishVoice = found;
          break;
        }
      }

      // Safe fallbacks if specific language packs are missing on the user's OS
      if (!this.indianVoice) {
        this.indianVoice = this.englishVoice || voices[0];
      }
      if (!this.englishVoice) {
        this.englishVoice = this.indianVoice || voices[0];
      }

      console.log('[VoiceAssistant] Natural Humanized Voices Configured:', {
        hinglishIndianVoice: this.indianVoice ? `${this.indianVoice.name} (${this.indianVoice.lang})` : 'Default',
        englishVoice: this.englishVoice ? `${this.englishVoice.name} (${this.englishVoice.lang})` : 'Default'
      });
    };

    configureVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = configureVoices;
    }
  }

  /**
   * Detects whether text is conversational Hinglish or pure English
   */
  isHinglish(text) {
    if (!text) return false;
    const hinglishPattern = /\b(namaste|namastey|main|mein|hoon|hun|kya|kyaa|hai|hain|rahi|rahee|raha|rahey|karo|karein|kar|tum|aap|mujhse|mujhe|mujhey|batao|dekho|koi|bhi|toh|to|nahi|nahee|nahin|aaj|kal|kaise|kaisi|kaisa|pehle|sakte|sakta|saktee|chahiye|chaahiye|chal|karna|aur|par|pe|me|se|yeh|voh|woh|aise|aisey|waise|accha|achha|baat|bana|bante|wala|wali|wale|shuru|ruko|ruk|lelo|leli|liya|dikh|dikha)\b/i;
    return hinglishPattern.test(text);
  }

  /**
   * Humanizes pronunciation, expands financial abbreviations,
   * and smooths Hinglish vowels so TTS sounds like a natural Indian person.
   */
  humanizePhonetics(text, isHinglishText) {
    if (!text) return '';
    let cleaned = text
      .replace(/[*_#`~]/g, '')               // Strip markdown
      .replace(/\n+/g, '. ')                // Breath pause on newlines
      .replace(/[•–—]/g, ' ')               // Strip bullets
      .replace(/https?:\/\/\S+/g, '')       // Strip links
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Financial & Trading Acronyms Normalization
    cleaned = cleaned
      .replace(/\b1H\b/gi, '1 hour')
      .replace(/\b5M\b/gi, '5 minute')
      .replace(/\b15M\b/gi, '15 minute')
      .replace(/\b4H\b/gi, '4 hour')
      .replace(/\b1D\b/gi, '1 day')
      .replace(/1:([0-9.]+)/g, '1 to $1')
      .replace(/\bRR\b/gi, 'Risk to Reward')
      .replace(/\bR:R\b/gi, 'Risk to Reward')
      .replace(/\bSL\b/gi, 'Stop Loss')
      .replace(/\bTP\b/gi, 'Take Profit')
      .replace(/\bPnL\b/gi, 'P and L')
      .replace(/\bBTC\b/gi, 'Bitcoin')
      .replace(/\bETH\b/gi, 'Ethereum')
      .replace(/\bSOL\b/gi, 'Solana')
      .replace(/\bDOGE\b/gi, 'Dogecoin')
      .replace(/\bAI\b/g, 'A.I.')
      .replace(/\bSMT\b/gi, 'S.M.T.')
      .replace(/\b(USDT|USD)\b/gi, 'US Dollars')
      .replace(/\bCPI\b/gi, 'C.P.I.')
      .replace(/\bFOMC\b/gi, 'F.O.M.C.')
      .replace(/([+-]?[0-9.]+)R\b/g, '$1 R-Multiple');

    // 2. Hinglish Phonetic Enhancements (makes Indian pronunciation melodious and natural)
    if (isHinglishText) {
      const phoneticReplacements = [
        [/\bnamaste\b/gi, 'namastey'],
        [/\bmain\b/gi, 'mein'],
        [/\bMain\b/g, 'Mein'],
        [/\brahi\b/gi, 'rahee'],
        [/\braha\b/gi, 'rahaa'],
        [/\brahe\b/gi, 'rahey'],
        [/\bsahi\b/gi, 'sahee'],
        [/\bkahi\b/gi, 'kahee'],
        [/\bnahi\b/gi, 'nahee'],
        [/\bnahin\b/gi, 'naheen'],
        [/\bchahiye\b/gi, 'chaahiye'],
        [/\bmujhse\b/gi, 'mujh sey'],
        [/\bmujhe\b/gi, 'mujhey'],
        [/\btumse\b/gi, 'tum sey'],
        [/\btumhe\b/gi, 'tumhey'],
        [/\bkarein\b/gi, 'kare'],
        [/\bkarenge\b/gi, 'karengey'],
        [/\bkaro\b/gi, 'karoo'],
        [/\bkyu\b/gi, 'kyoo'],
        [/\bkyun\b/gi, 'kyoon'],
        [/\bkyo\b/gi, 'kyon'],
        [/\bbatao\b/gi, 'bataao'],
        [/\bruko\b/gi, 'rukoo'],
        [/\bdekho\b/gi, 'dekhoo'],
        [/\bkaise\b/gi, 'kaisey'],
        [/\bkaisi\b/gi, 'kaisee'],
        [/\bkaisa\b/gi, 'kaisaa'],
        [/\bpehle\b/gi, 'pehley'],
        [/\bsakte\b/gi, 'saktey'],
        [/\bsakti\b/gi, 'saktee'],
        [/\bsakta\b/gi, 'saktaa'],
        [/\blekin\b/gi, 'leykin'],
        [/\bwoh\b/gi, 'voh'],
        [/\baise\b/gi, 'aisey'],
        [/\bwaise\b/gi, 'vaisey']
      ];

      for (const [pattern, replacement] of phoneticReplacements) {
        cleaned = cleaned.replace(pattern, replacement);
      }
    }

    return cleaned;
  }

  startListening() {
    if (!this.recognition) {
      alert('Speech Recognition is not supported in this browser. You can still type queries in the chat box!');
      return;
    }
    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Could not start recognition:', e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      if (this.onListeningStateChange) this.onListeningStateChange(false);
    }
  }

  speak(text) {
    if (this.voiceMuted || !this.synthesis || !text) return;

    // Stop any ongoing speech immediately
    this.synthesis.cancel();

    const isHinglish = this.isHinglish(text);
    const spokenText = this.humanizePhonetics(text, isHinglish);

    const utterance = new SpeechSynthesisUtterance(spokenText);

    if (isHinglish) {
      // 1. Hinglish Voice Profile: Authentic Indian female accent, natural pacing
      if (this.indianVoice) {
        utterance.voice = this.indianVoice;
        utterance.lang = this.indianVoice.lang || 'hi-IN';
      } else {
        utterance.lang = 'hi-IN';
      }
      // Relaxed, conversational pacing (0.96) and warm human pitch (1.05)
      utterance.rate = 0.96;
      utterance.pitch = 1.05;
    } else {
      // 2. Pure English Voice Profile: Clear, crisp English accent
      if (this.englishVoice) {
        utterance.voice = this.englishVoice;
        utterance.lang = this.englishVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }
      // Natural articulate pacing
      utterance.rate = 1.0;
      utterance.pitch = 1.03;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
    };

    this.synthesis.speak(utterance);
  }

  /**
   * One-click audio demonstration to hear both Indian Hinglish and English accents
   */
  testVoice() {
    this.speak("Namastey! Mein hoon Monday. Meri awaaz ab natural Indian accent me tuned hai, and when I speak English, I speak clearly with a natural humanized voice. How do I sound to you?");
  }

  toggleMute() {
    this.voiceMuted = !this.voiceMuted;
    if (this.voiceMuted && this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
    }
    return this.voiceMuted;
  }
}
