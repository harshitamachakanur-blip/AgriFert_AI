import React, { useState } from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaPaperPlane } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error('Please fill all required fields'); return; }
    setLoading(true);
    setTimeout(() => {
      toast.success('Message sent! We will reply within 24 hours.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="section-title mb-3">Contact Us</h1>
          <p className="text-gray-500 dark:text-gray-400">Have questions or feedback? We'd love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-7">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Name *', key: 'name', type: 'text', placeholder: 'Your name' },
                { label: 'Email *', key: 'email', type: 'email', placeholder: 'your@email.com' },
                { label: 'Subject', key: 'subject', type: 'text', placeholder: 'How can we help?' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} className="input-field" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Message *</label>
                <textarea rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Write your message…" className="input-field resize-none" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending…</> : <><FaPaperPlane />Send Message</>}
              </button>
            </form>
          </div>

          <div className="space-y-5">
            {[
              { icon: FaEnvelope, title: 'Email', val: 'support@agrifert.ai', color: 'bg-blue-500' },
              { icon: FaPhone, title: 'Phone', val: '+91 98765 43210', color: 'bg-green-500' },
              { icon: FaMapMarkerAlt, title: 'Location', val: 'Bengaluru, Karnataka, India', color: 'bg-red-500' },
            ].map(c => (
              <div key={c.title} className="glass-card p-5 flex items-center gap-4">
                <div className={`${c.color} p-3 rounded-xl text-white`}><c.icon /></div>
                <div>
                  <div className="font-semibold text-gray-800 dark:text-white">{c.title}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">{c.val}</div>
                </div>
              </div>
            ))}
            <div className="glass-card p-6">
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">🌾 Farmer Support Hours</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monday – Saturday: 8 AM – 8 PM IST</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Emergency crop advice: 24/7 via Chatbot</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
