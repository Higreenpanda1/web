import { PlayMark } from '@/components/layout/Logo'
import { adminRequires2FA } from '@/lib/env'
import { GateForm } from './GateForm'

/**
 * The only way into the admin panel.
 *
 * Deliberately English-only and unbranded beyond the mark: it is a staff tool,
 * it is noindex, and it should look nothing like a page a visitor could mistake
 * for the site.
 */
export const dynamic = 'force-dynamic'

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="w-full max-w-[26rem] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <PlayMark size={40} />
        <div>
          <h1 className="text-h3">HiGreenPanda</h1>
          <p className="text-caption text-[var(--text-muted)]">Content management</p>
        </div>
      </div>

      <GateForm next={next ?? '/hgp-studio'} require2FA={adminRequires2FA} />

      {adminRequires2FA ? (
        <p className="mt-6 border-t border-[var(--border)] pt-4 text-caption text-[var(--text-muted)]">
          Lost your authenticator? Use a backup code, then re-enrol with{' '}
          <code className="ltr-nums">npm run totp:enrol</code> on the server.
        </p>
      ) : (
        <p className="mt-6 border-t border-[var(--border)] pt-4 text-caption text-[var(--warning)]">
          Two-factor authentication is switched off. Set <code>ADMIN_REQUIRE_2FA=true</code> before
          this site goes live.
        </p>
      )}
    </main>
  )
}
