import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSeedling, FaMicrophone, FaChartBar, FaRobot, FaMicroscope, FaLeaf, FaShieldAlt, FaArrowRight } from 'react-icons/fa';
import VoiceAssistant from '../components/VoiceAssistant/VoiceAssistant';

const features = [
  { icon: FaSeedling, title: 'AI Fertilizer Recommendation', desc: 'Get personalized fertilizer recommendations based on soil parameters and crop type using our ML model.', link: '/ai-recommendation', color: 'from-green-500 to-green-700', label: 'Get Recommendation' },
  { icon: FaMicroscope, title: 'Plant Disease Detection', desc: 'Upload leaf images and provide crop data for instant AI-powered disease diagnosis with treatment advice.', link: '/disease-detection', color: 'from-blue-500 to-blue-700', label: 'Detect Disease' },
  { icon: FaRobot, title: 'Farmer AI Chatbot', desc: 'Chat with our multilingual AI assistant for instant answers on fertilizers, diseases, and farming tips.', link: '/chatbot', color: 'from-purple-500 to-purple-700', label: 'Start Chat' },
  { icon: FaChartBar, title: 'Analytics Dashboard', desc: 'View crop-wise statistics, fertilizer trends, disease patterns and your farming history.', link: '/dashboard', color: 'from-orange-500 to-orange-700', label: 'View Analytics' },
];

const stats = [
  { value: '10,000+', label: 'Farmers Helped' },
  { value: '38', label: 'Disease Types Detected' },
  { value: '6', label: 'Regional Languages' },
  { value: '95%', label: 'Prediction Accuracy' },
];

export default function Home() {
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-400 text-sm font-semibold mb-6">
            <FaLeaf className="text-xs" /> AI-Powered Agriculture Platform v2.0
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            Smart Farming with{' '}
            <span className="bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">Artificial Intelligence</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            AI-powered fertilizer recommendations, plant disease detection, and smart farming advice for Indian farmers in 6 regional languages.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/ai-recommendation" className="btn-primary flex items-center gap-2 text-base px-7 py-3">
              <FaSeedling /> Get AI Recommendation <FaArrowRight className="text-xs" />
            </Link>
            <button onClick={() => setVoiceOpen(true)} className="flex items-center gap-2 px-7 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
              <FaMicrophone className="text-green-500 animate-pulse" /> Voice Assistant
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-4 bg-gradient-to-r from-green-600 to-green-500">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold">{s.value}</div>
              <div className="text-green-100 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">Powerful AI Features</h2>
            <p className="text-gray-500 dark:text-gray-400">Everything a modern farmer needs, powered by AI</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(f => (
              <div key={f.title} className="glass-card p-6 group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${f.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{f.desc}</p>
                <Link to={f.link} className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 transition-colors">
                  {f.label} <FaArrowRight className="text-xs" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Language Support */}
      <section className="py-12 px-4 bg-gray-50 dark:bg-gray-800/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="section-title mb-3">Multilingual Support</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Speak in your native language — our AI understands you</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['🇮🇳 English', '🌿 ಕನ್ನಡ', '🌾 हिंदी', '🌻 मराठी', '🌴 తెలుగు', '🌺 தமிழ்'].map(l => (
              <span key={l} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto glass-card p-10">
          <FaShieldAlt className="text-4xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Start Farming Smarter Today</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Join thousands of farmers using AI for better yields</p>
          <Link to="/auth" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3">
            <FaSeedling /> Create Free Account
          </Link>
        </div>
      </section>

      <VoiceAssistant isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}
