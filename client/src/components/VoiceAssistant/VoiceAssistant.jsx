import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaMicrophone, FaStop, FaVolumeUp, FaTimes, FaGlobe, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'en-IN', label: 'English',  short: 'EN' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ',    short: 'KN' },
  { code: 'hi-IN', label: 'हिंदी',    short: 'HI' },
  { code: 'mr-IN', label: 'मराठी',    short: 'MR' },
  { code: 'te-IN', label: 'తెలుగు',   short: 'TE' },
  { code: 'ta-IN', label: 'தமிழ்',    short: 'TA' },
];

// ── Rule-based farming replies ────────────────────────────────────────────────
function ruleBasedReply(text) {
  const t = text.toLowerCase();
  if (t.includes('fertilizer') || t.includes('khad') || t.includes('ಗೊಬ್ಬರ') || t.includes('खाद') || t.includes('npk') || t.includes('urea'))
    return 'For best results, test your soil first. Use NPK fertilizer balanced for your crop. Apply Urea for nitrogen deficiency, DAP for phosphorus, and MOP for potassium needs. Split doses work best.';
  if (t.includes('disease') || t.includes('rog') || t.includes('ರೋಗ') || t.includes('रोग') || t.includes('blight') || t.includes('rust') || t.includes('fungus'))
    return 'To control crop disease, remove infected plants immediately. Spray copper oxychloride fungicide early morning. Use certified disease-resistant seeds next season for prevention.';
  if (t.includes('water') || t.includes('irrigation') || t.includes('ನೀರು') || t.includes('पानी') || t.includes('paani') || t.includes('drip'))
    return 'Irrigate your crop in early morning or evening to reduce evaporation. Check soil moisture at 6 inch depth before watering. Most crops need water every 7 to 10 days depending on weather.';
  if (t.includes('soil') || t.includes('ph') || t.includes('ಮಣ್ಣು') || t.includes('माटी') || t.includes('sandy') || t.includes('clay'))
    return 'Ideal soil pH is 6 to 7 for most crops. Add agricultural lime to raise pH if acidic, or sulfur to lower it if alkaline. Adding compost improves soil health and water retention naturally.';
  if (t.includes('rice') || t.includes('wheat') || t.includes('maize') || t.includes('tomato') || t.includes('potato') || t.includes('cotton'))
    return `For your crop, apply NPK fertilizer at planting stage and urea as top dressing after 3 to 4 weeks. Monitor for early signs of disease and maintain proper irrigation schedule.`;
  if (t.includes('pest') || t.includes('insect') || t.includes('bug') || t.includes('worm'))
    return 'For pest control, use neem-based biopesticide as a safe organic option. For severe infestation, apply Bt-based insecticide. Install pheromone traps to monitor pest population early.';
  if (t.includes('weather') || t.includes('rain') || t.includes('temperature') || t.includes('season'))
    return 'Monitor weather forecasts daily during crop season. Apply fertilizer 24 hours before expected rain for better absorption. During high heat, water crops in early morning and use mulching to retain moisture.';
  if (t.includes('harvest') || t.includes('yield') || t.includes('production'))
    return 'For better yield, ensure balanced NPK nutrition, timely irrigation, and integrated pest management. Harvest at correct maturity stage to prevent post-harvest losses. Store in dry, ventilated conditions.';
  // Default helpful response
  return 'I am your AgriFert AI farming assistant. I can help you with fertilizer recommendations, crop disease identification, irrigation schedules, soil management, and seasonal farming tips. Please ask your specific question!';
}

export default function VoiceAssistant({ isOpen, onClose }) {
  const [listening, setListening]       = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [response, setResponse]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [history, setHistory]           = useState([]);
  const [status, setStatus]             = useState('idle'); // idle | listening | processing | done

  const recognitionRef  = useRef(null);
  const synthRef        = useRef(window.speechSynthesis);
  const transcriptRef   = useRef('');        // always holds latest transcript
  const hasResultRef    = useRef(false);     // did we get any result at all?
  const selectedLangRef = useRef(selectedLang);
  const isProcessingRef = useRef(false);     // prevent double processing

  useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text, langCode) => {
    if (!window.speechSynthesis || !text) return;
    stopSpeaking();
    setTimeout(() => {
      const utter      = new SpeechSynthesisUtterance(text);
      utter.lang       = langCode || 'en-IN';
      utter.rate       = 0.88;
      utter.pitch      = 1.0;
      utter.volume     = 1.0;
      utter.onstart    = () => setSpeaking(true);
      utter.onend      = () => setSpeaking(false);
      utter.onerror    = () => setSpeaking(false);
      // Pick best matching voice
      const voices = synthRef.current.getVoices();
      const langPrefix = (langCode || 'en').split('-')[0];
      const match = voices.find(v => v.lang.startsWith(langPrefix))
                 || voices.find(v => v.lang.startsWith('en'));
      if (match) utter.voice = match;
      synthRef.current.speak(utter);
    }, 150);
  }, [stopSpeaking]);

  // ── Process captured speech ──────────────────────────────────────────────────
  const processTranscript = useCallback((text) => {
    if (!text || !text.trim() || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);
    setStatus('processing');

    const currentLang = selectedLangRef.current;
    const reply = ruleBasedReply(text);

    // Small delay to feel more natural / let UI update
    setTimeout(() => {
      setResponse(reply);
      setHistory(prev => [...prev, { user: text, assistant: reply }]);
      speak(reply, currentLang.code);
      setLoading(false);
      setStatus('done');
      isProcessingRef.current = false;
    }, 600);
  }, [speak]);

  // ── Start listening ──────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error('Speech recognition not supported. Please use Chrome or Edge browser.');
      return;
    }

    // Reset everything
    stopSpeaking();
    transcriptRef.current   = '';
    hasResultRef.current    = false;
    isProcessingRef.current = false;
    setTranscript('');
    setResponse('');
    setStatus('listening');

    const recognition            = new SR();
    recognition.lang             = selectedLangRef.current.code;
    recognition.continuous       = false;
    recognition.interimResults   = true;
    recognition.maxAlternatives  = 3;

    recognition.onstart = () => {
      setListening(true);
    };

    // ✅ KEY FIX: collect EVERY result event, final or interim
    recognition.onresult = (event) => {
      let best = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Prefer the highest-confidence alternative
        let bestAlt = result[0].transcript;
        for (let j = 1; j < result.length; j++) {
          if (result[j].confidence > result[0].confidence) bestAlt = result[j].transcript;
        }
        best += bestAlt;
      }
      const combined = best.trim();
      if (combined) {
        transcriptRef.current = combined;   // always save to ref
        hasResultRef.current  = true;
        setTranscript(combined);            // show live in UI
      }
    };

    recognition.onerror = (e) => {
      setListening(false);
      setStatus('idle');
      isProcessingRef.current = false;
      if (e.error === 'not-allowed') {
        toast.error('Microphone blocked! Click the 🔒 lock icon → Allow Microphone → Refresh page.');
      } else if (e.error === 'no-speech') {
        // Don't show error — just quietly reset
        setStatus('idle');
      } else if (e.error === 'network') {
        // Network error — still try to use whatever we captured
        const captured = transcriptRef.current;
        if (captured) processTranscript(captured);
        else toast.error('Network issue. Please check your connection.');
      } else if (e.error === 'aborted') {
        // User stopped manually — process if we have something
        const captured = transcriptRef.current;
        if (captured) processTranscript(captured);
      } else {
        toast.error(`Mic issue: ${e.error}. Please try again.`);
      }
    };

    // ✅ KEY FIX: onend uses ref (always current), with a small delay
    // to ensure onresult has finished writing to ref before we read it
    recognition.onend = () => {
      setListening(false);
      // Wait 300ms for any pending onresult callbacks to finish
      setTimeout(() => {
        const captured = transcriptRef.current;
        if (captured && captured.trim()) {
          processTranscript(captured);
        } else {
          // Still nothing — give a helpful message but don't error
          setStatus('idle');
          toast('No speech detected. Please tap the mic and speak clearly.', { icon: '🎤' });
        }
      }, 300);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      toast.error('Could not start microphone. Please refresh and try again.');
      setStatus('idle');
    }
  }, [stopSpeaking, processTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    // onend will fire and handle processing
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop();
    };
  }, [stopSpeaking]);

  const clearAll = () => {
    setHistory([]);
    setTranscript('');
    setResponse('');
    transcriptRef.current   = '';
    hasResultRef.current    = false;
    isProcessingRef.current = false;
    setStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-t-3xl p-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">🎤 Voice Assistant</h2>
            <p className="text-green-100 text-sm">Speak in your language</p>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={clearAll}
                className="text-white/70 hover:text-white bg-white/10 rounded-full p-2 transition-colors"
                title="Clear history">
                <FaTrash className="text-xs" />
              </button>
            )}
            <button onClick={onClose}
              className="text-white/70 hover:text-white bg-white/10 rounded-full p-2 transition-colors">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Language Selector */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <FaGlobe className="text-green-500 text-sm" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Language</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button key={lang.code}
                onClick={() => setSelectedLang(lang)}
                disabled={listening}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedLang.code === lang.code
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="p-5 space-y-4">

          {/* Mic Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={listening ? stopListening : startListening}
              disabled={loading}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl text-white shadow-lg transition-all duration-300 ${
                listening
                  ? 'bg-red-500 animate-pulse scale-110'
                  : loading
                  ? 'bg-yellow-500 cursor-wait'
                  : 'bg-gradient-to-br from-green-500 to-green-700 hover:scale-105 active:scale-95'
              }`}>
              {listening ? <FaStop /> : <FaMicrophone />}
            </button>

            <p className="text-sm text-gray-500 dark:text-gray-400 text-center font-medium">
              {listening  ? '🔴 Listening… tap to stop'
               : loading  ? '⏳ Processing your question…'
               : speaking ? '🔊 Speaking…'
               :            '🎤 Tap and speak your question'}
            </p>

            {/* Live transcript while listening */}
            {listening && transcript && (
              <p className="text-xs text-green-600 dark:text-green-400 italic text-center px-4">
                "{transcript}"
              </p>
            )}
          </div>

          {/* Transcript Box (after done) */}
          {!listening && transcript && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 font-semibold mb-1">🗣️ You said:</p>
              <p className="text-gray-800 dark:text-gray-200 text-sm">{transcript}</p>
            </div>
          )}

          {/* Response Box */}
          {(loading || response) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-blue-600 font-semibold">🤖 AgriFert AI:</p>
                {response && !loading && (
                  <button
                    onClick={() => speak(response, selectedLang.code)}
                    disabled={speaking}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                    title="Speak again">
                    <FaVolumeUp className={speaking ? 'animate-pulse text-blue-600' : ''} />
                  </button>
                )}
              </div>
              {loading
                ? <div className="typing-indicator"><span /><span /><span /></div>
                : <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{response}</p>
              }
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div className="max-h-28 overflow-y-auto space-y-2 border-t dark:border-gray-700 pt-3">
              <p className="text-xs text-gray-400 font-medium">Previous questions:</p>
              {history.slice(-4, -1).map((h, i) => (
                <div key={i} className="text-xs text-gray-400 dark:text-gray-500 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                  <span className="text-green-500 font-medium">You:</span> {h.user.length > 55 ? h.user.slice(0, 55) + '…' : h.user}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              💡 <strong>Try saying:</strong> "Best fertilizer for rice" · "How to control wheat rust" · "Irrigation tips for tomato"
            </p>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">
              Works in Chrome/Edge · Allow microphone when prompted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
