/**
 * Convert Quotation to Contract API
 * POST /api/contracts/from-quotation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { convertQuotationToContract } from '@/lib/services/contracts';
import type { PaymentTerms } from '@/types/extended.types';

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
    if (!body.quotation_id) {
      return NextResponse.json(
        { error: 'Quotation ID is required' },
        { status: 400 }
      );
    }

    if (!body.signed_date || !body.expiry_date || !body.payment_frequency) {
      return NextResponse.json(
        { error: 'Signed date, expiry date, and payment frequency are required' },
        { status: 400 }
      );
    }

    // Validate payment frequency
    const validFrequencies: PaymentTerms[] = ['monthly', 'quarterly', 'semi_annual', 'annual'];
    if (!validFrequencies.includes(body.payment_frequency)) {
      return NextResponse.json(
        { error: 'Invalid payment frequency. Must be monthly, quarterly, semi_annual, or annual' },
        { status: 400 }
      );
    }

    // Validate dates
    const signedDate = new Date(body.signed_date);
    const expiryDate = new Date(body.expiry_date);

    if (isNaN(signedDate.getTime()) || isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (expiryDate <= signedDate) {
      return NextResponse.json(
        { error: 'Expiry date must be after signed date' },
        { status: 400 }
      );
    }

    // Convert quotation to contract
    const result = await convertQuotationToContract(
      userId,
      body.quotation_id,
      {
        signed_date: body.signed_date,
        expiry_date: body.expiry_date,
        payment_frequency: body.payment_frequency,
        payment_day: body.payment_day || 5,
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: '報價單已成功轉換為合約',
    });
  } catch (error: any) {
    console.error('Convert quotation to contract error:', error);

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
      { error: 'Failed to convert quotation to contract', message: error.message },
      { status: 500 }
    );
  }
}
