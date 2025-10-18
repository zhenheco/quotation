/**
 * Payments API
 * GET /api/payments - List payments
 * POST /api/payments - Record new payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getPayments, recordPayment } from '@/lib/services/payments';
import type { PaymentFormData, PaymentType, PaymentMethod } from '@/types/extended.types';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    const filters = {
      customer_id: searchParams.get('customer_id') || undefined,
      quotation_id: searchParams.get('quotation_id') || undefined,
      contract_id: searchParams.get('contract_id') || undefined,
      status: searchParams.get('status') || undefined,
      payment_type: searchParams.get('payment_type') || undefined,
    };

    const payments = await getPayments(userId, filters);

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (error: any) {
    console.error('Get payments error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get payments', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await req.json();

    // Validate required fields
    if (!body.customer_id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if (!body.quotation_id && !body.contract_id) {
      return NextResponse.json(
        { error: 'Either quotation ID or contract ID is required' },
        { status: 400 }
      );
    }

    if (!body.payment_type || !body.payment_date || !body.amount || !body.currency) {
      return NextResponse.json(
        { error: 'Payment type, date, amount, and currency are required' },
        { status: 400 }
      );
    }

    // Validate payment type
    const validTypes: PaymentType[] = ['deposit', 'installment', 'final', 'full', 'recurring'];
    if (!validTypes.includes(body.payment_type)) {
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
    const paymentDate = new Date(body.payment_date);
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid payment date format' },
        { status: 400 }
      );
    }

    // Validate payment method if provided
    if (body.payment_method) {
      const validMethods: PaymentMethod[] = ['bank_transfer', 'credit_card', 'check', 'cash', 'other'];
      if (!validMethods.includes(body.payment_method)) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
      }
    }

    const paymentData: PaymentFormData & { schedule_id?: string } = {
      customer_id: body.customer_id,
      quotation_id: body.quotation_id,
      contract_id: body.contract_id,
      payment_type: body.payment_type,
      payment_date: body.payment_date,
      amount: body.amount,
      currency: body.currency,
      payment_method: body.payment_method,
      reference_number: body.reference_number,
      notes: body.notes,
      schedule_id: body.schedule_id, // Optional: link to payment schedule
    };

    const payment = await recordPayment(userId, paymentData);

    return NextResponse.json({
      success: true,
      data: payment,
      message: '收款記錄已建立，下次應收日期已自動更新',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Record payment error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to record payment', message: error.message },
      { status: 500 }
    );
  }
}
