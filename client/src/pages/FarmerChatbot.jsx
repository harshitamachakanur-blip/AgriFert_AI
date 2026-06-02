import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  FaPaperPlane, FaMicrophone, FaStop, FaRobot, FaUser,
  FaVolumeUp, FaGlobe, FaTrash, FaSeedling, FaLock
} from 'react-icons/fa';

const LANGUAGES = [
  { code: 'en', stt: 'en-IN', label: 'EN' },
  { code: 'kn', stt: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'hi', stt: 'hi-IN', label: 'हिंदी' },
  { code: 'mr', stt: 'mr-IN', label: 'मराठी' },
];

const QUICK_QUESTIONS = [
  'Best fertilizer for rice?',
  'How to control wheat rust?',
  'Irrigation schedule for tomato?',
  'What is NPK ratio?',
  'How to improve soil pH?',
  'Organic farming tips?',
];

// ── AI call directly to Anthropic (works without a backend) ──────────────────
async function callAI(message, language, history) {
  const systemPrompt = `You are AgriFert AI, an expert agricultural assistant for Indian farmers.
You specialize in: fertilizer recommendations, crop disease diagnosis, soil health, irrigation,
weather-based farming advice, and seasonal crop planning.
Answer in ${language === 'en' ? 'English' : language} language.
Be practical, specific, and use simple language. Keep answers under 150 words.
If asked about specific crops/diseases, give actionable advice.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ]
    })
  });
  const data = await response.json();
  return data.content?.[0]?.text || null;
}

// ── Rule-based fallback ───────────────────────────────────────────────────────
function ruleBasedReply(message) {
  const q = message.toLowerCase();
  if (q.includes('fertilizer') || q.includes('urea') || q.includes('npk'))
    return 'For balanced fertilization, test your soil first. Most crops need NPK in ratio 4:2:1. Urea is best for nitrogen, DAP for phosphorus, and MOP for potassium. Apply in split doses for better absorption.';
  if (q.includes('disease') || q.includes('pest') || q.includes('blight') || q.includes('rust'))
    return 'Common diseases: Rice blast, Wheat rust, Tomato blight. Prevention: Use certified seeds, maintain proper spacing, avoid excess nitrogen. Spray copper fungicide preventively. Remove infected plant parts immediately.';
  if (q.includes('irrigation') || q.includes('water'))
    return 'Irrigation schedule depends on crop stage and weather. Most crops need 25-30mm water per week. Monitor soil moisture at 6-inch depth. Drip irrigation saves 40% water. Avoid irrigating at peak heat hours.';
  if (q.includes('soil') || q.includes('ph') || q.includes('nutrient'))
    return 'Ideal soil pH is 6.0-7.0 for most crops. Below 6: add lime. Above 7: add gypsum or sulfur. Organic matter improves soil structure. Test soil every season for accurate nutrient management.';
  if (q.includes('organic'))
    return 'Organic farming tips: Use compost and vermicompost for soil health. Neem-based biopesticides control pests naturally. Crop rotation reduces disease. Green manures like dhaincha improve nitrogen. Cow dung slurry boosts microbial activity.';
  return 'I can help with fertilizer recommendations, disease identification, soil health, irrigation schedules, and seasonal farming tips. Please ask your specific farming question!';
}

export default function FarmerChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{
    id: 1, role: 'assistant',
    content: "🌱 Hello! I'm AgriFert AI Chatbot. I can help you with fertilizer recommendations, crop disease queries, soil management, and farming advice. Ask me anything in English, Hindi, Kannada, or Marathi!",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState(LANGUAGES[0]);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async (text) => {
    if (!text || !text.trim()) return;

    // Auth gate — must be logged in
    if (!user) {
      toast.error('Please login to chat with AgriFert AI');
      navigate('/auth');
      return;
    }

    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history from current messages for context
      const history = messages.filter(m => m.id !== 1).map(m => ({ role: m.role, content: m.content }));
      
      let reply = null;
      try {
        reply = await callAI(text, lang.code, history);
      } catch {
        // AI call failed (e.g. no network) — use rule-based
      }
      if (!reply) reply = ruleBasedReply(text);

      const aiMsg = { id: Date.now() + 1, role: 'assistant', content: reply, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const fallbackMsg = {
        id: Date.now() + 1, role: 'assistant',
        content: ruleBasedReply(text),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }, [user, navigate, messages, lang]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const startSTT = () => {
    if (!user) { toast.error('Please login first'); navigate('/auth'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported. Use Chrome or Edge.'); return; }
    const r = new SR();
    r.lang = lang.stt; r.continuous = false; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') toast.error('Microphone blocked! Allow microphone access and refresh.');
      else toast.error('Voice error: ' + e.error);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    r.start();
  };

  const stopSTT = () => { recognitionRef.current?.stop(); setListening(false); };

  const speakText = (text) => {
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang.stt; u.rate = 0.9;
    window.speechSynthesis?.speak(u);
  };

  const clearChat = () => {
    setMessages([{ id: 1, role: 'assistant', content: "Chat cleared! How can I help you? 🌱", timestamp: new Date() }]);
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="section-title mb-2">💬 Farmer AI Chatbot</h1>
          <p className="text-gray-600 dark:text-gray-400">Multi-language farming assistant — text & voice</p>
        </div>

        <div className="glass-card overflow-hidden">
          {/* Toolbar */}
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-white font-bold">AgriFert AI</h3>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                  <span className="text-green-100 text-xs">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FaGlobe className="text-white/70 text-sm" />
              <div className="flex gap-1">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setLang(l)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      lang.code === l.code ? 'bg-white text-green-700' : 'text-white/70 hover:bg-white/10'
                    }`}>{l.label}</button>
                ))}
              </div>
              <button onClick={clearChat} className="text-white/70 hover:text-white ml-2 transition-colors" title="Clear chat">
                <FaTrash className="text-sm" />
              </button>
            </div>
          </div>

          {/* Quick Questions — only shown when logged in */}
          {user ? (
            <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={loading}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-b dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center gap-2">
              <FaLock className="text-amber-500 text-sm" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                <button onClick={() => navigate('/auth')} className="font-semibold underline">Login or Sign up</button>
                {' '}to start chatting with AgriFert AI
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/30">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaSeedling className="text-white text-xs" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-green-600 to-green-500 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md rounded-bl-none'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-between'}`}>
                    <span className={`text-xs ${msg.role === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </span>
                    {msg.role === 'assistant' && (
                      <button onClick={() => speakText(msg.content)} className="text-gray-400 hover:text-green-500 transition-colors">
                        <FaVolumeUp className="text-xs" />
                      </button>
                    )}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaUser className="text-gray-600 dark:text-gray-300 text-xs" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaSeedling className="text-white text-xs" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-md">
                  <div className="typing-indicator"><span/><span/><span/></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={user ? "Ask about fertilizers, diseases, irrigation…" : "Login to ask questions…"}
                  rows={1}
                  disabled={!user}
                  className="flex-1 bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 text-sm outline-none resize-none disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={listening ? stopSTT : startSTT}
                disabled={!user}
                className={`p-3 rounded-xl transition-all ${
                  listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-100 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}>
                {listening ? <FaStop /> : <FaMicrophone />}
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim() || !user}
                className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <FaPaperPlane />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              {user
                ? 'Press Enter to send • 🎤 Mic for voice input • 🔊 Tap message to hear'
                : '🔒 Login required to use the chatbot'}
            </p>
          </div>
        </div>

        {/* Features Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { icon: '🌾', label: 'Fertilizer Help' },
            { icon: '🔬', label: 'Disease Info' },
            { icon: '💧', label: 'Irrigation Tips' },
            { icon: '🌍', label: 'Multi-language' },
          ].map(f => (
            <div key={f.label} className="glass-card p-3 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
