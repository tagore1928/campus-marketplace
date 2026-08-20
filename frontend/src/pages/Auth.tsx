import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, ShieldCheck, Mail, Lock, User, Search, Chrome, ChevronDown, X } from 'lucide-react';

const PREDEFINED_COLLEGES = [
  'IIT Bombay',
  'IIT Delhi',
  'BITS Pilani',
  'VIT Vellore',
  'RV College of Engineering',
];

// ─── Searchable College Dropdown Component ────────────────────────────────────
interface CollegeDropdownProps {
  colleges: string[];
  value: string;
  onChange: (college: string, isCustom: boolean) => void;
  disabled?: boolean;
}

const CollegeDropdown: React.FC<CollegeDropdownProps> = ({ colleges, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredColleges = colleges.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  const isCustomEntry = query.trim() && !colleges.some((c) => c.toLowerCase() === query.trim().toLowerCase());

  const handleSelect = (college: string, isCustom = false) => {
    onChange(college, isCustom);
    setQuery('');
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(!open);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-left text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all flex items-center justify-between disabled:opacity-50 cursor-pointer"
      >
        <span className={value ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}>
          {value || 'Select your college...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-2xl shadow-xl overflow-hidden fade-in">
          {/* Search input */}
          <div className="relative border-b border-light-border dark:border-dark-border">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search or add college..."
              className="w-full pl-9 pr-8 py-2.5 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <ul className="max-h-52 overflow-y-auto py-1.5">
            {filteredColleges.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => handleSelect(c, false)}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-700 dark:hover:text-brand-400 transition-colors cursor-pointer"
                >
                  {c}
                </button>
              </li>
            ))}

            {/* Custom entry option */}
            {isCustomEntry && (
              <li>
                <button
                  type="button"
                  onClick={() => handleSelect(query.trim(), true)}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 rounded text-[9px] font-bold uppercase tracking-wider">Add</span>
                  "{query.trim()}"
                </button>
              </li>
            )}

            {filteredColleges.length === 0 && !isCustomEntry && (
              <li className="px-4 py-3 text-xs font-semibold text-slate-400 text-center">No colleges found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── Main Auth Component ──────────────────────────────────────────────────────
export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle } = useAuth();

  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegesList, setCollegesList] = useState<string[]>(PREDEFINED_COLLEGES);

  // Unified college state for both form and Google sign-in
  const [selectedCollege, setSelectedCollege] = useState('');
  const [isCustomCollege, setIsCustomCollege] = useState(false);

  // Google-specific: show college picker before sign-in
  const [googleCollegePicked, setGoogleCollegePicked] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await axios.get('/api/auth/colleges');
        setCollegesList(res.data);
      } catch (err) {
        console.error('Error loading colleges registry:', err);
      }
    };
    fetchColleges();
  }, []);

  const handleCollegeChange = (college: string, isCustom: boolean) => {
    setSelectedCollege(college);
    setIsCustomCollege(isCustom);
  };

  // ── Email/Password submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/');
      } else {
        if (!name.trim()) throw new Error('Name is required.');
        if (!selectedCollege) throw new Error('Please select or enter your college name.');
        await register(email, password, name.trim(), selectedCollege, isCustomCollege);
        setSuccess("Registration successful! We've sent a verification email to your campus email address. Please click the link to verify your email, then sign in below.");
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError(null);
    setSuccess(null);

    // Require college selection before initiating Google OAuth
    if (!selectedCollege) {
      setError('Please select your college before signing in with Google.');
      return;
    }

    setGoogleLoading(true);
    try {
      await loginWithGoogle(selectedCollege, isCustomCollege);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google Auth failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-4 md:p-8 transition-colors">
      <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 md:gap-0 bg-white dark:bg-dark-surface rounded-3xl overflow-hidden shadow-2xl border border-light-border dark:border-dark-border">
        {/* Banner Column */}
        <div className="md:col-span-5 bg-gradient-to-br from-brand-700 via-brand-600 to-accent-pink p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">Campus Market</span>
          </div>

          <div className="relative z-10 my-12 md:my-0">
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-4">
              Trade items within your campus securely.
            </h2>
            <p className="text-brand-100 font-medium text-sm md:text-base leading-relaxed">
              Join your college marketplace. Sell textbooks, request free sharing, trade dorm furniture, and check trust reviews instantly.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-3 text-xs font-semibold text-brand-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Exclusive to .edu.in or .in domains</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>College-verified community</span>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            {/* Header */}
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {isLogin ? 'Sign In' : 'Create Campus Account'}
            </h3>
            <p className="text-sm font-semibold text-slate-400 mt-1.5 mb-6">
              {isLogin ? "Welcome back! Enter credentials to join." : "Verify domain & college to register."}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold leading-normal">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold leading-normal">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">College Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="email"
                    placeholder="email@college.edu.in or .in"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold transition-all"
                  />
                </div>
                {!isLogin && (
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Domain must strictly end with <span className="text-brand-500">.edu.in or .in</span></p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              {/* College Dropdown — shown only for registration */}
              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select College</label>
                  <CollegeDropdown
                    colleges={collegesList}
                    value={selectedCollege}
                    onChange={handleCollegeChange}
                    disabled={loading}
                  />
                  {isCustomCollege && selectedCollege && (
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Custom college "{selectedCollege}" will be registered</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
              >
                {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-light-border dark:border-dark-border" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-3">or continue with</span>
              <div className="flex-1 h-px bg-light-border dark:border-dark-border" />
            </div>

            {/* Google Sign-In Section */}
            <div className="flex flex-col gap-3">
              {/* College picker for Google Sign-In (always visible) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select College for Google Sign-In
                </label>
                <CollegeDropdown
                  colleges={collegesList}
                  value={selectedCollege}
                  onChange={handleCollegeChange}
                  disabled={googleLoading}
                />
                {selectedCollege && (
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    {isCustomCollege ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Custom: "{selectedCollege}" will be registered</span>
                    ) : (
                      <span>College selected: <span className="text-brand-600 dark:text-brand-400 font-bold">{selectedCollege}</span></span>
                    )}
                  </p>
                )}
                {!selectedCollege && (
                  <p className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 mt-0.5">
                    ⚠ College selection is required before Google Sign-In
                  </p>
                )}
              </div>

              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleLogin}
                disabled={googleLoading || !selectedCollege}
                className="w-full py-3 border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Chrome className="w-4 h-4 text-brand-600" />
                {googleLoading ? 'Signing in...' : 'Sign In with Google'}
              </button>
            </div>

            {/* Toggle form link */}
            <p className="text-center text-xs font-semibold text-slate-400 mt-8">
              {isLogin ? "Don't have a campus account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer"
              >
                {isLogin ? 'Register now' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
