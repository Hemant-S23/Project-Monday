/**
 * Voice Assistant Engine (PRD Section 3.2 & Section 22)
 * Manages browser Web Speech API:
 * 1. Speech-to-Text (STT) for natural voice commands
 * 2. Text-to-Speech (TTS) for natural conversational voice responses in Hinglish/English
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
    this.preferredVoice = null;

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

    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      // Look for natural female Hindi / Indian English / natural female voice for MONDAY
      this.preferredVoice = voices.find(v => (v.lang.includes('hi') || v.lang.includes('en-IN')) && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('kalpana'))) ||
                            voices.find(v => v.lang.includes('hi') || v.lang.includes('en-IN')) ||
                            voices.find(v => v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('jenny') || v.name.toLowerCase().includes('samantha')) ||
                            voices.find(v => v.name.includes('Natural') || v.name.includes('Google')) ||
                            voices[0];
    };

    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
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
    if (this.voiceMuted || !this.synthesis) return;

    // Stop ongoing speech
    this.synthesis.cancel();

    // Clean markdown characters (*, _, #) before passing to TTS
    const cleanText = text
      .replace(/[*_#`]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/•/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
    };

    this.synthesis.speak(utterance);
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
