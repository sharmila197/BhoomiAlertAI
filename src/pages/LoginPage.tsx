import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const { loginUser } = useApp();
  const [officialId, setOfficialId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedId = officialId.trim();
    if (!trimmedId || !password) {
      setErrorMessage('Please enter both your Official ID and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginUser(trimmedId, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid Official ID or password.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to connect to the authentication service. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800 font-sans">
      {/* Government Infrastructure Top Bar */}
      <header className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md border border-blue-400/40">
              <span className="text-white font-black text-xl font-mono">भ</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white font-heading">
                  BhoomiAlert AI
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  State Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Land Acquisition Decision Support System
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized Personnel Only</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Top Decorative Line */}
          <div className="h-1.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500" />

          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Officer Authentication
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Land Acquisition Monitoring & Decision Support System
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <span>Government of Tamil Nadu</span>
                <span>•</span>
                <span>Revenue Cell</span>
              </div>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Official ID / User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={officialId}
                    onChange={(e) => setOfficialId(e.target.value)}
                    placeholder="e.g. OFFICER-TN-001"
                    disabled={isSubmitting}
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter departmental password"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Sign In to System</span>
                )}
              </button>
            </form>

            {/* Quick Demo Access Bar */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Demo Access
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setOfficialId('OFFICER-TN-001');
                    setPassword('GovPass@2026');
                    setErrorMessage(null);
                    setIsSubmitting(true);
                    try {
                      const res = await loginUser('OFFICER-TN-001', 'GovPass@2026');
                      if (!res.success) setErrorMessage(res.message || 'Authentication error.');
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'Login failed.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700 font-mono">
                    OFFICER-TN-001
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">
                    State DRO • Monitoring Cell
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setOfficialId('DRO-ERODE-101');
                    setPassword('GovPass@2026');
                    setErrorMessage(null);
                    setIsSubmitting(true);
                    try {
                      const res = await loginUser('DRO-ERODE-101', 'GovPass@2026');
                      if (!res.success) setErrorMessage(res.message || 'Authentication error.');
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'Login failed.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700 font-mono">
                    DRO-ERODE-101
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">
                    Dr. M. Sangeetha • CALA
                  </div>
                </button>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[11px] text-slate-400">
                  Password: <code className="text-slate-700 font-mono font-semibold">GovPass@2026</code>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-500 border-t border-slate-200 bg-white">
        BhoomiAlert AI • Secure Government Land Acquisition Decision Support System • National Informatics Standard
      </footer>
    </div>
  );
};
