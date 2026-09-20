import React from 'react'

/**
 * Rendered above the stock Payload login form. Anyone who reaches that form
 * directly needs to know why their password alone will not work: logins are
 * refused here when ADMIN_REQUIRE_2FA is on, and the two-factor gate is the
 * only way in.
 */
export function LoginNotice() {
  if (process.env.ADMIN_REQUIRE_2FA !== 'true') return null

  return (
    <div
      style={{
        border: '1px solid #9fd6a7',
        background: '#e2f3e5',
        color: '#12341b',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '1.5rem',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
        Two-factor authentication is required
      </strong>
      Sign in at{' '}
      <a href="/hgp-studio-gate" style={{ color: '#276b34', fontWeight: 600 }}>
        /hgp-studio-gate
      </a>
      , where you will be asked for your authenticator code. This form cannot complete a sign-in.
    </div>
  )
}

export default LoginNotice
