export interface CompanyInvitation {
  id: string
  company_id: string
  invite_code: string
  role_id: string
  created_by: string
  expires_at: string
  max_uses: number
  used_count: number
  is_active: boolean
  created_at: string
}

export interface CompanyInvitationWithDetails extends CompanyInvitation {
  company?: {
    id: string
    name: { zh: string; en: string }
  }
  role?: {
    id: string
    name: string
    display_name: { zh: string; en: string }
  }
  creator?: {
    id: string
    full_name: string
    display_name: string
  }
}

export interface CreateInvitationRequest {
  role_id: string
  max_uses?: number
  expires_in_days?: number
}

export interface CreateInvitationResponse {
  invitation: CompanyInvitation
  invite_url: string
}

export interface ValidateInvitationResponse {
  valid: boolean
  invitation?: CompanyInvitationWithDetails
  error?: string
}

export interface AcceptInvitationRequest {
  code: string
}

export interface AcceptInvitationResponse {
  success: boolean
  company_id?: string
  error?: string
}
