import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'

interface TableInfo {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

interface TableListItem {
  name: string
  type: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { env } = await getCloudflareContext()
    const db = getD1Client(env)

    const tables = await db.query<TableListItem>(
      "SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name"
    )

    const paymentSchedulesInfo = await db.query<TableInfo>(
      "PRAGMA table_info(payment_schedules)"
    )

    const quotationsInfo = await db.query<TableInfo>(
      "PRAGMA table_info(quotations)"
    )

    const customersInfo = await db.query<TableInfo>(
      "PRAGMA table_info(customers)"
    )

    const migrationsInfo = await db.query<{ id: number; name: string; applied_at: string }>(
      "SELECT * FROM d1_migrations ORDER BY id"
    ).catch(() => [])

    const paymentSchedulesNewInfo = await db.query<TableInfo>(
      "PRAGMA table_info(payment_schedules_new)"
    ).catch(() => [])

    const foreignKeysOld = await db.query<{ table: string; from: string; to: string }>(
      "PRAGMA foreign_key_list(payment_schedules)"
    ).catch(() => [])

    const foreignKeysNew = await db.query<{ table: string; from: string; to: string }>(
      "PRAGMA foreign_key_list(payment_schedules_new)"
    ).catch(() => [])

    const triggers = await db.query<{ name: string; sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type='trigger'"
    ).catch(() => [])

    return NextResponse.json({
      success: true,
      database: {
        tables: tables.map(t => t.name),
        tableCount: tables.length
      },
      payment_schedules: {
        columns: paymentSchedulesInfo.map(c => ({
          name: c.name,
          type: c.type,
          nullable: c.notnull === 0,
          default: c.dflt_value,
          isPK: c.pk === 1
        })),
        hasQuotationId: paymentSchedulesInfo.some(c => c.name === 'quotation_id'),
        hasSourceType: paymentSchedulesInfo.some(c => c.name === 'source_type'),
        hasDescription: paymentSchedulesInfo.some(c => c.name === 'description')
      },
      quotations: {
        columnCount: quotationsInfo.length,
        columns: quotationsInfo.map(c => c.name)
      },
      customers: {
        columnCount: customersInfo.length,
        columns: customersInfo.map(c => c.name)
      },
      migrations: migrationsInfo,
      payment_schedules_new: {
        exists: paymentSchedulesNewInfo.length > 0,
        columns: paymentSchedulesNewInfo.map(c => c.name),
        foreignKeys: foreignKeysNew
      },
      foreignKeys: {
        payment_schedules: foreignKeysOld,
        payment_schedules_new: foreignKeysNew
      },
      triggers: triggers.map(t => ({ name: t.name, sql: t.sql?.substring(0, 200) })),
      env: {
        hasDB: !!env?.DB,
        envKeys: Object.keys(env || {})
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 })
  }
}
