/**
 * Convert Quotation to Contract API
 * POST /api/contracts/from-quotation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { convertQuotationToContract } from '@/lib/dal/contracts'

export const runtime = 'edge'

type PaymentTerms = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

interface ConvertQuotationRequest {
  quotation_id: string;
  signed_date: string;
  expiry_date: string;
  payment_frequency: PaymentTerms;
  payment_day?: number;
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

    const hasPermission = await checkPermission(kv, db, user.id, 'contracts:write')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create contracts' },
        { status: 403 }
      );
    }

    const body = await req.json() as ConvertQuotationRequest;

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

    const result = await convertQuotationToContract(
      db,
      user.id,
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
  } catch (error: unknown) {
    console.error('Convert quotation to contract error:', error);

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
      { error: 'Failed to convert quotation to contract', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
