/**
 * Company Context Utilities
 * Helpers for managing the current company context in the application
 */

/**
 * Get the currently selected company ID from localStorage (client-side only)
 * This should be used in client components
 */
export function getSelectedCompanyId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('selectedCompanyId');
}

/**
 * Set the currently selected company ID in localStorage (client-side only)
 */
export function setSelectedCompanyId(companyId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('selectedCompanyId', companyId);
}

/**
 * Get the company ID from the request headers or query params (server-side)
 * This can be used in API routes to determine which company's data to access
 *
 * Usage in API routes:
 * ```typescript
 * const companyId = getCompanyIdFromRequest(request);
 * if (!companyId) {
 *   return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
 * }
 * ```
 */
export function getCompanyIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);

  // Try to get from query params first
  const queryCompanyId = url.searchParams.get('company_id');
  if (queryCompanyId) {
    return queryCompanyId;
  }

  // Try to get from custom header
  const headerCompanyId = request.headers.get('X-Company-Id');
  if (headerCompanyId) {
    return headerCompanyId;
  }

  return null;
}

/**
 * Add company ID to fetch requests (client-side)
 * This ensures the selected company context is sent to the API
 *
 * Usage:
 * ```typescript
 * const response = await fetch(withCompanyId('/api/customers'), {
 *   method: 'GET',
 *   headers: withCompanyHeaders()
 * });
 * ```
 */
export function withCompanyId(url: string): string {
  const companyId = getSelectedCompanyId();
  if (!companyId) {
    return url;
  }

  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.set('company_id', companyId);
  return urlObj.toString();
}

/**
 * Get headers with company ID for fetch requests
 */
export function withCompanyHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const companyId = getSelectedCompanyId();
  const headers: Record<string, string> = {
    ...(additionalHeaders as Record<string, string> || {})
  };

  if (companyId) {
    headers['X-Company-Id'] = companyId;
  }

  return headers;
}
