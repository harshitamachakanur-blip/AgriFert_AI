import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FaSeedling, FaSun, FaMoon, FaBars, FaTimes, FaUser, FaSignOutAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/ai-recommendation', label: '🌿 Recommendation' },
  { to: '/disease-detection', label: '🔬 Disease' },
  { to: '/chatbot', label: '💬 Chatbot' },
  { to: '/dashboard', label: '📊 Dashboard' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <FaSeedling className="text-2xl text-green-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">AgriFert AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === l.to
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {dark ? <FaSun /> : <FaMoon />}
            </button>
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FaUser className="inline mr-1 text-green-500" />{user.name?.split(' ')[0]}
                </span>
                <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            ) : (
              <Link to="/auth" className="hidden sm:block btn-primary text-sm py-2 px-4">Get Started</Link>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300">
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden pb-4 border-t border-gray-200 dark:border-gray-700 mt-2 pt-4 space-y-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === l.to
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              {user ? (
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-red-600 font-medium text-sm">
                  <FaSignOutAlt className="inline mr-2" />Logout ({user.name})
                </button>
              ) : (
                <Link to="/auth" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-green-600 font-semibold text-sm">Sign In / Register</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
