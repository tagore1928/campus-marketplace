import React from 'react';
import { EyeOff, MailCheck, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';

export const Privacy: React.FC = () => {
  return (
    <div className="py-10 px-6 max-w-4xl mx-auto flex flex-col gap-10 fade-in text-left">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <span className="px-3 py-1 bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider w-fit">
          Security Guardrails
        </span>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-450 font-bold uppercase tracking-widest">
          Last Updated: June 2026
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Core Pillars */}
        <div className="flex flex-col gap-6">
          <div className="flex gap-4">
            <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl shrink-0 h-fit">
              <MailCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                Email & Account Verification
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                To guarantee safety, we restrict registration to university domain emails ending in `.edu.in`. This isolates all data interactions to authentic university attendees.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0 h-fit">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-855 dark:text-slate-100">
                Identity Masking Control
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                Activating "Anonymous Mode" totally suppresses your profile credentials across active listings, comments, feeds, and real-time chat modules, substituting them with the generic "Campus User" moniker.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 rounded-xl shrink-0 h-fit">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                Administrative Override
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                Under anonymous operations, platform admins maintain access to true identification states. This ensures strict accountability, preventing malicious use or code-of-conduct violations.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Description Block */}
        <div className="p-6 bg-slate-100/60 dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 font-extrabold text-xs text-slate-800 dark:text-slate-205 uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Data Protection Strategy</span>
          </div>
          <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed font-semibold">
            We store listing descriptions, messaging payloads, and notification logs in secure, encrypted cloud partitions. The data is retrieved only via verified JWT auth tokens.
          </p>
          <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed font-semibold">
            We never share or resell student data to third-party marketing entities. Our campus filtering systems verify and segment listings based on the associated email domain prefix, keeping interactions isolated to matching peer networks.
          </p>
        </div>
      </div>
    </div>
  );
};
