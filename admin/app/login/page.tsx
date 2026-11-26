'use client';
import {useState,type FormEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {Suspense} from 'react';
import {api} from '@/lib/api';

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const requested = params.get('next') || '/';
      const next = /^(?:\/|\/(?:businesses|listings|v-ads|users|employees)|\/admin(?:\/[a-z0-9-]+)?)(?:\?[a-zA-Z0-9_=&-]+)?$/.test(
        requested,
      )
        ? requested
        : '/';
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container page" style={{maxWidth: 460}}>
      <p className="eyebrow">VISTRAH Operations Console</p>
      <h1>Administrator sign in</h1>
      <p>Sign in with your administrator credentials to review listings and V Ads.</p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <form className="form" onSubmit={submit}>
        <label>
          Email address
          <input type="email" name="email" autoComplete="email" maxLength={254} required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="container page">Loading…</main>}>
      <Login />
    </Suspense>
  );
}
