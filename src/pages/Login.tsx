import { useState } from 'react';
import { db } from '../db';
import FintrackLogo from '../components/FintrackLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await db.auth.sendMagicCode({ email });
      setStep('code');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code. Check the email address.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await db.auth.signInWithMagicCode({ email, code });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4">
          <FintrackLogo size={56} showWordmark={false} />
          <div className="text-center">
            <p className="text-3xl" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>
              <span className="text-indigo-500 dark:text-indigo-400">fin</span>
              <span className="text-slate-900 dark:text-white">track</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Personal Finance Tracker</p>
          </div>
        </div>

        <div className="card">
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-primary">Sign in</h2>
                <p className="text-sm text-muted mt-0.5">We'll send a 6-digit code to your email</p>
              </div>
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-primary">Check your email</h2>
                <p className="text-sm text-muted mt-0.5">
                  Enter the code sent to <span className="font-medium text-secondary">{email}</span>
                </p>
              </div>
              <div>
                <label className="label">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading || code.length < 6}>
                {loading ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                type="button"
                className="btn-ghost w-full text-sm"
                onClick={() => { setStep('email'); setError(''); setCode(''); }}
              >
                ← Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
