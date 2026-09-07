import { Spinner } from '@reviewhub/shared-ui'
import { useMutation } from '@tanstack/react-query'
import { ShieldCheck, Activity, Users, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Sparkles, Building2, Star, Check } from 'lucide-react'
import React, { useState, InputHTMLAttributes, forwardRef } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate, useLocation } from 'react-router-dom'

import Viralkarlogo from '@/assets/ViralkarLogoK.svg'
import { ROUTES } from '@/constants'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage, cn } from '@/utils'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  leftIcon: React.ReactNode
  rightIcon?: React.ReactNode
}

const OutlineInput = forwardRef<HTMLInputElement, InputProps>(function OutlineInput({ label, error, leftIcon, rightIcon, id, ...props }, ref) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-2 group">
      <label htmlFor={inputId} className="text-[13px] font-bold text-[#1B365D] tracking-wide">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
          {leftIcon}
        </div>
        <input
          id={inputId}
          className={cn(
            'block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-[42px] pr-4 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-200',
            'hover:border-slate-300',
            'focus:border-[#F3A139] focus:outline-none focus:ring-[3px] focus:ring-[#F3A139]/10',
            '[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#fff]',
            rightIcon && 'pr-12',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-400/20 text-red-900',
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">{rightIcon}</div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="flex items-center gap-1 mt-1 text-[12px] text-red-500 animate-fade-in" role="alert">
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
  const { login } = useAuth()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { rememberMe: false } })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LoginForm) => login(data),
    onSuccess: () => {
      toast.success('Welcome back')
      navigate(from, { replace: true })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="flex min-h-screen bg-white font-sans selection:bg-orange-100 selection:text-orange-900">

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-fade-up {
          animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-float-slow {
          animation: float-slow 5s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-slow 6s ease-in-out 1s infinite;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          LEFT — Admin Brand Panel (~58%)
      ══════════════════════════════════════════════════════ */}
      <div className="relative hidden lg:flex lg:w-[58%] flex-col px-10 xl:px-16 py-10 bg-[#FAFAFA] border-r border-slate-100 overflow-hidden">
        
        {/* Soft abstract radial gradient behind centerpiece */}
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(243,161,57,0.08)_0,transparent_60%)] rounded-full pointer-events-none" />
        
        {/* Sparkles & Dotted Grid Patterns */}
        <Sparkles className="absolute top-[18%] right-[15%] w-5 h-5 text-[#F3A139] opacity-60" strokeWidth={1.5} />
        <Sparkles className="absolute bottom-[35%] left-[45%] w-4 h-4 text-[#F3A139] opacity-40" strokeWidth={1.5} />
        
        <div className="absolute bottom-10 left-10 w-32 h-24 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F3A139 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

        <div className="relative z-10 flex flex-col h-full w-full">
          
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12 opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex h-10 flex-shrink-0 items-center justify-center">
              <img src={Viralkarlogo} alt="ReviewHub Logo" className="h-10 w-auto" />
            </div>
            <div>
              <p className="text-[19px] font-extrabold tracking-tight text-[#1B365D] leading-none">ReviewHub</p>
              <p className="text-[11px] font-bold text-[#E58E2D] leading-tight mt-1 uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>

          <div className="flex flex-1 justify-between gap-10">
            
            {/* Left Column: Text & Features */}
            <div className="flex-1 max-w-[420px]">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-100 bg-white shadow-sm mb-5 opacity-0 animate-fade-up" style={{ animationDelay: '150ms' }}>
                <ShieldCheck className="w-4 h-4 text-[#F3A139]" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Secure Admin Access</span>
              </div>

              {/* Hero */}
              <div className="opacity-0 animate-fade-up" style={{ animationDelay: '200ms' }}>
                <h1 className="text-[3.5rem] xl:text-[4rem] font-extrabold leading-[1.05] tracking-tight mb-5">
                  <span className="text-[#1B365D] block">Your Platform,</span>
                  <span className="text-[#F3A139] block">In Control.</span>
                </h1>
                <p className="text-[15px] xl:text-[16px] leading-[1.6] text-slate-500 mb-10 max-w-[380px]">
                  Manage the ReviewHub ecosystem with confidence. Monitor users, businesses, reviews, and platform activity from one secure control center.
                </p>
              </div>

              {/* Features List */}
              <div className="flex flex-col gap-6 opacity-0 animate-fade-up" style={{ animationDelay: '250ms' }}>
                {[
                  { icon: <Shield className="w-5 h-5" strokeWidth={2} />, title: 'Secure Administration', desc: 'Role-based platform access.' },
                  { icon: <Activity className="w-5 h-5" strokeWidth={2} />, title: 'Platform Monitoring', desc: 'Centralized operational control.' },
                  { icon: <Users className="w-5 h-5" strokeWidth={2} />, title: 'User & Business Management', desc: 'Manage the ReviewHub ecosystem.' },
                ].map((f) => (
                  <div key={f.title} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[14px] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[#F3A139] flex-shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-[#1B365D] mb-0.5">{f.title}</h3>
                      <p className="text-[13px] text-slate-500 leading-snug">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual Composition */}
            <div className="flex-1 flex justify-center items-center opacity-0 animate-fade-up min-w-[380px] xl:min-w-[420px]" style={{ animationDelay: '350ms' }}>
              
              <div className="relative w-full max-w-[400px]">
                {/* Main Overview Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_20px_60px_-15px_rgba(27,54,93,0.1)] w-full relative z-10">
                  <h3 className="text-[11px] font-extrabold text-[#1B365D] uppercase tracking-widest mb-6 px-2">Platform Overview</h3>
                  
                  <div className="flex items-center gap-4">
                    {/* Left Graphic */}
                    <div className="flex-1 flex justify-center relative">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-orange-100 border-dashed" />
                        <div className="absolute inset-3 rounded-full border border-orange-50" />
                        
                        {/* Orbit dots */}
                        <div className="absolute top-2 right-6 w-1.5 h-1.5 rounded-full bg-[#F3A139]" />
                        <div className="absolute bottom-3 left-4 w-1.5 h-1.5 rounded-full bg-[#F3A139]" />
                        <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-[#F3A139]" />
                        
                        {/* Central Shield */}
                        <div className="relative w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#F3A139] shadow-inner">
                          <ShieldCheck className="w-7 h-7" strokeWidth={2} />
                        </div>
                      </div>
                    </div>

                    {/* Right Stats */}
                    <div className="w-[150px] flex flex-col gap-4">
                      
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                           <Users className="w-4 h-4" strokeWidth={2} />
                         </div>
                         <div>
                           <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Users</p>
                           <div className="flex items-center gap-1.5">
                             <p className="text-[14px] font-extrabold text-[#1B365D] leading-none">2,487</p>
                             <p className="text-[9px] font-bold text-emerald-500 flex items-center leading-none">↗ 12.5%</p>
                           </div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F3A139] flex items-center justify-center flex-shrink-0">
                           <Building2 className="w-4 h-4" strokeWidth={2} />
                         </div>
                         <div>
                           <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Businesses</p>
                           <div className="flex items-center gap-1.5">
                             <p className="text-[14px] font-extrabold text-[#1B365D] leading-none">1,842</p>
                             <p className="text-[9px] font-bold text-emerald-500 flex items-center leading-none">↗ 8.3%</p>
                           </div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-500 flex items-center justify-center flex-shrink-0">
                           <Star className="w-4 h-4" strokeWidth={2} />
                         </div>
                         <div>
                           <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Reviews</p>
                           <div className="flex items-center gap-1.5">
                             <p className="text-[14px] font-extrabold text-[#1B365D] leading-none">18,756</p>
                             <p className="text-[9px] font-bold text-emerald-500 flex items-center leading-none">↗ 15.7%</p>
                           </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                           <Activity className="w-4 h-4" strokeWidth={2} />
                         </div>
                         <div>
                           <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Platform Health</p>
                           <div className="flex items-center gap-1.5">
                             <p className="text-[12px] font-extrabold text-emerald-500 leading-none">Healthy</p>
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />
                           </div>
                         </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Floating Top Card */}
                <div className="absolute -top-6 -right-6 bg-white rounded-[14px] py-3 px-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-slate-100 flex items-center gap-3 z-20 animate-float-slow">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#1B365D] leading-tight">System Status</p>
                    <p className="text-[11px] text-slate-500">All systems operational</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2" />
                </div>

                {/* Floating Bottom Card */}
                <div className="absolute -bottom-8 -left-8 bg-white rounded-2xl p-4 shadow-[0_12px_30px_rgba(0,0,0,0.06)] border border-slate-100 w-[240px] z-20 animate-float-delayed">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1B365D] flex items-center justify-center text-white">
                      <Lock className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#1B365D] leading-tight">Security</p>
                      <p className="text-[11px] font-bold text-emerald-500 leading-tight">Protected</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-snug">Enterprise-grade security for complete peace of mind.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT — Auth Panel (~42%)
      ══════════════════════════════════════════════════════ */}
      <div className="relative flex w-full lg:w-[42%] flex-col items-center justify-center bg-white px-8 py-12">
        
        {/* Mobile brand */}
        <div className="relative mb-12 flex flex-col items-center gap-3 lg:hidden opacity-0 animate-fade-up">
          <div className="flex h-10 flex-shrink-0 items-center justify-center">
            <img src={Viralkarlogo} alt="ReviewHub Logo" className="h-10 w-auto" />
          </div>
          <p className="text-[22px] font-extrabold text-[#1B365D] tracking-tight">ReviewHub <span className="text-[#F3A139]">Admin</span></p>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[380px] opacity-0 animate-fade-up" style={{ animationDelay: '100ms' }}>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[32px] font-extrabold tracking-tight text-[#1B365D] mb-2">Welcome back</h2>
            <p className="text-[15px] text-slate-500">Sign in to securely manage the ReviewHub platform.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit((data) => mutate(data))} noValidate className="space-y-4">

            {/* Email */}
            <OutlineInput
              label="Email address"
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@reviewhub.com"
              error={errors.email?.message}
              leftIcon={<Mail className="h-[18px] w-[18px]" strokeWidth={2} />}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />

            {/* Password */}
            <OutlineInput
              label="Password"
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              error={errors.password?.message}
              leftIcon={<Lock className="h-[18px] w-[18px]" strokeWidth={2} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 transition-colors hover:text-[#1B365D] focus-visible:outline-none rounded-md px-1 focus-visible:ring-2 focus-visible:ring-[#F3A139]/30"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" strokeWidth={2} />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" strokeWidth={2} />
                  )}
                </button>
              }
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-1 pb-4">
              <label className="flex cursor-pointer items-center gap-2.5 select-none group/cb">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded-[4px] border border-slate-300 bg-white transition-all checked:border-blue-500 checked:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    {...register('rememberMe')}
                  />
                  <Check className="pointer-events-none absolute left-[2px] top-[2px] h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={3} />
                </div>
                <span className="text-[13px] text-[#1B365D] font-bold transition-colors">Remember me</span>
              </label>
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-[13px] font-bold text-blue-500 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 rounded-sm"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'group relative flex w-full items-center justify-center gap-2 rounded-xl px-6 h-[48px] text-[15px] font-bold text-white transition-all duration-300 overflow-hidden',
                'shadow-md hover:shadow-lg',
                'hover:-translate-y-[1px]',
                'active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3A139] focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-70',
              )}
              style={{ backgroundImage: 'linear-gradient(90deg, #F5A623 0%, #F57C00 100%)' }}
            >
              {isPending ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-[18px] w-[18px] ml-1 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-slate-400 text-[12px]">or</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          
          {/* Security Footer Notice */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3 opacity-0 animate-fade-in" style={{ animationDelay: '300ms' }}>
             <div className="mt-0.5">
               <ShieldCheck className="w-5 h-5 text-[#F3A139]" strokeWidth={2} />
             </div>
             <div>
               <p className="text-[13px] font-bold text-[#1B365D] leading-snug mb-0.5">Authorized ReviewHub staff only</p>
               <p className="text-[12px] text-slate-500 leading-snug">All administrative actions are logged and monitored.</p>
             </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-10">
            By signing in, you agree to our <Link to="#" className="text-blue-500 hover:underline">Terms of Service</Link> and <Link to="#" className="text-blue-500 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
