import Viralkarlogo from '@/assets/ViralkarLogoK.svg'

/**
 * Centered card shell reused by Register, ForgotPassword, and ResetPassword pages.
 * LoginPage owns its own full-screen two-column layout.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-brand-50 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 flex-shrink-0 items-center justify-center">
          <img src={Viralkarlogo} alt="Viralkar Logo" className="h-12 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ReviewHub</h1>
        <p className="text-sm text-gray-500">Merchant Portal</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
