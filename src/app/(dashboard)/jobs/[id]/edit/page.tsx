'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Briefcase, Calendar, Users as UsersIcon, FileText, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Customer { id: string; name: string }
interface Employee { id: string; name: string }

type JobStatus   = 'unscheduled' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
type JobPriority = 'low' | 'normal' | 'high' | 'urgent'

interface FormState {
  title: string
  customer_id: string
  description: string
  status: JobStatus
  priority: JobPriority
  scheduled_date: string
  scheduled_time: string
  end_time: string
  duration_hours: string  // string for input control
  price: string           // string for input control
  notes: string
  internal_notes: string
  assigned_to: string[]
}

const EMPTY: FormState = {
  title: '', customer_id: '', description: '',
  status: 'unscheduled', priority: 'normal',
  scheduled_date: '', scheduled_time: '', end_time: '',
  duration_hours: '', price: '',
  notes: '', internal_notes: '',
  assigned_to: [],
}

export default function EditJobPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [form, setForm] = useState<FormState>(EMPTY)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [jobRes, custRes, empRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', id).single(),
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('employees').select('id, name').eq('is_active', true).order('name'),
      ])

      if (cancelled) return

      if (jobRes.error) {
        setError(jobRes.error.message)
        setLoading(false)
        return
      }

      const j = jobRes.data
      setForm({
        title:          j.title          ?? '',
        customer_id:    j.customer_id    ?? '',
        description:    j.description    ?? '',
        status:         (j.status as JobStatus)     ?? 'unscheduled',
        priority:       (j.priority as JobPriority) ?? 'normal',
        scheduled_date: j.scheduled_date ?? '',
        scheduled_time: j.scheduled_time ? String(j.scheduled_time).slice(0, 5) : '',
        end_time:       j.end_time       ? String(j.end_time).slice(0, 5)       : '',
        duration_hours: j.duration_hours != null ? String(j.duration_hours) : '',
        price:          j.price          != null ? String(j.price)          : '',
        notes:          j.notes          ?? '',
        internal_notes: j.internal_notes ?? '',
        assigned_to:    Array.isArray(j.assigned_to) ? j.assigned_to : [],
      })
      setCustomers(custRes.data ?? [])
      setEmployees(empRes.data ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleAssignee(empId: string) {
    setForm((f) => ({
      ...f,
      assigned_to: f.assigned_to.includes(empId)
        ? f.assigned_to.filter((x) => x !== empId)
        : [...f.assigned_to, empId],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!form.title.trim()) {
      setError('Title is required')
      setSaving(false)
      return
    }
    if (!form.customer_id) {
      setError('Customer is required')
      setSaving(false)
      return
    }

    const { error: upErr } = await supabase
      .from('jobs')
      .update({
        title:          form.title.trim(),
        customer_id:    form.customer_id,
        description:    form.description.trim() || null,
        status:         form.status,
        priority:       form.priority,
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
        end_time:       form.end_time || null,
        duration_hours: form.duration_hours !== '' ? Number(form.duration_hours) : null,
        price:          form.price !== '' ? Number(form.price) : null,
        notes:          form.notes.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        assigned_to:    form.assigned_to.length > 0 ? form.assigned_to : null,
      })
      .eq('id', id)

    setSaving(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    router.push(`/jobs/${id}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex items-center justify-center text-stone-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading job...
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/jobs/${id}`} className="p-2 hover:bg-stone-100 rounded-lg" title="Back to job">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Edit Job</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basics */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <Briefcase size={16} /> Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input type="text" required value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Customer <span className="text-red-500">*</span></label>
              <select required value={form.customer_id}
                onChange={(e) => update('customer_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white">
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
              <textarea value={form.description} rows={3}
                onChange={(e) => update('description', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <select value={form.status}
                onChange={(e) => update('status', e.target.value as JobStatus)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white">
                <option value="unscheduled">Unscheduled</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Priority</label>
              <select value={form.priority}
                onChange={(e) => update('priority', e.target.value as JobPriority)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <Calendar size={16} /> Schedule
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
              <input type="date" value={form.scheduled_date}
                onChange={(e) => update('scheduled_date', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Start</label>
              <input type="time" value={form.scheduled_time}
                onChange={(e) => update('scheduled_time', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">End</label>
              <input type="time" value={form.end_time}
                onChange={(e) => update('end_time', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Duration (hours)</label>
              <input type="number" step="0.25" min="0" value={form.duration_hours}
                onChange={(e) => update('duration_hours', e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>
        </section>

        {/* Assignment */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <UsersIcon size={16} /> Assigned To
          </h2>
          {employees.length === 0 ? (
            <p className="text-sm text-stone-500">No active employees to assign.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {employees.map((emp) => {
                const selected = form.assigned_to.includes(emp.id)
                return (
                  <button type="button" key={emp.id}
                    onClick={() => toggleAssignee(emp.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selected
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}>
                    {emp.name}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Pricing */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <DollarSign size={16} /> Pricing
          </h2>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
              <input type="number" step="0.01" min="0" value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 uppercase tracking-wide">
            <FileText size={16} /> Notes
          </h2>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Customer-facing notes</label>
            <textarea value={form.notes} rows={3}
              onChange={(e) => update('notes', e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Internal notes</label>
            <textarea value={form.internal_notes} rows={3}
              onChange={(e) => update('internal_notes', e.target.value)}
              placeholder="Only visible to your team"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/jobs/${id}`}
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
