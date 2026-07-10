import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public by design: the publishable key only allows what RLS permits (insert-only on waitlist).
const supabase = createClient(
  'https://nadnckyohyckqkdrjcaj.supabase.co',
  'sb_publishable_N1_3_LP2GrODJY3q6UVBow_fW2cl_ln'
);

const form = document.querySelector('[data-waitlist-form]');
const status = document.querySelector('[data-waitlist-status]');
const submitText = document.querySelector('[data-waitlist-submit-text]');

if (form && status) {
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const input = form.querySelector('input[type="email"]');
    const email = input.value.trim().toLowerCase();
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Joining…';
    status.textContent = '';
    status.classList.remove('waitlist__status--success', 'waitlist__status--error');

    const { error } = await supabase.from('waitlist').insert({ email });

    submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Notify me';

    if (error) {
      const isDuplicate = error.code === '23505';
      status.textContent = isDuplicate
        ? "You're already on the list — thanks!"
        : 'Something went wrong. Please try again.';
      status.classList.add(isDuplicate ? 'waitlist__status--success' : 'waitlist__status--error');
      if (isDuplicate) form.reset();
      return;
    }

    status.textContent = "You're on the list — we'll email you at launch.";
    status.classList.add('waitlist__status--success');
    form.reset();
  });
}

/* Any "get the app" link scrolls here — also focus the email field */
document.querySelectorAll('a[href="#get"]').forEach(link => {
  link.addEventListener('click', () => {
    const emailInput = document.getElementById('waitlist-email');
    if (emailInput) window.setTimeout(() => emailInput.focus(), 400);
  });
});
