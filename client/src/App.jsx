import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import ScrollToTop from './components/Layout/ScrollToTop';
import Home from './pages/Home';
import About from './pages/About';
import AIRecommendation from './pages/AIRecommendation';
import Dashboard from './pages/Dashboard';
import Contact from './pages/Contact';
import Auth from './pages/Auth';
import DiseaseDetection from './pages/DiseaseDetection';
import FarmerChatbot from './pages/FarmerChatbot';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen gradient-bg">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/ai-recommendation" element={<AIRecommendation />} />
              <Route path="/disease-detection" element={<DiseaseDetection />} />
              <Route path="/chatbot" element={<FarmerChatbot />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
            </Routes>
            <Footer />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#1f2937', color: '#fff', borderRadius: '12px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
