'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
    { met: /[0-9]/.test(formData.password), text: 'One number' },
  ]

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!passwordRequirements.every(r => r.met)) {
      setError('Password does not meet requirements')
      setLoading(false)
      return
    }

    try {
      // Create auth user. The database trigger handle_new_user() will
      // automatically create a companies row and link this user as admin.
      // The metadata passed here is used by that trigger.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
          }
        }
      })

      if (authError) throw authError

      // NOTE: company + employee rows are created by the DB trigger
      // handle_new_user() — no client-side inserts needed.
      // Any client-side insert here would be redundant and could fail
      // due to the trigger already running. See
      // supabase/migrations/0002_auto_provision_company_on_signup.sql

      if (authData.user) {
        // Optionally update settings with company name if trigger didn't.
        // This is idempotent — upsert is safe.
        await supabase.from('settings').upsert({
          company_id: authData.user.id, // will be matched by trigger
          company_name: formData.companyName,
          company_email: formData.email,
        }).select()
      }

      setSuccess(true)
      
      // Auto-login and redirect
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-teal-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-teal-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Account Created!</h1>
          <p className="text-stone-500 mb-4">
            Redirecting you to the dashboard...
          </p>
          <Loader2 className="animate-spin mx-auto text-teal-600" size={24} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-teal-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-teal-500/30">
            GP
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Create your account</h1>
          <p className="text-stone-500 mt-1">Start your 14-day free trial</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/50 p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Company Name</label>
              <input type="text" required value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Acme HVAC Services" />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Your Name</label>
              <input type="text" required value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="John Smith" />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input type="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="you@company.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-12"
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600' : 'text-stone-400'}`}>
                    <Check size={12} />
                    {req.text}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Confirm Password</label>
              <input type="password" required value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-medium hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <p className="text-xs text-stone-500 text-center">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-teal-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-teal-600 hover:underline">Privacy Policy</a>
            </p>
          </form>

          <div className="mt-6 text-center">
            <p className="text-stone-600">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
