import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { env } = await getCloudflareContext()
  const db = getD1Client(env)

  try {
    const tableInfo = await db.query<{ name: string }>(
      "PRAGMA table_info(payment_schedules)"
    )

    const hasSourceType = tableInfo.some(col => col.name === 'source_type')
    const hasQuotationId = tableInfo.some(col => col.name === 'quotation_id')
    const hasDescription = tableInfo.some(col => col.name === 'description')

    if (hasSourceType && hasQuotationId && hasDescription) {
      return NextResponse.json({
        message: 'Migration 011 already applied',
        columns: tableInfo.map(c => c.name)
      })
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS payment_schedules_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        contract_id TEXT,
        quotation_id TEXT,
        customer_id TEXT NOT NULL,
        schedule_number INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
        paid_amount REAL DEFAULT 0,
        paid_date TEXT,
        payment_id TEXT,
        notes TEXT,
        description TEXT,
        source_type TEXT DEFAULT 'contract' CHECK (source_type IN ('quotation', 'manual', 'contract')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    await db.execute(`
      INSERT INTO payment_schedules_new (
        id, user_id, contract_id, quotation_id, customer_id, schedule_number,
        due_date, amount, currency, status, paid_amount, paid_date, payment_id,
        notes, description, source_type, created_at, updated_at
      )
      SELECT
        id, user_id, contract_id, NULL, customer_id, schedule_number,
        due_date, amount, currency, status, paid_amount, paid_date, payment_id,
        notes, NULL, 'contract', created_at, updated_at
      FROM payment_schedules
    `)

    await db.execute('DROP TABLE payment_schedules')
    await db.execute('ALTER TABLE payment_schedules_new RENAME TO payment_schedules')
    await db.execute('CREATE INDEX IF NOT EXISTS idx_payment_schedules_quotation ON payment_schedules(quotation_id)')
    await db.execute('CREATE INDEX IF NOT EXISTS idx_payment_schedules_source ON payment_schedules(source_type)')

    const newTableInfo = await db.query<{ name: string }>(
      "PRAGMA table_info(payment_schedules)"
    )

    return NextResponse.json({
      message: 'Migration 011 applied successfully',
      columns: newTableInfo.map(c => c.name)
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: (error as Error).message
    }, { status: 500 })
  }
}
