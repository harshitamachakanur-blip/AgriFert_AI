import React from 'react';
import { FaSeedling, FaRobot, FaMicroscope, FaGlobe, FaCode, FaDatabase } from 'react-icons/fa';

const techStack = [
  { icon: FaCode, label: 'Frontend', items: ['React 18', 'Tailwind CSS', 'Recharts', 'Framer Motion'] },
  { icon: FaDatabase, label: 'Backend', items: ['Node.js', 'Express.js', 'MongoDB', 'Mongoose'] },
  { icon: FaRobot, label: 'AI & ML', items: ['Claude AI (Anthropic)', 'Web Speech API', 'CNN Disease Model', 'Rule-based Expert System'] },
  { icon: FaGlobe, label: 'Deployment', items: ['Vercel (Frontend)', 'Render (Backend)', 'MongoDB Atlas', 'Hugging Face (Models)'] },
];

const features = [
  { icon: '🌿', title: 'AI Fertilizer Recommendation', desc: 'ML-powered personalized fertilizer suggestions based on soil NPK, pH, temperature, and crop type.' },
  { icon: '🔬', title: 'Plant Disease Detection', desc: 'Upload leaf images for AI diagnosis. Supports 38+ disease types across major Indian crops.' },
  { icon: '💬', title: 'Multilingual Chatbot', desc: 'Intelligent chatbot supporting English, Kannada, Hindi, Marathi, Telugu, and Tamil.' },
  { icon: '🎤', title: 'Voice Assistant', desc: 'Hands-free farming queries using Web Speech API with Indian language support.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Track crop statistics, fertilizer trends, and disease patterns over time.' },
  { icon: '🌤', title: 'Seasonal Advisor', desc: 'Season-specific irrigation schedules, pesticide recommendations, and farming tips.' },
];

export default function About() {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <FaSeedling className="text-5xl text-green-500 mx-auto mb-4" />
          <h1 className="section-title mb-3">About AgriFert AI</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            An industry-grade AI-powered agricultural platform designed to empower Indian farmers with intelligent crop and soil management tools.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {features.map(f => (
            <div key={f.title} className="glass-card p-5">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <h2 className="section-title text-center mb-8">Technology Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {techStack.map(t => (
            <div key={t.label} className="glass-card p-5">
              <t.icon className="text-2xl text-green-500 mb-3" />
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">{t.label}</h3>
              <ul className="space-y-1.5">
                {t.items.map(i => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />{i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 glass-card p-8 text-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">🏆 Built for Impact</h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Developed for hackathons, placements, and real-world deployment. Combines modern full-stack development with practical AI/ML to solve real agricultural challenges in India.
          </p>
        </div>
      </div>
    </div>
  );
}
