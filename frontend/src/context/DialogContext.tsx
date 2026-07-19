import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle, HelpCircle } from 'lucide-react';

interface DialogOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogContextType {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string, options?: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'alert' | 'confirm'>('alert');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [confirmLabel, setConfirmLabel] = useState('OK');
  const [cancelLabel, setCancelLabel] = useState('Cancel');
  const [resolveFn, setResolveFn] = useState<((val: boolean) => void) | null>(null);

  const alert = (msg: string, t: string = 'Alert') => {
    return new Promise<void>((resolve) => {
      setMessage(msg);
      setTitle(t);
      setType('alert');
      setConfirmLabel('OK');
      setIsOpen(true);
      setResolveFn(() => () => {
        resolve();
      });
    });
  };

  const confirm = (msg: string, t: string = 'Confirm Action', options?: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setMessage(msg);
      setTitle(t);
      setType('confirm');
      setConfirmLabel(options?.confirmLabel || 'Confirm');
      setCancelLabel(options?.cancelLabel || 'Cancel');
      setIsOpen(true);
      setResolveFn(() => (val: boolean) => {
        resolve(val);
      });
    });
  };

  const handleConfirm = () => {
    if (resolveFn) resolveFn(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolveFn) resolveFn(false);
    setIsOpen(false);
  };

  const getIcon = () => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('delete') || lowerTitle.includes('remove') || lowerTitle.includes('ban') || lowerTitle.includes('warning')) {
      return <AlertTriangle className="w-6 h-6 text-rose-500" />;
    }
    if (lowerTitle.includes('success') || lowerTitle.includes('save') || lowerTitle.includes('complete')) {
      return <CheckCircle className="w-6 h-6 text-emerald-500" />;
    }
    if (type === 'confirm') {
      return <HelpCircle className="w-6 h-6 text-brand-500" />;
    }
    return <Info className="w-6 h-6 text-blue-500" />;
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}

      {/* Reusable Premium Dialog Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-9999 animate-fade-in">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl max-w-md w-full shadow-2xl p-6 flex flex-col gap-4 transform scale-in duration-200">
            <div className="flex gap-3.5 items-start">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl shrink-0">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
                  {title}
                </h3>
                <p className="text-xs font-semibold text-slate-505 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/60 pt-4">
              {type === 'confirm' && (
                <button
                  onClick={handleCancel}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-605 dark:text-slate-350 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-4.5 py-2.5 text-white rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  title.toLowerCase().includes('delete') || title.toLowerCase().includes('ban')
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/10'
                    : 'bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/10'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
