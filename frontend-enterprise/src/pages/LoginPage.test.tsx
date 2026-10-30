// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ENTERPRISE_AUTH_STORAGE_KEY,
  type EnterpriseAuthSession,
} from '../auth';
import { I18nProvider } from '../i18n';

import LoginPage from './LoginPage';

const session: EnterpriseAuthSession = {
  token: 'token-1',
  user: {
    id: 'user-1',
    tenant_id: 'tenant_demo',
    username: 'admin',
    role: 'admin',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
    text: async () => JSON.stringify(body),
  } as Response;
}

function renderLogin(onLogin = vi.fn()) {
  render(
    <I18nProvider>
      <LoginPage onLogin={onLogin} />
    </I18nProvider>,
  );
  return onLogin;
}

async function enterCredentials(
  user: ReturnType<typeof userEvent.setup>,
  username = 'admin',
  password = 'secret',
) {
  await user.type(screen.getByLabelText('账号'), username);
  await user.type(screen.getByLabelText('密码'), password);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('LoginPage', () => {
  it('shows the login form and employee illustration on first render', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: '登录账户' })).toBeTruthy();
    expect(screen.getByLabelText('账号')).toBeTruthy();
    expect(screen.getByLabelText('密码')).toBeTruthy();
    expect(screen.getByRole('img', {
      name: '来自运营、销售、开发、客服和数据岗位的数字员工团队',
    })).toBeTruthy();
  });

  it('does not request login and shows field errors when credentials are empty', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('请输入账号')).toBeTruthy();
    expect(screen.getByText('请输入密码')).toBeTruthy();
    expect(screen.getByLabelText('账号').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('密码').getAttribute('aria-invalid')).toBe('true');
  });

  it('toggles the password between hidden and visible text', async () => {
    const user = userEvent.setup();
    renderLogin();
    const password = screen.getByLabelText('密码');

    expect(password.getAttribute('type')).toBe('password');
    await user.click(screen.getByRole('button', { name: '显示密码' }));
    expect(password.getAttribute('type')).toBe('text');
    await user.click(screen.getByRole('button', { name: '隐藏密码' }));
    expect(password.getAttribute('type')).toBe('password');
  });

  it('posts trimmed credentials with the configured tenant', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse(session));
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    await enterCredentials(user, '  admin  ', '  secret  ');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'tenant_demo',
        username: 'admin',
        password: 'secret',
      }),
    }));
  });

  it('stores the session and notifies the caller after a successful login', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(session)));
    const onLogin = renderLogin();

    await enterCredentials(user);
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(session));
    expect(JSON.parse(window.localStorage.getItem(ENTERPRISE_AUTH_STORAGE_KEY) || 'null'))
      .toEqual(session);
  });

  it('remembers the account only after a successful login', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(session)));
    renderLogin();

    await enterCredentials(user, 'zongkelong', 'secret');
    await user.click(screen.getByRole('checkbox', { name: '记住账号' }));
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('staffdeck.remembered_username'))
        .toBe('zongkelong');
    });
  });

  it('submits the form when Enter is pressed in a credential field', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse(session));
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    await enterCredentials(user);
    await user.keyboard('{Enter}');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('disables submission and shows progress while login is pending', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    const onLogin = renderLogin();

    await enterCredentials(user);
    await user.click(screen.getByRole('button', { name: '登录' }));

    const pendingButton = screen.getByRole('button', { name: '登录中…' });
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true);
    expect(pendingButton.closest('form')?.getAttribute('aria-busy')).toBe('true');

    resolveRequest?.(jsonResponse(session));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(session));
  });

  it('shows an API error without storing a session or notifying the caller', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: '账号或密码错误' }, 401)));
    const onLogin = renderLogin();

    await enterCredentials(user, 'zongkelong', 'wrong-password');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect((await screen.findByRole('alert')).textContent).toContain('账号或密码错误');
    expect(window.localStorage.getItem(ENTERPRISE_AUTH_STORAGE_KEY)).toBeNull();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('clears the account without changing the password', async () => {
    const user = userEvent.setup();
    renderLogin();

    await enterCredentials(user);
    await user.click(screen.getByRole('button', { name: '清空账号' }));

    expect((screen.getByLabelText('账号') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('密码') as HTMLInputElement).value).toBe('secret');
  });

  it('forgets a remembered account when the account is cleared', async () => {
    window.localStorage.setItem('staffdeck.remembered_username', 'zongkelong');
    const user = userEvent.setup();
    renderLogin();

    expect((screen.getByLabelText('账号') as HTMLInputElement).value).toBe('zongkelong');
    expect((screen.getByRole('checkbox', { name: '记住账号' }) as HTMLInputElement).checked)
      .toBe(true);

    await user.click(screen.getByRole('button', { name: '清空账号' }));

    expect(window.localStorage.getItem('staffdeck.remembered_username')).toBeNull();
    expect((screen.getByRole('checkbox', { name: '记住账号' }) as HTMLInputElement).checked)
      .toBe(false);
  });
});
