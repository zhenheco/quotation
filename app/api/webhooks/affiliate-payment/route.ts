/**
 * Affiliate Payment Webhook Handler
 *
 * 處理來自 affiliate 系統金流服務的付款通知
 * POST /api/webhooks/affiliate-payment
 */

import { NextRequest, NextResponse } from "next/server";
import {
  parsePaymentWebhook,
  handlePaymentFailed,
  PaymentGatewayError,
} from "@/lib/services/affiliate-payment";
import { createCommission } from "@/lib/services/affiliate-tracking";
import { upgradePlan, downgradePlan } from "@/lib/services/subscription";
import { getSupabaseClient } from "@/lib/db/supabase-client";
import {
  handleApiError,
  UnauthorizedError,
  BadRequestError,
  InternalServerError,
} from "@/lib/errors/api-error";
import type { SubscriptionTier, BillingCycle } from "@/lib/dal/subscriptions";

/**
 * POST /api/webhooks/affiliate-payment
 *
 * 接收並處理付款 Webhook 事件
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("X-Webhook-Signature");

    let event;
    try {
      event = await parsePaymentWebhook(rawBody, signature);
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        console.error(
          "[Webhook] Signature verification failed:",
          error.message,
        );
        throw new UnauthorizedError(error.message);
      }
      throw error;
    }

    console.log("[Webhook] Received payment event:", {
      paymentId: event.paymentId,
      orderId: event.orderId,
      status: event.status,
      amount: event.amount,
    });

    switch (event.status) {
      case "SUCCESS":
        return await handleSuccessEvent(event);

      case "FAILED":
        await handlePaymentFailed(event);
        return NextResponse.json({ success: true, message: "Failure logged" });

      case "CANCELLED":
        console.log("[Webhook] Payment cancelled:", event.orderId);
        return NextResponse.json({
          success: true,
          message: "Cancellation noted",
        });

      case "REFUNDED":
        return await handleRefundEvent(event);

      default:
        console.warn("[Webhook] Unknown payment status:", event.status);
        return NextResponse.json({ success: true, message: "Status noted" });
    }
  } catch (error) {
    return handleApiError(error, request.url);
  }
}

/**
 * 處理付款成功事件
 */
async function handleSuccessEvent(event: {
  paymentId: string;
  orderId: string;
  status: string;
  amount?: number;
  paidAt?: string;
  metadata?: Record<string, string>;
}) {
  const { orderId, paymentId, metadata, amount, paidAt } = event;

  if (!metadata?.company_id || !metadata?.tier) {
    console.error("[Webhook] Missing required metadata:", metadata);
    throw new BadRequestError("Missing required metadata");
  }

  const {
    company_id: companyId,
    tier,
    billing_cycle: billingCycle,
    type,
  } = metadata;

  console.log("[Webhook] Processing successful payment:", {
    orderId,
    paymentId,
    companyId,
    tier,
    billingCycle,
    type,
    amount,
    paidAt,
  });

  const db = getSupabaseClient();

  try {
    // 1. 升級訂閱
    const upgradeResult = await upgradePlan(
      companyId,
      tier as SubscriptionTier,
      {
        billingCycle: billingCycle as BillingCycle,
        changedBy: "system:affiliate-payment",
        externalSubscriptionId: paymentId,
      },
      db,
    );

    if (!upgradeResult.success) {
      console.error(
        "[Webhook] Subscription upgrade failed:",
        upgradeResult.error,
      );
      await logPaymentError(db, {
        paymentId,
        orderId,
        companyId,
        tier,
        error: upgradeResult.error || "Unknown upgrade error",
      });
    } else {
      console.log("[Webhook] Subscription upgraded:", {
        companyId,
        tier,
        subscriptionId: upgradeResult.subscription?.id,
      });
    }

    // 2. 如果有推薦關係，建立佣金
    if (amount && amount > 0) {
      const { data: company } = await db
        .from("companies")
        .select("owner_user_id")
        .eq("id", companyId)
        .single();

      if (company?.owner_user_id) {
        const commissionResult = await createCommission({
          externalOrderId: orderId,
          orderAmount: amount,
          orderType: (type || "subscription") as
            | "subscription"
            | "addon"
            | "renewal"
            | "upgrade"
            | "one_time",
          referredUserId: company.owner_user_id,
        });

        if (commissionResult?.success && commissionResult.commissionId) {
          console.log("[Webhook] Commission created:", {
            commissionId: commissionResult.commissionId,
            amount: commissionResult.commissionAmount,
          });
        } else if (!commissionResult) {
          console.warn(
            "[Webhook] Commission creation skipped: No referral relationship or API error",
          );
        }
      }
    }

    // 3. 記錄付款成功
    await logPaymentSuccess(db, {
      paymentId,
      orderId,
      companyId,
      tier,
      amount,
      paidAt,
    });

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
    });
  } catch (error) {
    console.error("[Webhook] Error in handleSuccessEvent:", error);
    throw new InternalServerError("Internal processing error");
  }
}

/**
 * 處理退款事件
 *
 * 退款時立即將訂閱降級為免費方案
 */
async function handleRefundEvent(event: {
  paymentId: string;
  orderId: string;
  status: string;
  amount?: number;
  metadata?: Record<string, string>;
}) {
  const { orderId, paymentId, metadata, amount } = event;
  const companyId = metadata?.company_id;

  if (!companyId) {
    console.warn(
      "[Webhook] Refund event missing company_id in metadata:",
      metadata,
    );
    return NextResponse.json({
      success: true,
      warning:
        "Refund received but no company_id in metadata, skipping downgrade",
    });
  }

  console.log("[Webhook] Processing refund:", {
    orderId,
    paymentId,
    companyId,
    amount,
  });

  const downgradeResult = await downgradePlan(companyId, "FREE", {
    effectiveAt: "immediately",
    changedBy: "system:refund",
    reason: "Payment refunded",
  });

  if (!downgradeResult.success) {
    console.error("[Webhook] Refund downgrade failed:", {
      companyId,
      error: downgradeResult.error,
    });
    throw new InternalServerError("Failed to process refund downgrade");
  }

  console.log("[Webhook] Refund processed - subscription downgraded to FREE:", {
    companyId,
    orderId,
    paymentId,
    subscriptionId: downgradeResult.subscription?.id,
  });

  return NextResponse.json({
    success: true,
    message: "Refund processed, subscription downgraded to FREE",
  });
}

/**
 * 記錄付款成功
 */
async function logPaymentSuccess(
  db: ReturnType<typeof getSupabaseClient>,
  data: {
    paymentId: string;
    orderId: string;
    companyId: string;
    tier: string;
    amount?: number;
    paidAt?: string;
  },
) {
  try {
    console.log("[Webhook] Payment success logged:", data);
  } catch (error) {
    console.error("[Webhook] Failed to log payment success:", error);
  }
}

/**
 * 記錄付款錯誤
 */
async function logPaymentError(
  db: ReturnType<typeof getSupabaseClient>,
  data: {
    paymentId: string;
    orderId: string;
    companyId: string;
    tier: string;
    error: string;
  },
) {
  try {
    console.error("[Webhook] Payment error logged:", data);
  } catch (error) {
    console.error("[Webhook] Failed to log payment error:", error);
  }
}
