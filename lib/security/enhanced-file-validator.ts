/**
 * 增強的檔案上傳安全驗證
 *
 * 防止惡意檔案上傳，包含魔術字節檢查
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * 檔案類型的魔術字節簽名
 */
const FILE_SIGNATURES = {
  // 圖片檔案
  "image/jpeg": [
    [0xff, 0xd8, 0xff], // JPEG
  ],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  ],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46], // RIFF (需要進一步檢查 WEBP)
  ],
  // 文檔檔案
  "application/pdf": [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
  // ZIP-based 檔案 (Word, Excel 等)
  "application/zip": [
    [0x50, 0x4b, 0x03, 0x04], // PK (ZIP)
    [0x50, 0x4b, 0x05, 0x06], // PK (empty ZIP)
    [0x50, 0x4b, 0x07, 0x08], // PK (spanned ZIP)
  ],
  // 舊版 Office
  "application/msword": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // MS Office
  ],
} as const;

/**
 * 危險的檔案簽名 (應該被拒絕)
 */
const DANGEROUS_SIGNATURES = [
  // 可執行檔案
  [0x4d, 0x5a], // PE/EXE/DLL (MZ)
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0xfe, 0xed, 0xfa, 0xce], // Mach-O (32-bit)
  [0xfe, 0xed, 0xfa, 0xcf], // Mach-O (64-bit)
  [0xca, 0xfe, 0xba, 0xbe], // Java class
  // 腳本檔案
  [0x23, 0x21], // Shebang (#!)
  // 壓縮檔案可能包含惡意內容
  [0x1f, 0x8b], // GZIP
  [0x42, 0x5a, 0x68], // BZIP2
] as const;

export interface EnhancedFileValidationResult {
  isValid: boolean;
  error?: string;
  detectedMimeType?: string;
}

/**
 * 檢查檔案的魔術字節
 */
async function checkMagicBytes(
  file: File,
): Promise<{ isValid: boolean; detectedMimeType?: string; error?: string }> {
  try {
    // 讀取檔案的前 16 個字節
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 檢查是否為危險檔案類型
    for (const dangerousSignature of DANGEROUS_SIGNATURES) {
      if (bytes.length >= dangerousSignature.length) {
        const match = dangerousSignature.every(
          (byte, index) => bytes[index] === byte,
        );
        if (match) {
          return {
            isValid: false,
            error: "Dangerous file type detected",
          };
        }
      }
    }

    // 檢查檔案類型簽名
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (bytes.length >= signature.length) {
          const match = signature.every((byte, index) => bytes[index] === byte);
          if (match) {
            // WebP 需要額外驗證
            if (mimeType === "image/webp") {
              if (bytes.length >= 12) {
                const webpCheck = Array.from(bytes.slice(8, 12));
                if (
                  webpCheck.every(
                    (byte, index) => byte === [0x57, 0x45, 0x42, 0x50][index],
                  )
                ) {
                  return { isValid: true, detectedMimeType: mimeType };
                }
              }
              continue;
            }
            return { isValid: true, detectedMimeType: mimeType };
          }
        }
      }
    }

    // Office 文檔特殊處理 (ZIP-based)
    const zipCheck = FILE_SIGNATURES["application/zip"][0];
    if (
      bytes.length >= zipCheck.length &&
      zipCheck.every((byte, index) => bytes[index] === byte)
    ) {
      // 可能是 Office 文檔，根據副檔名判斷
      const extension = file.name.toLowerCase().split(".").pop();
      switch (extension) {
        case "docx":
          return {
            isValid: true,
            detectedMimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          };
        case "xlsx":
          return {
            isValid: true,
            detectedMimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          };
        case "pptx":
          return {
            isValid: true,
            detectedMimeType:
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          };
        default:
          return { isValid: false, error: "Unknown ZIP-based file type" };
      }
    }

    return { isValid: false, error: "Unknown or unsupported file type" };
  } catch {
    return { isValid: false, error: "Failed to read file signature" };
  }
}

/**
 * 驗證檔案名稱
 */
function validateFileName(fileName: string): {
  isValid: boolean;
  error?: string;
} {
  // 移除路徑
  const cleanName = fileName.replace(/^.*[\\\/]/, "");

  // 檢查是否為空
  if (!cleanName || cleanName.trim().length === 0) {
    return { isValid: false, error: "Invalid file name" };
  }

  // 檢查危險字元
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(cleanName)) {
    return { isValid: false, error: "File name contains dangerous characters" };
  }

  // 檢查隱藏檔案或系統檔案
  if (cleanName.startsWith(".") || cleanName.toLowerCase().startsWith("~$")) {
    return { isValid: false, error: "Hidden or system files are not allowed" };
  }

  // 檢查雙副檔名 (如 .txt.exe)
  const parts = cleanName.split(".");
  if (parts.length > 2) {
    const extensions = parts.slice(1).map((ext) => ext.toLowerCase());
    const dangerousExts = [
      "exe",
      "bat",
      "cmd",
      "scr",
      "com",
      "pif",
      "vbs",
      "js",
      "jar",
    ];
    const hasDangerous = extensions.some((ext) => dangerousExts.includes(ext));
    if (hasDangerous) {
      return {
        isValid: false,
        error: "File with dangerous extension detected",
      };
    }
  }

  return { isValid: true };
}

/**
 * 完整的檔案驗證 (包含魔術字節檢查)
 */
export async function validateFileWithMagicBytes(
  file: File,
  allowedTypes: string[],
  maxSize: number = MAX_FILE_SIZE,
): Promise<EnhancedFileValidationResult> {
  // 基本檢查
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  // 檔案名稱檢查
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  // 檔案大小檢查
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  // 空檔案檢查
  if (file.size === 0) {
    return { isValid: false, error: "Empty file is not allowed" };
  }

  // MIME 類型檢查
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type '${file.type}' is not allowed` };
  }

  // 魔術字節檢查
  const magicBytesResult = await checkMagicBytes(file);
  if (!magicBytesResult.isValid) {
    return magicBytesResult;
  }

  // 檢查檢測到的 MIME 類型是否與聲明的一致
  if (
    magicBytesResult.detectedMimeType &&
    magicBytesResult.detectedMimeType !== file.type
  ) {
    // 允許的別名映射
    const aliases: Record<string, string[]> = {
      "image/jpeg": ["image/jpg"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ["application/msword"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        "application/vnd.ms-excel",
      ],
    };

    const detectedAliases = aliases[magicBytesResult.detectedMimeType] || [];
    const declaredAliases = Object.entries(aliases).find(([, values]) =>
      values.includes(file.type),
    )?.[0];

    if (
      magicBytesResult.detectedMimeType !== file.type &&
      !detectedAliases.includes(file.type) &&
      declaredAliases !== magicBytesResult.detectedMimeType
    ) {
      return {
        isValid: false,
        error: `File content does not match declared type. Expected: ${file.type}, Detected: ${magicBytesResult.detectedMimeType}`,
      };
    }
  }

  return {
    isValid: true,
    detectedMimeType: magicBytesResult.detectedMimeType,
  };
}

/**
 * 驗證圖片檔案 (使用魔術字節)
 */
export async function validateImageFileWithMagicBytes(
  file: File,
): Promise<EnhancedFileValidationResult> {
  return await validateFileWithMagicBytes(
    file,
    ALLOWED_IMAGE_TYPES,
    MAX_FILE_SIZE,
  );
}

/**
 * 驗證文檔檔案 (使用魔術字節)
 */
export async function validateDocumentFileWithMagicBytes(
  file: File,
): Promise<EnhancedFileValidationResult> {
  return await validateFileWithMagicBytes(
    file,
    ALLOWED_DOCUMENT_TYPES,
    MAX_FILE_SIZE,
  );
}

/**
 * 針對 ArrayBuffer 的魔術字節檢查 (用於 API 端點)
 */
export async function validateArrayBufferWithMagicBytes(
  buffer: ArrayBuffer,
  fileName: string,
  declaredMimeType: string,
  allowedTypes: string[],
): Promise<EnhancedFileValidationResult> {
  // 檔案名稱檢查
  const nameValidation = validateFileName(fileName);
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  // MIME 類型檢查
  if (!allowedTypes.includes(declaredMimeType)) {
    return {
      isValid: false,
      error: `File type '${declaredMimeType}' is not allowed`,
    };
  }

  // 檢查檔案大小
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit`,
    };
  }

  if (buffer.byteLength === 0) {
    return { isValid: false, error: "Empty file is not allowed" };
  }

  try {
    // 讀取前 16 個字節
    const bytes = new Uint8Array(buffer.slice(0, 16));

    // 檢查是否為危險檔案類型
    for (const dangerousSignature of DANGEROUS_SIGNATURES) {
      if (bytes.length >= dangerousSignature.length) {
        const match = dangerousSignature.every(
          (byte, index) => bytes[index] === byte,
        );
        if (match) {
          return {
            isValid: false,
            error: "Dangerous file type detected",
          };
        }
      }
    }

    // 檢查檔案類型簽名
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (bytes.length >= signature.length) {
          const match = signature.every((byte, index) => bytes[index] === byte);
          if (match) {
            // WebP 需要額外驗證
            if (mimeType === "image/webp") {
              if (bytes.length >= 12) {
                const webpCheck = Array.from(bytes.slice(8, 12));
                if (
                  webpCheck.every(
                    (byte, index) => byte === [0x57, 0x45, 0x42, 0x50][index],
                  )
                ) {
                  // 檢查與聲明類型是否一致
                  if (declaredMimeType !== mimeType) {
                    return {
                      isValid: false,
                      error: `File content does not match declared type`,
                    };
                  }
                  return { isValid: true, detectedMimeType: mimeType };
                }
              }
              continue;
            }

            // 檢查與聲明類型是否一致
            if (declaredMimeType !== mimeType) {
              // 檢查別名
              const aliases: Record<string, string[]> = {
                "image/jpeg": ["image/jpg"],
              };
              const acceptableTypes = [mimeType, ...(aliases[mimeType] || [])];
              if (!acceptableTypes.includes(declaredMimeType)) {
                return {
                  isValid: false,
                  error: `File content does not match declared type`,
                };
              }
            }

            return { isValid: true, detectedMimeType: mimeType };
          }
        }
      }
    }

    return { isValid: false, error: "Unknown or unsupported file type" };
  } catch {
    return { isValid: false, error: "Failed to read file signature" };
  }
}
