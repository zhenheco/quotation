/**
 * Payments API
 * GET /api/payments - List payments
 * POST /api/payments - Record new payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getPaymentsWithRelations, recordPayment } from '@/lib/dal/payments'
import type { PaymentType, PaymentMethod } from '@/types/extended.types';

// Note: Edge runtime removed for OpenNext compatibility

export async function GET(req: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(req)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env)
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'payments:read')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view payments' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const filters = {
      customer_id: searchParams.get('customer_id') || undefined,
      quotation_id: searchParams.get('quotation_id') || undefined,
      contract_id: searchParams.get('contract_id') || undefined,
      status: searchParams.get('status') || undefined,
      payment_type: searchParams.get('payment_type') || undefined,
    };

    const payments = await getPaymentsWithRelations(db, user.id, filters);

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (error: unknown) {
    console.error('Get payments error:', error);

    return NextResponse.json(
      { error: 'Failed to get payments', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(req)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env)
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'payments:write')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to record payments' },
        { status: 403 }
      );
    }

    const body = await req.json() as Record<string, unknown>;

    // Validate required fields
    if (!body.customer_id || typeof body.customer_id !== 'string') {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if ((!body.quotation_id || typeof body.quotation_id !== 'string') && (!body.contract_id || typeof body.contract_id !== 'string')) {
      return NextResponse.json(
        { error: 'Either quotation ID or contract ID is required' },
        { status: 400 }
      );
    }

    if (!body.payment_type || typeof body.payment_type !== 'string' || !body.payment_date || typeof body.payment_date !== 'string' || typeof body.amount !== 'number' || !body.currency || typeof body.currency !== 'string') {
      return NextResponse.json(
        { error: 'Payment type, date, amount, and currency are required' },
        { status: 400 }
      );
    }

    // Validate payment type
    const validTypes: PaymentType[] = ['deposit', 'installment', 'final', 'full', 'recurring'];
    if (!validTypes.includes(body.payment_type as PaymentType)) {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate date
    const paymentDate = new Date(body.payment_date as string);
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid payment date format' },
        { status: 400 }
      );
    }

    // Validate payment method if provided
    if (body.payment_method && typeof body.payment_method === 'string') {
      const validMethods: PaymentMethod[] = ['bank_transfer', 'credit_card', 'check', 'cash', 'other'];
      if (!validMethods.includes(body.payment_method as PaymentMethod)) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
      }
    }

    const paymentData = {
      customer_id: body.customer_id as string,
      quotation_id: typeof body.quotation_id === 'string' ? body.quotation_id : undefined,
      contract_id: typeof body.contract_id === 'string' ? body.contract_id : undefined,
      payment_type: body.payment_type as PaymentType,
      payment_date: body.payment_date as string,
      amount: body.amount as number,
      currency: body.currency as string,
      payment_method: typeof body.payment_method === 'string' ? body.payment_method as PaymentMethod : undefined,
      reference_number: typeof body.reference_number === 'string' ? body.reference_number : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      schedule_id: typeof body.schedule_id === 'string' ? body.schedule_id : undefined,
    };

    const payment = await recordPayment(db, user.id, paymentData);

    return NextResponse.json({
      success: true,
      data: payment,
      message: '收款記錄已建立，下次應收日期已自動更新',
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Record payment error:', error);

    if (getErrorMessage(error).includes('permissions')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 403 }
      );
    }

    if (getErrorMessage(error).includes('not found')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to record payment', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
