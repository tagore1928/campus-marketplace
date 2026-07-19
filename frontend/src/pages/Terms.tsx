import React from 'react';
import { BookOpen, Scale, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const Terms: React.FC = () => {
  return (
    <div className="py-10 px-6 max-w-4xl mx-auto flex flex-col gap-10 fade-in text-left">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <span className="px-3 py-1 bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider w-fit">
          Terms & Code
        </span>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-450 font-bold uppercase tracking-widest">
          Last Updated: June 2026
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex gap-4">
            <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl shrink-0 h-fit">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                1. Systemic Behavioral Policies
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                All users must maintain constructive, respectful dialogue. Harassment, verbal abuse, or spam posting across campus social channels will lead to immediate, permanent account termination.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0 h-fit">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-855 dark:text-slate-100">
                2. Precise Listing Conditions
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                Sellers are required to provide accurate, honest item conditions. Misrepresentation of electronic goods, textbooks, or other merchandise is strictly prohibited.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-650 dark:text-rose-455 rounded-xl shrink-0 h-fit">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                3. Prohibited Posts & Content
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                You may not list illegal substances, weapons, stolen items, pirated textbook files, or inappropriate text/images. Such listings will be automatically scrubbed.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Moderation Block */}
        <div className="p-6 bg-slate-100/60 dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 font-extrabold text-xs text-slate-800 dark:text-slate-205 uppercase tracking-wider">
            <UserCheck className="w-5 h-5 text-brand-655" />
            <span>Administrative Mandates</span>
          </div>
          <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed font-semibold">
            Our administrative moderation panel maintains absolute authority to suspend listings, prune inappropriate social posts, delete chats that display illegal transactions, and revoke access parameters for users violating campus codes of conduct.
          </p>
          <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed font-semibold">
            By accessing or posting on Campus Market, you agree to comply with your university's local honor codes and student conduct regulations.
          </p>
        </div>
      </div>
    </div>
  );
};
