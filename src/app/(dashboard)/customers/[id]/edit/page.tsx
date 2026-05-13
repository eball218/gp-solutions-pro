'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, User, Mail, MapPin, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FormState {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
  status: 'active' | 'inactive' | 'lead'
  tags: string
  source: string
}

const EMPTY: FormState = {
  name: '', email: '', phone: '',
  address: '', city: '', state: '', zip: '',
  notes: '', status: 'active', tags: '', source: '',
}

export default function EditCustomerPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setForm({
        name:    data.name    ?? '',
        email:   data.email   ?? '',
        phone:   data.phone   ?? '',
        address: data.address ?? '',
        city:    data.city    ?? '',
        state:   data.state   ?? '',
        zip:     data.zip     ?? '',
        notes:   data.notes   ?? '',
        status:  (data.status as FormState['status']) ?? 'active',
        tags:    Array.isArray(data.tags) ? data.tags.join(', ') : '',
        source:  data.source  ?? '',
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!form.name.trim()) {
      setError('Name is required')
      setSaving(false)
      return
    }

    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const { error: upErr } = await supabase
      .from('customers')
      .update({
        name:    form.name.trim(),
        email:   form.email.trim() || null,
        phone:   form.phone.trim() || null,
        address: form.address.trim() || null,
        city:    form.city.trim() || null,
        state:   form.state.trim() || null,
        zip:     form.zip.trim() || null,
        notes:   form.notes.trim() || null,
        status:  form.status,
        tags:    tagsArray.length > 0 ? tagsArray : null,
        source:  form.source.trim() || null,
      })
      .eq('id', id)

    setSaving(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    router.push(`/customers/${id}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex items-center justify-center text-stone-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading customer...
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/customers/${id}`} className="p-2 hover:bg-stone-100 rounded-lg" title="Back to customer">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Edit Customer</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <User size={16} /> Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <select value={form.status}
                onChange={(e) => update('status', e.target.value as FormState['status'])}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Source</label>
              <input type="text" value={form.source}
                onChange={(e) => update('source', e.target.value)}
                placeholder="Referral, Google, Facebook..."
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <Mail size={16} /> Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input type="email" value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <MapPin size={16} /> Address
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-stone-700 mb-1">Street</label>
              <input type="text" value={form.address}
                onChange={(e) => update('address', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
              <input type="text" value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-stone-700 mb-1">State</label>
              <input type="text" value={form.state}
                onChange={(e) => update('state', e.target.value)}
                maxLength={2}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">ZIP</label>
              <input type="text" value={form.zip}
                onChange={(e) => update('zip', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <FileText size={16} /> Additional
          </h2>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Tags</label>
            <input type="text" value={form.tags}
              onChange={(e) => update('tags', e.target.value)}
              placeholder="VIP, recurring, commercial"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            <p className="text-xs text-stone-500 mt-1">Comma-separated</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea value={form.notes} rows={4}
              onChange={(e) => update('notes', e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/customers/${id}`}
            className="px-5 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
