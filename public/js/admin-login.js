const TOKEN_KEY = 'admin_auth_token';

async function checkAlreadyLoggedIn() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return;
  }

  const response = await fetch('/api/admin/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.ok) {
    window.location.href = '/admin/reservations.html';
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function onSubmit(event) {
  event.preventDefault();

  const errorEl = document.getElementById('error-message');
  errorEl.textContent = '';

  const form = event.currentTarget;
  const formData = new FormData(form);

  const payload = {
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || '')
  };

  const response = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    errorEl.textContent = body.message || 'Login failed.';
    return;
  }

  localStorage.setItem(TOKEN_KEY, body.token);
  window.location.href = '/admin/reservations.html';
}

checkAlreadyLoggedIn().catch(() => {
  localStorage.removeItem(TOKEN_KEY);
});

document.getElementById('admin-login-form').addEventListener('submit', onSubmit);
