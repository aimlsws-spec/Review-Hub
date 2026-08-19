import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useLoginMutation } from '@/hooks/useAuthMutations'
import { Spinner } from '@reviewhub/shared-ui'
import { ROUTES } from '@/constants'
import { getApiErrorMessage, cn } from '@/utils'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

// ─── Floating composition components ─────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={cn('h-3.5 w-3.5', s <= rating ? 'text-[#F3A139]' : 'text-slate-100')} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard() {
  return (
    <div 
      className="absolute top-[5%] right-[10%] rounded-2xl bg-white p-4 w-[240px] z-20 transition-transform duration-500"
      style={{ 
        boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -4px rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(255,255,255,0.8)',
        animation: 'float-slow 6s ease-in-out infinite'
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-300 to-[#F3A139] flex items-center justify-center overflow-hidden ring-2 ring-white">
             <img src="https://ui-avatars.com/api/?name=Sarah+J&background=random&color=fff" alt="Sarah J" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-900 leading-tight mb-0.5">Sarah J.</p>
            <StarRating rating={5} />
          </div>
        </div>
        <div className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#D77B22]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
        </div>
      </div>
      <p className="text-[12px] text-slate-600 font-medium leading-relaxed">"Amazing experience! Highly recommended to anyone."</p>
    </div>
  )
}

function RatingSummaryCard() {
  return (
    <div 
      className="absolute top-[35%] left-[5%] rounded-[20px] bg-white p-5 w-[280px] z-10 flex"
      style={{ 
        boxShadow: '0 24px 48px -12px rgba(243, 161, 57, 0.12), 0 8px 24px -8px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255,255,255,1)',
        animation: 'float-slow 7s ease-in-out infinite',
        animationDelay: '1s'
      }}
    >
      <div className="flex-1 pr-5 border-r border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ratings</p>
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-[32px] font-extrabold text-slate-900 tracking-tight leading-none">4.8</span>
          </div>
          <div className="mb-2">
            <StarRating rating={5} />
          </div>
          <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
             12% <span className="text-slate-400 font-medium ml-0.5">vs last month</span>
          </p>
      </div>
      <div className="flex-1 pl-5 flex flex-col justify-end pb-1 relative h-[80px]">
          <svg className="w-full h-12 overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M0 35 Q 15 25, 30 35 T 60 20 T 80 10 T 100 5" fill="none" stroke="url(#chartGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0 35 Q 15 25, 30 35 T 60 20 T 80 10 T 100 5 L 100 40 L 0 40 Z" fill="url(#chartFill)" stroke="none" />
              <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F3A139" />
                      <stop offset="100%" stopColor="#D77B22" />
                  </linearGradient>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(243, 161, 57,0.15)" />
                      <stop offset="100%" stopColor="rgba(243, 161, 57,0)" />
                  </linearGradient>
              </defs>
          </svg>
      </div>
    </div>
  )
}

function ReviewRequestsCard() {
  return (
    <div 
      className="absolute bottom-[5%] right-[15%] rounded-[18px] bg-white p-4 w-[200px] z-30"
      style={{ 
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -4px rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(255,255,255,0.9)',
        animation: 'float-slow 8s ease-in-out infinite',
        animationDelay: '2.5s'
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-[12px] font-bold text-slate-700">Review Requests</p>
        <div className="h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center text-[#F3A139]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </div>
      </div>
      <div>
          <p className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-none mb-1.5">2,348</p>
          <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
            18% <span className="text-slate-400 font-medium ml-0.5">vs last month</span>
          </p>
      </div>
    </div>
  )
}

function MessageBubble() {
  return (
    <div 
      className="absolute top-[65%] left-[25%] h-12 w-12 rounded-[16px] rounded-br-[4px] bg-gradient-to-br from-[#F3A139] to-[#D77B22] flex items-center justify-center z-40"
      style={{
        boxShadow: '0 12px 24px -6px rgba(229, 142, 45, 0.4)',
        animation: 'float-slow 5s ease-in-out infinite',
        animationDelay: '1.5s'
      }}
    >
      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
    </div>
  )
}

function FloatingComposition() {
  return (
    <div className="relative w-full h-[450px] flex-1 mt-6 hidden xl:block opacity-0 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
      
      {/* Central subtle radial glow behind the composition */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#F3A139]/5 rounded-full blur-[60px] pointer-events-none" />

      {/* Connected composition area */}
      <div className="relative z-10 w-full h-full max-w-[480px] mx-auto">
         <RatingSummaryCard />
         <ReviewCard />
         <ReviewRequestsCard />
         <MessageBubble />
         
         {/* Sparkle icons for premium feel */}
         <div className="absolute top-[15%] left-[15%] text-orange-300 opacity-80 animate-pulse" style={{ animationDuration: '3s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z"/></svg>
         </div>
         <div className="absolute bottom-[25%] right-[5%] text-[#D77B22] opacity-40 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z"/></svg>
         </div>
      </div>
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  leftIcon: React.ReactNode
  rightIcon?: React.ReactNode
}

const OrangeInput = React.forwardRef<HTMLInputElement, InputProps>(function OrangeInput({ label, error, leftIcon, rightIcon, id, ...props }, ref) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5 group">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-slate-700 tracking-wide transition-colors group-focus-within:text-slate-900">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 transition-colors group-focus-within:text-[#F3A139]">
          {leftIcon}
        </div>
        <input
          id={inputId}
          className={cn(
            'block w-full rounded-[14px] border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-200',
            'shadow-[0_2px_4px_rgba(0,0,0,0.02)]',
            'hover:border-slate-300',
            'focus:border-[#F3A139] focus:outline-none focus:ring-[3px] focus:ring-[#F3A139]/10',
            rightIcon && 'pr-10',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-400/20 text-red-900',
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">{rightIcon}</div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="flex items-center gap-1 mt-0.5 text-[12px] text-red-500 animate-fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { rememberMe: false } })

  const { mutate, isPending } = useLoginMutation()

  function onSubmit(data: LoginForm) {
    mutate(data, {
      onSuccess: () => {
        toast.success('Welcome back!')
        navigate(from, { replace: true })
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-white font-sans selection:bg-orange-100 selection:text-orange-900">

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-up {
          animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          LEFT — Warm Brand Panel (~58%)
      ══════════════════════════════════════════════════════ */}
      <div className="relative hidden lg:flex lg:w-[58%] flex-col overflow-hidden px-12 xl:px-[90px] py-14 bg-[#FAFAFA]">
        
        {/* Subtle premium background texturing */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 0% 0%, #ffffff 0%, #FAFAFA 100%)' }} />
        
        {/* Very subtle noise overlay (2% opacity) */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-multiply pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")' }} />
        
        {/* Soft abstract radial gradients (Not blobs, just soft glows) */}
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(243, 161, 57,0.04)_0,transparent_60%)] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(229, 142, 45,0.03)_0,transparent_50%)] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/4" />
        
        {/* Subtle dotted accent in corner */}
        <div className="absolute bottom-12 left-12 w-32 h-32 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

        {/* Brand wordmark */}
        <div className="relative z-10 flex items-center gap-3.5 opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#F3A139] to-[#D77B22] shadow-[0_4px_12px_rgba(229, 142, 45,0.25)] ring-1 ring-white/10 inset-ring-1 inset-ring-white/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="white" />
            </svg>
          </div>
          <div>
            <p className="text-[19px] font-extrabold tracking-tight text-slate-900 leading-none">ReviewHub</p>
            <p className="text-[11px] font-bold text-[#E58E2D] leading-tight mt-1 uppercase tracking-widest">Merchant Portal</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 mt-[80px] flex-1 flex flex-col xl:flex-row gap-8 items-center xl:items-start">
          <div className="flex-1 w-full max-w-[440px] opacity-0 animate-fade-up" style={{ animationDelay: '150ms' }}>
            
            {/* Trust badge */}
            <div className="mb-8 inline-flex items-center gap-2.5 bg-white border border-slate-100 rounded-full pl-1.5 pr-4 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-[#F3A139] to-[#D77B22] text-white shadow-sm">
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase">Trusted by 2,000+ businesses</span>
            </div>

            {/* Headline */}
            <h1 className="text-[3.25rem] font-extrabold leading-[1.1] tracking-tight text-[#1B365D] mb-5">
              Every Review<br />
              Builds<br />
              <span className="bg-clip-text text-transparent pb-1" style={{ backgroundImage: 'linear-gradient(90deg, #F3A139, #E58E2D, #D77B22)' }}>
                Your Brand
              </span>
            </h1>

            <p className="text-[16px] leading-[1.6] text-slate-500 mb-10 max-w-[400px]">
              Collect verified customer reviews, strengthen your reputation, and grow your business with one powerful platform.
            </p>

            {/* Feature rows (Elegant & Minimal) */}
            <div className="flex flex-col gap-3">
              {[
                { icon: '⭐', title: 'Collect Reviews', desc: 'Automatically collect verified reviews.' },
                { icon: '💬', title: 'Reputation Management', desc: 'Monitor and respond from one dashboard.' },
                { icon: '📈', title: 'Business Insights', desc: 'Understand ratings and customer sentiment.' },
              ].map((f) => (
                <div 
                  key={f.title} 
                  className="group flex items-center gap-4 bg-white hover:bg-[#FFFAF5] border border-slate-100 hover:border-orange-100/60 p-3.5 rounded-[16px] transition-all duration-300 hover:-translate-y-[2px]"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-slate-50 group-hover:bg-orange-50 text-[18px] transition-colors duration-300">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 leading-tight">{f.title}</h3>
                    <p className="text-[13px] text-slate-500 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <FloatingComposition />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT — Auth Panel (~42%)
      ══════════════════════════════════════════════════════ */}
      <div className="relative flex w-full lg:w-[42%] flex-col items-center justify-center bg-white px-6 py-12">
        
        {/* Mobile brand */}
        <div className="relative mb-10 flex flex-col items-center gap-3 lg:hidden opacity-0 animate-fade-up">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#F3A139] to-[#D77B22] shadow-[0_4px_12px_rgba(229, 142, 45,0.25)] ring-1 ring-white/10 inset-ring-1 inset-ring-white/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="white" />
            </svg>
          </div>
          <p className="text-[22px] font-extrabold text-slate-900 tracking-tight">ReviewHub</p>
        </div>

        {/* Auth card wrapper (Creates the centered focal point) */}
        <div className="w-full max-w-[400px] opacity-0 animate-fade-up" style={{ animationDelay: '100ms' }}>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold tracking-tight text-[#1B365D] mb-2">Welcome back</h2>
            <p className="text-[15px] text-slate-500">Sign in to continue managing your business.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* Email */}
            <OrangeInput
              label="Email address"
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Enter your email"
              error={errors.email?.message}
              leftIcon={
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              }
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />

            {/* Password */}
            <OrangeInput
              label="Password"
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              error={errors.password?.message}
              leftIcon={
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none rounded-md px-1 focus-visible:ring-2 focus-visible:ring-orange-500/30"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              }
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-2 pb-4">
              <label className="flex cursor-pointer items-center gap-3 select-none group/cb">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-slate-300 bg-white transition-all checked:border-[#E58E2D] checked:bg-[#E58E2D] group-hover/cb:border-slate-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#F3A139]/20 focus-visible:ring-offset-1"
                    {...register('rememberMe')}
                  />
                  <svg
                    className="pointer-events-none absolute left-[3px] top-[4px] h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                    fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                </div>
                <span className="text-[14px] text-slate-600 font-medium transition-colors group-hover/cb:text-slate-900">Remember me</span>
              </label>
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-[14px] font-semibold text-slate-500 hover:text-[#E58E2D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 rounded-sm"
              >
                Forgot password?
              </Link>
            </div>

            {/* Premium Sign in button */}
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'group relative flex w-full items-center justify-center gap-2 rounded-[14px] px-6 py-4 text-[15px] font-bold text-white transition-all duration-200 overflow-hidden',
                'shadow-[0_4px_14px_0_rgba(229, 142, 45,0.25)] hover:shadow-[0_6px_20px_rgba(229, 142, 45,0.3)]',
                'active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3A139] focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-70',
              )}
              style={{ backgroundImage: 'linear-gradient(135deg, #F3A139 0%, #E58E2D 50%, #D77B22 100%)' }}
            >
              {/* Inner top highlight for tactility */}
              <div className="absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/20 pointer-events-none" />
              
              {isPending ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">Sign in</span>
                  <svg className="h-[18px] w-[18px] ml-0.5 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-4 py-5">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[13px] text-slate-400 font-medium bg-white px-1">or</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Create account */}
            <div className="text-center">
               <span className="text-[14.5px] text-slate-500">Don't have an account? </span>
               <Link
                  to={ROUTES.REGISTER}
                  className="text-[14.5px] font-bold text-slate-900 hover:text-[#E58E2D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 rounded-sm"
                >
                  Create account
                </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="absolute bottom-8 left-0 right-0 text-center text-[13px] text-slate-400 animate-fade-in opacity-0" style={{ animationDelay: '300ms' }}>
           By signing in, you agree to our{' '}
           <span className="font-medium text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">Terms of Service</span>
           {' '}and{' '}
           <span className="font-medium text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}
