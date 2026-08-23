'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get('reason') === 'idle') {
      setError('You were logged out due to inactivity.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    return () => {
      setPassword('');
      if (passwordInputRef.current) {
        passwordInputRef.current.value = '';
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailValue = email.trim();
    const passwordValue = password;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      });
      const data = await response.json();

      setPassword('');
      if (passwordInputRef.current) {
        passwordInputRef.current.value = '';
      }

      if (!response.ok) {
        if (response.status === 429) {
          const mins = Math.floor(data.secondsRemaining / 60);
          const secs = data.secondsRemaining % 60;
          setError(`Too many failed attempts. Try again in ${mins}m ${secs}s.`);
        } else {
          setError(data.error || 'Invalid email or password');
        }
        setLoading(false);
        return;
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (setSessionError) {
        setError('Failed to establish session. Please try again.');
        setLoading(false);
        return;
      }

      const { data: roleData, error: dbError } = await supabase
        .from('users')
        .select('role')
        .eq('email', emailValue)
        .single();

      setLoading(false);

      if (dbError || !roleData) {
        setError('User role not found');
        return;
      }

      setEmail('');

      switch (roleData.role) {
        case 'superadmin':
          router.push('/superadmin');
          break;
        case 'admin':
          router.push('/dashboard');
          break;
        case 'registration':
          router.push('/transfer');
          break;
        case 'nurse':
          router.push('/nurse');
          break;
        default:
          router.push('/transfer');
      }
    } catch (error) {
      setPassword('');
      if (passwordInputRef.current) {
        passwordInputRef.current.value = '';
      }
      setLoading(false);
      setError('An error occurred during login');
      console.error('Login error:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#fffdfd] via-[#fff5f5] to-[#ffeaea] px-5 font-sans">

      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-100px] right-[-100px] h-[450px] w-[450px] rounded-full bg-[#ff6b6b]/20 blur-[130px]" />
        <div className="absolute bottom-[-120px] left-[-80px] h-[400px] w-[400px] rounded-full bg-[#ff8a8a]/20 blur-[130px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd4d4]/30 blur-[160px]" />
      </div>

      <button
        onClick={() => router.push('/')}
        className="fixed left-8 top-8 z-20 flex items-center gap-2 rounded-xl border border-white/40 bg-white/40 px-4 py-2 text-gray-600 backdrop-blur-xl transition hover:bg-white/60 hover:text-[#cc3535]"
        aria-label="Back to Home"
      >
        <i className="bx bx-arrow-back text-xl"></i>
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/40 bg-white/35 px-10 pb-8 pt-10 shadow-[0_10px_50px_rgba(255,120,120,0.10)] backdrop-blur-2xl">

        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">
          Staff Login
        </h1>

        <p className="mb-8 text-center text-sm text-gray-500">
          Enter your credentials to access your account
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-5">
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-black backdrop-blur-xl transition-all duration-300 focus:border-[#cc3535] focus:outline-none focus:ring-4 focus:ring-red-100"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 pr-12 text-sm text-black backdrop-blur-xl transition-all duration-300 focus:border-[#cc3535] focus:outline-none focus:ring-4 focus:ring-red-100"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#cc3535] transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`bx ${showPassword ? 'bx-hide' : 'bx-show'} text-xl`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#cc3535] py-3 text-base font-semibold text-white shadow-[0_10px_30px_rgba(204,53,53,0.20)] transition-all duration-300 hover:bg-red-700 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Login to your account"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="bx bx-loader-alt animate-spin"></i>
                Checking...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {error && (
          <div 
            className="mt-5 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-center text-sm text-[#dc3545] backdrop-blur-md"
            role="alert"
            aria-live="polite"
          >
            <i className="bx bx-error-circle mr-2"></i>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}