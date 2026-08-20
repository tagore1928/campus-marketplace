import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShieldCheck, Heart, MapPin, Send, Loader2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await axios.post('/api/support-tickets', {
        name: name.trim(),
        email: email.trim(),
        message: message.trim()
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-white dark:bg-dark-surface border-t border-light-border dark:border-dark-border transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 pb-10 border-b border-slate-100 dark:border-slate-800/60">
          
          {/* Brand, Description & Safety */}
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <div className="w-9 h-9 rounded-xl bg-brand-600 dark:bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-brand-600 to-indigo-650 dark:from-brand-400 dark:to-indigo-400 bg-clip-text text-transparent">
                CampusMarket
              </span>
            </Link>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed max-w-sm">
              The premier hyper-local peer-to-peer student marketplace. Safely trade textbooks, electronics, furniture, and more within your verified university community.
            </p>
            
            <div className="p-4 bg-brand-50/20 dark:bg-brand-950/10 border border-brand-100/50 dark:border-brand-900/10 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Campus Safety Guidelines</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                Always schedule exchanges in broad daylight at high-traffic campus locations and verify item conditions before transferring payments.
              </p>
            </div>
          </div>

          {/* Quick Navigation & Legal Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                Quick Links
              </h4>
              <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-650 dark:text-slate-400">
                <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Feed Explorer
                </Link>
                <Link to="/create-post" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Sell Item
                </Link>
                <Link to="/chat" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Inbox Chats
                </Link>
                <Link to="/profile" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  My Profile
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                Legal & About
              </h4>
              <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-655 dark:text-slate-400">
                <Link to="/about" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  About Us
                </Link>
                <Link to="/privacy" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>

          {/* Contact Us Support Form */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              Contact Support
            </h4>
            
            <form onSubmit={handleSubmitTicket} className="flex flex-col gap-2.5">
              {error && (
                <p className="text-[10px] font-bold text-rose-500">{error}</p>
              )}
              {success && (
                <p className="text-[10px] font-bold text-emerald-500">Ticket submitted! We will respond shortly.</p>
              )}
              
              <input
                type="text"
                placeholder="Your Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-xs font-semibold text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              />
              <input
                type="email"
                placeholder="College Email (.edu.in or .in)"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-855 border border-light-border dark:border-dark-border rounded-xl text-xs font-semibold text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              />
              <textarea
                placeholder="Type your ticket query/message here..."
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-xs font-semibold text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all resize-none"
              />
              
              <button
                type="submit"
                disabled={submitting}
                className="py-2 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-500/10 flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>© {new Date().getFullYear()} CampusMarket. Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for students worldwide.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[11px] bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 px-2.5 py-1 rounded-lg">
              <MapPin className="w-3 h-3 text-brand-500" /> Verified Campus Domain
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

