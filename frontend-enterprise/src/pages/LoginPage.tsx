import { useState } from 'react';
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import loginEmployees from '../assets/staffdeck/login-employees-v2.webp';
import { api, TENANT_ID } from '../api/client';
import { setEnterpriseAuthSession, type EnterpriseAuthSession } from '../auth';
import BrandLogo from '../components/BrandLogo';

export type LoginPageProps = {
  onLogin: (session: EnterpriseAuthSession) => void;
};

const REMEMBERED_USERNAME_KEY = 'staffdeck.remembered_username';

function getRememberedUsername() {
  try {
    return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) || '';
  } catch {
    return '';
  }
}

function setRememberedUsernameStorage(username?: string) {
  try {
    if (username) {
      window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
    } else {
      window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    }
  } catch {
    // Account remembrance is optional and must not block authentication.
  }
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState(getRememberedUsername);
  const [password, setPassword] = useState('');
  const [rememberUsername, setRememberUsername] = useState(
    () => Boolean(getRememberedUsername()),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (loading) return;

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const nextUsernameError = trimmedUsername ? '' : '请输入账号';
    const nextPasswordError = trimmedPassword ? '' : '请输入密码';

    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);
    setFormError('');
    if (nextUsernameError || nextPasswordError) return;

    setLoading(true);
    try {
      const session = await api.post<EnterpriseAuthSession>('/api/auth/login', {
        tenant_id: TENANT_ID,
        username: trimmedUsername,
        password: trimmedPassword,
      });
      if (rememberUsername) {
        setRememberedUsernameStorage(trimmedUsername);
      } else {
        setRememberedUsernameStorage();
      }
      setEnterpriseAuthSession(session);
      onLogin(session);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '登录失败，请检查账号和密码';
      setFormError(messageText || '登录失败，请检查账号和密码');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-titlebar-safe-area" aria-hidden="true" />

      <main className="login-layout">
        <section className="login-intro" aria-labelledby="login-welcome-title">
          <BrandLogo markSize={44} className="login-brand" />

          <div className="login-intro-copy">
            <h1 id="login-welcome-title">
              欢迎<span>回来</span>
            </h1>
            <p>登录 StaffDeck，开始管理你的数字员工</p>
          </div>

          <img
            src={loginEmployees}
            alt="来自运营、销售、开发、客服和数据岗位的数字员工团队"
            className="login-employee-scene"
            draggable={false}
          />
        </section>

        <section className="login-card" aria-labelledby="login-form-title">
          <div className="login-card-inner">
            <h2 id="login-form-title">登录账户</h2>

            <form
              className="login-form"
              aria-busy={loading}
              onSubmit={(event) => {
                event.preventDefault();
                void login();
              }}
            >
              <div className="login-field-group">
                <label htmlFor="login-username">账号</label>
                <div className={`login-field ${usernameError ? 'is-error' : ''}`}>
                  <UserRound aria-hidden="true" />
                  <input
                    id="login-username"
                    value={username}
                    autoComplete="username"
                    placeholder="请输入账号"
                    aria-invalid={Boolean(usernameError)}
                    aria-describedby={usernameError ? 'login-username-error' : undefined}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      if (usernameError) setUsernameError('');
                      if (formError) setFormError('');
                    }}
                  />
                  {username && (
                    <button
                      type="button"
                      aria-label="清空账号"
                      onClick={() => {
                        setUsername('');
                        setRememberUsername(false);
                        setRememberedUsernameStorage();
                        setUsernameError('');
                        setFormError('');
                      }}
                    >
                      <X aria-hidden="true" />
                    </button>
                  )}
                </div>
                {usernameError && (
                  <p id="login-username-error" className="login-field-error" role="alert">
                    {usernameError}
                  </p>
                )}
              </div>

              <div className="login-field-group">
                <label htmlFor="login-password">密码</label>
                <div className={`login-field ${passwordError ? 'is-error' : ''}`}>
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="login-password"
                    value={password}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? 'login-password-error' : undefined}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (passwordError) setPasswordError('');
                      if (formError) setFormError('');
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
                {passwordError && (
                  <p id="login-password-error" className="login-field-error" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="login-options">
                <label>
                  <input
                    type="checkbox"
                    checked={rememberUsername}
                    onChange={(event) => {
                      setRememberUsername(event.target.checked);
                      if (!event.target.checked) setRememberedUsernameStorage();
                    }}
                  />
                  <span>记住账号</span>
                </label>
                <span><ShieldCheck aria-hidden="true" />本机安全登录</span>
              </div>

              <div className="login-form-status" aria-live="polite">
                {formError && <p role="alert">{formError}</p>}
              </div>

              <button className="login-submit" type="submit" disabled={loading}>
                {loading && <LoaderCircle className="login-spinner" aria-hidden="true" />}
                {loading ? '登录中…' : '登录'}
              </button>
            </form>

            <p className="login-first-use">首次使用：账号与密码均为 admin</p>
            <div className="login-card-divider" aria-hidden="true" />
            <p className="login-platform-name">StaffDeck 数字员工运营平台</p>
          </div>
        </section>
      </main>

      <footer className="login-security" aria-label="安全特性">
        <span><ShieldCheck aria-hidden="true" />安全登录</span>
        <i aria-hidden="true" />
        <span>数据加密</span>
        <i aria-hidden="true" />
        <span>隐私保护</span>
      </footer>
    </div>
  );
}
