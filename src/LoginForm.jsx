import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginForm({ onLoginSuccess }) {
  const [mode, setMode] = useState("login"); // 'login', 'register', 'forgot'
  const [credentials, setCredentials] = useState({
    username: "admin",
    password: "password123",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }

  async function handleLogin() {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "登入失敗");
      }
      if (onLoginSuccess) onLoginSuccess(data.access_token);
    } catch (err) {
      throw err;
    }
  }

  async function handleRegister() {
    if (credentials.password !== credentials.confirmPassword) {
      throw new Error("密碼與確認密碼不相符");
    }
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "註冊失敗");
      }
      setMessage(data.message || "註冊成功！");
      setMode("login"); // Switch back to login view
    } catch (err) {
      throw err;
    }
  }

  async function handleForgotPassword() {
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "請求失敗");
      }
      setMessage(data.message || "請求已發送");
    } catch (err) {
      throw err;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "login") {
        await handleLogin();
      } else if (mode === "register") {
        await handleRegister();
      } else if (mode === "forgot") {
        await handleForgotPassword();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const renderTitle = () => {
    if (mode === 'register') return '註冊新帳號';
    if (mode === 'forgot') return '忘記密碼';
    return '登入 Network Analyzer';
  };
  
  const renderButtonText = () => {
    if (mode === 'register') return '註冊';
    if (mode === 'forgot') return '發送重設指示';
    return '登入';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-xl font-semibold text-white text-center">{renderTitle()}</h1>

          {mode !== 'forgot' && (
            <p className="text-xs text-center text-slate-400">
              開發者預設帳號：admin / password123
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="username" className="block text-sm text-slate-200">
              使用者名稱
            </label>
            <input
              id="username"
              name="username"
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm"
              value={credentials.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm text-slate-200"
              >
                密碼
              </label>
              <input
                id="password"
                name="password"
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm"
                type="password"
                value={credentials.password}
                onChange={handleChange}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="block text-sm text-slate-200"
              >
                確認密碼
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm"
                type="password"
                value={credentials.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          {message && <p className="text-sm text-green-400 text-center">{message}</p>}

          <button
            type="submit"
            className="w-full flex items-center justify-center rounded bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : renderButtonText()}
          </button>
        </form>

        <div className="text-center mt-4 text-sm">
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('register')} className="text-cyan-400 hover:underline">
                註冊新帳號
              </button>
              <span className="mx-2 text-slate-500">|</span>
              <button onClick={() => setMode('forgot')} className="text-cyan-400 hover:underline">
                忘記密碼？
              </button>
            </>
          ) : (
            <button onClick={() => setMode('login')} className="text-cyan-400 hover:underline">
              返回登入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
