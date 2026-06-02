// Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaSeedling, FaGithub, FaLinkedin } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FaSeedling className="text-green-400 text-xl" />
              <span className="text-white font-bold text-xl">AgriFert AI</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              AI-powered fertilizer recommendations and plant disease detection for Indian farmers. 
              Empowering agriculture with technology.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Features</h4>
            <ul className="space-y-2 text-sm">
              {['AI Recommendations', 'Disease Detection', 'Farmer Chatbot', 'Voice Assistant', 'Dashboard Analytics'].map(f => (
                <li key={f} className="text-gray-400 hover:text-green-400 transition-colors cursor-pointer">→ {f}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[['/', 'Home'], ['/about', 'About'], ['/ai-recommendation', 'Get Recommendation'], ['/contact', 'Contact']].map(([to, label]) => (
                <li key={to}><Link to={to} className="text-gray-400 hover:text-green-400 transition-colors">→ {label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">© 2024 AgriFert AI. Built for Indian Farmers 🌾</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors"><FaGithub className="text-lg" /></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors"><FaLinkedin className="text-lg" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
