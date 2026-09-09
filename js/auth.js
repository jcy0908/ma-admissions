/* Supabase Auth: public publishable key only. No privileged keys belong here. */
(() => {
  'use strict';
  const button = document.getElementById('account-button');
  const dialog = document.getElementById('auth-dialog');
  const form = document.getElementById('auth-form');
  const email = document.getElementById('auth-email');
  const password = document.getElementById('auth-password');
  const confirmation = document.getElementById('auth-confirmation');
  const submit = document.getElementById('auth-submit');
  const status = document.getElementById('auth-status');
  const switchButton = document.getElementById('auth-switch');
  const resetButton = document.getElementById('auth-reset');
  const logoutButton = document.getElementById('auth-logout');
  const title = document.getElementById('auth-title');
  const description = document.getElementById('auth-description');
  const account = document.getElementById('auth-account');
  let mode = 'signup';
  let user = null;
  let client;
  let busy = false;
  let recovery = false;

  const messages = {
    invalid_credentials: '이메일 또는 비밀번호를 확인해 주세요.',
    email_not_confirmed: '받은 메일에서 이메일 인증을 먼저 완료해 주세요.',
    user_already_exists: '이미 가입된 이메일입니다. 로그인해 주세요.',
    weak_password: '비밀번호가 보안 기준에 맞지 않습니다. 더 길고 다양한 문자로 설정해 주세요.',
    email_address_invalid: '사용할 수 있는 이메일 주소를 입력해 주세요.',
    email_address_not_authorized: '현재 인증 메일을 보낼 수 없습니다. 사이트 관리자가 이메일 발송 설정을 완료해야 합니다.',
    over_email_send_rate_limit: '인증 메일 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    over_request_rate_limit: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    signup_disabled: '현재 회원가입이 잠시 중단되어 있습니다.',
    same_password: '기존 비밀번호와 다른 비밀번호를 입력해 주세요.',
    otp_expired: '인증 링크가 만료되었습니다. 새 메일을 요청해 주세요.',
    validation_failed: '이메일과 비밀번호 입력을 확인해 주세요.',
  };

  function notice(message = '', error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }

  function displayMode(next) {
    mode = next;
    notice();
    password.value = '';
    confirmation.value = '';
    confirmation.setCustomValidity('');
    const signup = mode === 'signup';
    const login = mode === 'login';
    const reset = mode === 'reset';
    const update = mode === 'update';
    const signedIn = mode === 'account';
    title.textContent = { signup: '회원가입', login: '로그인', reset: '비밀번호 찾기', update: '새 비밀번호 설정', account: '내 계정' }[mode];
    description.textContent = {
      signup: '이메일로 MA 계정을 만드세요.',
      login: '가입한 이메일로 로그인하세요.',
      reset: '비밀번호를 재설정할 링크를 보내드립니다.',
      update: '앞으로 사용할 비밀번호를 입력해 주세요.',
      account: 'MA에 로그인되어 있습니다.',
    }[mode];
    form.hidden = signedIn;
    account.hidden = !signedIn;
    document.getElementById('auth-account-email').textContent = user?.email || '';
    email.closest('label').hidden = update;
    email.disabled = update || signedIn;
    password.closest('label').hidden = reset;
    password.disabled = reset || signedIn;
    password.minLength = signup || update ? 8 : 1;
    password.autocomplete = signup || update ? 'new-password' : 'current-password';
    confirmation.closest('label').hidden = !(signup || update);
    confirmation.disabled = !(signup || update);
    document.getElementById('auth-password-hint').hidden = !(signup || update);
    submit.textContent = { signup: '계정 만들기', login: '로그인', reset: '재설정 메일 받기', update: '비밀번호 변경' }[mode] || '';
    switchButton.hidden = signedIn || update;
    switchButton.textContent = login ? '처음이신가요? 회원가입' : '이미 계정이 있나요? 로그인';
    resetButton.hidden = !login;
  }

  function open(next) {
    displayMode(next);
    if (!dialog.open) dialog.showModal();
  }

  function setBusy(value) {
    busy = value;
    form.setAttribute('aria-busy', String(value));
    [submit, switchButton, resetButton, logoutButton].forEach(el => { el.disabled = value; });
  }

  async function run(action) {
    if (busy) return;
    if (!client) {
      notice('인증 서비스에 연결하지 못했습니다. 페이지를 새로고침해 주세요.', true);
      return;
    }
    setBusy(true);
    notice('처리 중입니다…');
    try { await action(); }
    catch (error) {
      notice(messages[error.code] || (error.status >= 500
        ? '인증 서비스에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : '요청을 완료하지 못했습니다. 연결 상태와 입력 내용을 확인해 주세요.'), true);
    } finally { setBusy(false); }
  }

  // Remove fragments and queries: redirects must stay on this site's origin/path.
  const callbackUrl = new URL(window.location.pathname, window.location.origin).href;
  button.addEventListener('click', () => open(recovery ? 'update' : user ? 'account' : 'signup'));
  document.getElementById('auth-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    password.value = '';
    confirmation.value = '';
  });
  switchButton.addEventListener('click', () => displayMode(mode === 'login' ? 'signup' : 'login'));
  resetButton.addEventListener('click', () => displayMode('reset'));
  [password, confirmation].forEach(el => el.addEventListener('input', () => confirmation.setCustomValidity('')));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if ((mode === 'signup' || mode === 'update') && password.value !== confirmation.value) {
      confirmation.setCustomValidity('비밀번호가 일치하지 않습니다.');
      confirmation.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    const actionMode = mode;
    const credentials = { email: email.value.trim(), password: password.value };
    run(async () => {
      if (actionMode === 'signup') {
        const { data, error } = await client.auth.signUp({ ...credentials, options: { emailRedirectTo: callbackUrl } });
        if (error) throw error;
        password.value = '';
        confirmation.value = '';
        if (data.session) { user = data.session.user; displayMode('account'); notice('회원가입이 완료되었습니다.'); }
        else { displayMode('login'); notice('가입을 진행할 수 있는 이메일이면 인증 메일이 발송됩니다. 받은 메일의 링크를 누른 후 여기에서 로그인해 주세요. 스팸함도 확인해 주세요.'); }
      } else if (actionMode === 'login') {
        const { data, error } = await client.auth.signInWithPassword(credentials);
        if (error) throw error;
        user = data.user;
        displayMode('account');
        notice('로그인되었습니다.');
      } else if (actionMode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(credentials.email, { redirectTo: callbackUrl });
        if (error) throw error;
        notice('가입된 이메일이면 재설정 링크가 발송됩니다. 받은 메일과 스팸함을 확인해 주세요.');
      } else if (actionMode === 'update') {
        const { error } = await client.auth.updateUser({ password: credentials.password });
        if (error) throw error;
        recovery = false;
        displayMode('account');
        notice('비밀번호가 변경되었습니다.');
      }
    });
  });

  logoutButton.addEventListener('click', () => run(async () => {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    user = null;
    recovery = false;
    displayMode('login');
    notice('로그아웃되었습니다.');
  }));

  try {
    client = window.supabase.createClient(
      'https://vwvkonfvwdkdvnjedbnx.supabase.co',
      'sb_publishable_P-wSRxT8hvg3ETN2LgTCSA_PpSCbMyy',
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } }
    );
    // Synchronous callback: avoid auth API calls inside this subscription.
    client.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      button.textContent = user ? '내 계정' : '회원가입';
      if (event === 'PASSWORD_RECOVERY') { recovery = true; open('update'); }
      else if (event === 'SIGNED_OUT') { recovery = false; if (dialog.open) displayMode('login'); }
      else if (user && dialog.open && !busy && !recovery) displayMode('account');
    });
    client.auth.getSession().then(({ error }) => {
      if (error) { open('login'); notice('인증 링크를 확인하지 못했습니다. 다시 로그인하거나 새 링크를 요청해 주세요.', true); }
    }).catch(() => { if (dialog.open) notice('인증 서비스에 연결하지 못했습니다. 새로고침해 주세요.', true); });
  } catch {
    client = null;
  }

  const authError = new URLSearchParams(window.location.hash.slice(1)).get('error_description');
  if (authError) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    open('login');
    notice('인증 링크가 만료되었거나 유효하지 않습니다. 다시 로그인하거나 새 링크를 요청해 주세요.', true);
  }
})();
