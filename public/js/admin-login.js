async function checkAlreadyLoggedIn() {
  const response = await fetch('/api/admin/auth/me', {
    credentials: 'same-origin'
  });

  if (response.ok) {
    window.location.href = '/admin/reservations';
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
    credentials: 'same-origin',
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    errorEl.textContent = body.message || 'Login failed.';
    return;
  }

  window.location.href = '/admin/reservations';
}

checkAlreadyLoggedIn().catch(() => null);

document.getElementById('admin-login-form').addEventListener('submit', onSubmit);
