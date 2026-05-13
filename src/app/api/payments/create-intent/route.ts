import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/lib/supabase-server'
import { rateLimit, clientKey } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

/**
 * Create a Stripe PaymentIntent for an invoice.
 *
 * SECURITY: this endpoint NEVER trusts a client-supplied amount. The amount,
 * currency, customer email, and description are derived from the invoice row
 * in the database, authenticated against RLS. A client that lies about which
 * invoice they own will get a 404, not a partial charge.
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  // 1. Authenticate. No anonymous payment creation.
  const auth = await requireAuth()
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2. Rate-limit by user id (5/minute is plenty for normal usage).
  const rl = rateLimit(clientKey(request, auth.user.id), 5, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
    )
  }

  // 3. Validate input.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const invoiceId =
    body && typeof body === 'object' && 'invoiceId' in body
      ? (body as { invoiceId: unknown }).invoiceId
      : null
  if (typeof invoiceId !== 'string' || invoiceId.length === 0 || invoiceId.length > 64) {
    return NextResponse.json({ error: 'invalid_invoice_id' }, { status: 400 })
  }

  // 4. Look up the invoice using the authenticated client (RLS enforced).
  const { data: invoice, error: invErr } = await auth.supabase
    .from('invoices')
    .select('id, total, amount_paid, status, customer_id')
    .eq('id', invoiceId)
    .single()
  if (invErr || !invoice) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const remaining = Number(invoice.total) - Number(invoice.amount_paid || 0)
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return NextResponse.json({ error: 'nothing_to_charge' }, { status: 400 })
  }
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return NextResponse.json({ error: 'invoice_not_chargeable' }, { status: 400 })
  }

  // 5. Pull customer email server-side; never trust the client.
  const { data: customer } = await auth.supabase
    .from('customers')
    .select('email, name')
    .eq('id', invoice.customer_id)
    .single()

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(remaining * 100),
      currency: 'usd',
      metadata: { invoice_id: invoice.id, created_by_user: auth.user.id },
      receipt_email: customer?.email || undefined,
      description: `Invoice payment${customer?.name ? ` from ${customer.name}` : ''}`,
    })
    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    // Never leak Stripe error details to the client.
    console.error('Stripe error:', error)
    return NextResponse.json({ error: 'stripe_error' }, { status: 502 })
  }
}
