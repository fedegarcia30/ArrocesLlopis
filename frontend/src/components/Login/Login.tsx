import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirection is now handled automatically by PublicRoute in App.tsx
  // when the user state updates.

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setError('Credenciales incorrectas. Inténtalo de nuevo.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        <h1 className="login-title">Arroces Llopis</h1>
        <p className="login-subtitle">Gestión de Pedidos</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
