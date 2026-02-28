import { createApiClient } from "@/lib/supabase/api";
import { getSupabaseClient } from "@/lib/db/supabase-client";
import { NextRequest } from "next/server";
import { getErrorMessage } from "@/app/api/utils/error-handler";
import { validateImageFileWithMagicBytes } from "@/lib/security/enhanced-file-validator";
import { validateString, validateUuid } from "@/lib/security/input-validator";
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorResponses,
} from "@/lib/api/response-utils";

const ALLOWED_TYPES = ["logo", "signature", "passbook"] as const;
type FileType = (typeof ALLOWED_TYPES)[number];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // 使用 API client 驗證用戶身份
    const authClient = createApiClient(request);
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return ErrorResponses.unauthorized();
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const companyId = formData.get("companyId") as string | null;
    const type = formData.get("type") as FileType | null;

    // 強化輸入驗證
    if (!file) {
      return ErrorResponses.badRequest("No file provided");
    }

    // 驗證 company ID
    const companyIdValidation = validateUuid(companyId, "companyId", {
      required: true,
    });
    if (!companyIdValidation.isValid) {
      return ErrorResponses.badRequest(companyIdValidation.errors.join(", "));
    }

    // 驗證檔案類型
    const typeValidation = validateString(type, "type", {
      required: true,
      maxLength: 20,
      customPattern: /^(logo|signature|passbook)$/,
      checkSqlInjection: true,
    });
    if (!typeValidation.isValid || !ALLOWED_TYPES.includes(type as FileType)) {
      return ErrorResponses.badRequest(
        "Invalid file type. Must be logo, signature, or passbook",
      );
    }

    // 使用增強的檔案驗證 (包含魔術字節檢查)
    const fileValidation = await validateImageFileWithMagicBytes(file);
    if (!fileValidation.isValid) {
      console.warn(
        `File validation failed for user ${user.id}:`,
        fileValidation.error,
      );
      return ErrorResponses.badRequest(fileValidation.error);
    }

    // 檢查檔案大小 (二次確認)
    if (file.size > MAX_FILE_SIZE) {
      return ErrorResponses.badRequest("File size exceeds 5MB limit");
    }

    // 安全的檔案名稱生成
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    // 清理檔案名稱以防止路徑遍歷
    const sanitizedCompanyId = companyIdValidation.sanitized?.replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    const sanitizedType = typeValidation.sanitized?.replace(
      /[^a-zA-Z0-9]/g,
      "",
    );
    const fileName = `${sanitizedCompanyId}_${sanitizedType}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // 記錄安全事件
    console.log(
      `File upload initiated: User ${user.id}, Company ${sanitizedCompanyId}, Type ${sanitizedType}, Size ${file.size}`,
    );

    const arrayBuffer = await file.arrayBuffer();

    // 使用 Service Role client 進行 Storage 操作（繞過 RLS）
    // 安全性由 API 層的認證和路徑驗證保證
    const storageClient = getSupabaseClient();
    const { error: uploadError } = await storageClient.storage
      .from("company-files")
      .upload(filePath, arrayBuffer, {
        contentType: fileValidation.detectedMimeType || file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return createErrorResponse("Failed to upload file", 500);
    }

    const apiUrl = `/api/storage/company-files?path=${encodeURIComponent(filePath)}`;

    // 記錄成功的上傳
    console.log(`File uploaded successfully: ${filePath}`);

    return createSuccessResponse({
      url: apiUrl,
      path: filePath,
      detectedMimeType: fileValidation.detectedMimeType,
    });
  } catch (error: unknown) {
    console.error("Error uploading file:", error);

    // 不暴露內部錯誤細節
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? getErrorMessage(error)
        : "Failed to upload file";

    return createErrorResponse(errorMessage, 500);
  }
}
