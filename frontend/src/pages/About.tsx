import React from 'react';
import { Award, Compass, Heart, ShieldAlert, Sparkles, Users } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="py-10 px-6 max-w-4xl mx-auto flex flex-col gap-10 fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-650 dark:from-brand-950/80 dark:to-indigo-950/80 rounded-3xl p-8 md:p-12 text-white shadow-xl text-center flex flex-col items-center gap-4">
        <div className="absolute top-4 right-4 animate-spin-slow">
          <Sparkles className="w-8 h-8 opacity-30 text-white" />
        </div>
        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider">
          Our Vision
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Connecting Verified Student Networks
        </h1>
        <p className="text-sm md:text-base max-w-xl opacity-90 leading-relaxed font-semibold">
          Campus Market is a secure, hyper-local peer-to-peer network combining trusted local e-commerce with segmented community interaction boards.
        </p>
      </div>

      {/* Grid of Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            For Students, By Students
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
            Built exclusively to ease the campus lifecycle, facilitating frictionless sharing, trade, and engagement.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Segmented Feeds
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
            Engage with your local college peers via dedicated feeds or look outward to other college systems globally.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Trusted Exchanges
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
            We enforce strict `.edu.in` boundaries, eliminating anonymous bots and ensuring a community you can trust.
          </p>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="p-6 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-xl shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-205">Safety & Trust First</h4>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 leading-relaxed font-semibold">
            Campus Market does not handle delivery or payment collection. When trading items, always meet in busy, well-lit campus environments (like libraries, cafeterias, or student centers) and carefully review items prior to making final payments.
          </p>
        </div>
      </div>
    </div>
  );
};
