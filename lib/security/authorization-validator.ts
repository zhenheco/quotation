/**
 * 授權驗證模組
 *
 * 驗證用戶是否有權訪問特定資源（company_id, owner_id 檢查）
 */

import { SupabaseClient } from "@/lib/db/supabase-client";

/**
 * 授權檢查結果
 */
export interface AuthorizationResult {
  isAuthorized: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * 檢查用戶是否為公司成員
 */
export async function validateCompanyMembership(
  db: SupabaseClient,
  userId: string,
  companyId: string,
): Promise<AuthorizationResult> {
  try {
    // 檢查用戶是否為公司成員
    const { data: membership, error } = await db
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116") {
      return {
        isAuthorized: false,
        error: "Failed to check company membership",
      };
    }

    if (!membership) {
      return {
        isAuthorized: false,
        error: "User is not a member of this company",
      };
    }

    return {
      isAuthorized: true,
      details: { role: membership.role },
    };
  } catch {
    return {
      isAuthorized: false,
      error: "Authorization check failed",
    };
  }
}

/**
 * 檢查客戶所有權
 */
export async function validateCustomerOwnership(
  db: SupabaseClient,
  userId: string,
  customerId: string,
  companyId?: string,
): Promise<AuthorizationResult> {
  try {
    const query = db
      .from("customers")
      .select("id, user_id, company_id, owner_id")
      .eq("id", customerId);

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") {
      return {
        isAuthorized: false,
        error: "Failed to check customer ownership",
      };
    }

    if (!data) {
      return {
        isAuthorized: false,
        error: "Customer not found",
      };
    }

    // 檢查直接所有權
    if (data.user_id === userId || data.owner_id === userId) {
      return { isAuthorized: true };
    }

    // 如果客戶屬於公司，檢查公司成員資格
    if (data.company_id && companyId === data.company_id) {
      return await validateCompanyMembership(db, userId, data.company_id);
    }

    return {
      isAuthorized: false,
      error: "User does not have access to this customer",
    };
  } catch {
    return {
      isAuthorized: false,
      error: "Authorization check failed",
    };
  }
}

/**
 * 檢查產品所有權
 */
export async function validateProductOwnership(
  db: SupabaseClient,
  userId: string,
  productId: string,
  companyId?: string,
): Promise<AuthorizationResult> {
  try {
    const { data, error } = await db
      .from("products")
      .select("id, user_id, company_id")
      .eq("id", productId)
      .single();

    if (error && error.code !== "PGRST116") {
      return {
        isAuthorized: false,
        error: "Failed to check product ownership",
      };
    }

    if (!data) {
      return {
        isAuthorized: false,
        error: "Product not found",
      };
    }

    // 檢查直接所有權
    if (data.user_id === userId) {
      return { isAuthorized: true };
    }

    // 如果產品屬於公司，檢查公司成員資格
    if (data.company_id && companyId === data.company_id) {
      return await validateCompanyMembership(db, userId, data.company_id);
    }

    return {
      isAuthorized: false,
      error: "User does not have access to this product",
    };
  } catch {
    return {
      isAuthorized: false,
      error: "Authorization check failed",
    };
  }
}

/**
 * 檢查報價單所有權
 */
export async function validateQuotationOwnership(
  db: SupabaseClient,
  userId: string,
  quotationId: string,
  companyId?: string,
): Promise<AuthorizationResult> {
  try {
    const { data, error } = await db
      .from("quotations")
      .select("id, user_id, company_id, owner_id")
      .eq("id", quotationId)
      .single();

    if (error && error.code !== "PGRST116") {
      return {
        isAuthorized: false,
        error: "Failed to check quotation ownership",
      };
    }

    if (!data) {
      return {
        isAuthorized: false,
        error: "Quotation not found",
      };
    }

    // 檢查直接所有權
    if (data.user_id === userId || data.owner_id === userId) {
      return { isAuthorized: true };
    }

    // 如果報價單屬於公司，檢查公司成員資格
    if (data.company_id && companyId === data.company_id) {
      return await validateCompanyMembership(db, userId, data.company_id);
    }

    return {
      isAuthorized: false,
      error: "User does not have access to this quotation",
    };
  } catch {
    return {
      isAuthorized: false,
      error: "Authorization check failed",
    };
  }
}

/**
 * 檢查訂單所有權
 */
export async function validateOrderOwnership(
  db: SupabaseClient,
  userId: string,
  orderId: string,
  companyId?: string,
): Promise<AuthorizationResult> {
  try {
    const { data, error } = await db
      .from("orders")
      .select("id, user_id, company_id, created_by")
      .eq("id", orderId)
      .single();

    if (error && error.code !== "PGRST116") {
      return {
        isAuthorized: false,
        error: "Failed to check order ownership",
      };
    }

    if (!data) {
      return {
        isAuthorized: false,
        error: "Order not found",
      };
    }

    // 檢查直接所有權 (注意：created_by 可能是 user_profiles.id)
    if (data.user_id === userId) {
      return { isAuthorized: true };
    }

    // 如果訂單屬於公司，檢查公司成員資格
    if (data.company_id && companyId === data.company_id) {
      return await validateCompanyMembership(db, userId, data.company_id);
    }

    return {
      isAuthorized: false,
      error: "User does not have access to this order",
    };
  } catch {
    return {
      isAuthorized: false,
      error: "Authorization check failed",
    };
  }
}

/**
 * 檢查出貨單所有權
 */
export async function validateShipmentOwnership(
  db: SupabaseClient,
  userId: string,
  shipmentId: string,
  companyId?: string,
): Promise<AuthorizationResult> {
  try {
    const { data, error } = await db
      .from("shipments")
      .select("id, user_id, company_id, created_by")
      .eq("id", shipmentId)
      .single();

    if (error && error.code !== "PGRST116") {
      return {
        isAuthorized: false,
        error: "Failed to check shipment ownership",
      };
    }

    if (!data) {
      return {
        isAuthorized: false,
        error: "Shipment not found",
      };
    }

    // 檢查直接所有權
    if (data.user_id === userId) {
      return { isAuthorized: true };
    }

    // 如果出貨單屬於公司，檢查公司成員資格
    if (data.company_id && companyId === data.company_id) {
      return await validateCompanyMembership(db, userId, data.company_id);
    }

    return {
      isAuthorized: false,
      error: "User does not have access to this shipment",
    };
  } catch {
    return {
      isAuthorized: false,
      error: "Authorization check failed",
    };
  }
}

/**
 * 檢查付款記錄所有權
 */
export async function validatePaymentOwnership(
  db: SupabaseClient,
  userId: string,
  paymentId: string,
  companyId?: string,
): Promise<AuthorizationResult> {
  try {
    const { data, error } = await db
      .from("payments")
      .select("id, user_id, company_id")
      .eq("id", paymentId)
      .single();

    if (error && error.code !== "PGRST116") {
      return {
        isAuthorized: false,
        error: "Failed to check payment ownership",
      };
    }

    if (!data) {
      return {
        isAuthorized: false,
        error: "Payment not found",
      };
    }

    // 檢查直接所有權
    if (data.user_id === userId) {
      return { isAuthorized: true };
    }

    // 如果付款記錄屬於公司，檢查公司成員資格
    if (data.company_id && companyId === data.company_id) {
      return await validateCompanyMembership(db, userId, data.company_id);
    }

    return {
      isAuthorized: false,
      error: "User does not have access to this payment",
    };
  } catch {
    return {
      isAuthorized: false,
      error: "Authorization check failed",
    };
  }
}

/**
 * 檢查公司檔案所有權 (Supabase Storage)
 */
export async function validateCompanyFileOwnership(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  filePath: string,
): Promise<AuthorizationResult> {
  try {
    // 檢查檔案路徑是否以用戶 ID 開頭 (儲存策略)
    if (!filePath.startsWith(`${userId}/`)) {
      return {
        isAuthorized: false,
        error: "Invalid file path",
      };
    }

    // 檢查公司成員資格
    const membershipResult = await validateCompanyMembership(
      db,
      userId,
      companyId,
    );
    if (!membershipResult.isAuthorized) {
      return membershipResult;
    }

    return { isAuthorized: true };
  } catch {
    return {
      isAuthorized: false,
      error: "File authorization check failed",
    };
  }
}

/**
 * 檢查多個資源的所有權（批次檢查）
 */
export async function validateMultipleResourceOwnership(
  db: SupabaseClient,
  userId: string,
  resources: Array<{
    type:
      | "customer"
      | "product"
      | "quotation"
      | "order"
      | "shipment"
      | "payment";
    id: string;
    companyId?: string;
  }>,
): Promise<Record<string, AuthorizationResult>> {
  const results: Record<string, AuthorizationResult> = {};

  // 並行檢查所有資源
  const checks = resources.map(async (resource) => {
    let result: AuthorizationResult;

    switch (resource.type) {
      case "customer":
        result = await validateCustomerOwnership(
          db,
          userId,
          resource.id,
          resource.companyId,
        );
        break;
      case "product":
        result = await validateProductOwnership(
          db,
          userId,
          resource.id,
          resource.companyId,
        );
        break;
      case "quotation":
        result = await validateQuotationOwnership(
          db,
          userId,
          resource.id,
          resource.companyId,
        );
        break;
      case "order":
        result = await validateOrderOwnership(
          db,
          userId,
          resource.id,
          resource.companyId,
        );
        break;
      case "shipment":
        result = await validateShipmentOwnership(
          db,
          userId,
          resource.id,
          resource.companyId,
        );
        break;
      case "payment":
        result = await validatePaymentOwnership(
          db,
          userId,
          resource.id,
          resource.companyId,
        );
        break;
      default:
        result = {
          isAuthorized: false,
          error: "Unknown resource type",
        };
    }

    return { key: `${resource.type}:${resource.id}`, result };
  });

  const checkResults = await Promise.all(checks);

  for (const { key, result } of checkResults) {
    results[key] = result;
  }

  return results;
}

/**
 * 通用資源所有權檢查函數
 */
export async function validateResourceOwnership(
  db: SupabaseClient,
  userId: string,
  resourceType:
    | "customer"
    | "product"
    | "quotation"
    | "order"
    | "shipment"
    | "payment",
  resourceId: string,
  companyId?: string,
): Promise<AuthorizationResult> {
  switch (resourceType) {
    case "customer":
      return validateCustomerOwnership(db, userId, resourceId, companyId);
    case "product":
      return validateProductOwnership(db, userId, resourceId, companyId);
    case "quotation":
      return validateQuotationOwnership(db, userId, resourceId, companyId);
    case "order":
      return validateOrderOwnership(db, userId, resourceId, companyId);
    case "shipment":
      return validateShipmentOwnership(db, userId, resourceId, companyId);
    case "payment":
      return validatePaymentOwnership(db, userId, resourceId, companyId);
    default:
      return {
        isAuthorized: false,
        error: "Unknown resource type",
      };
  }
}
