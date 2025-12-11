/**
 * 報價單附件照片資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import {
  QuotationImage,
  CreateQuotationImageData,
  UpdateQuotationImageData
} from '@/types/models'

/**
 * 取得報價單的所有附件照片
 */
export async function getQuotationImages(
  db: SupabaseClient,
  quotationId: string
): Promise<QuotationImage[]> {
  const { data, error } = await db
    .from('quotation_images')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to get quotation images: ${error.message}`)
  }

  return data || []
}

/**
 * 建立報價單附件照片
 */
export async function createQuotationImage(
  db: SupabaseClient,
  data: CreateQuotationImageData
): Promise<QuotationImage> {
  const { data: image, error } = await db
    .from('quotation_images')
    .insert({
      id: crypto.randomUUID(),
      quotation_id: data.quotation_id,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size || null,
      mime_type: data.mime_type || null,
      sort_order: data.sort_order || 0,
      caption: data.caption || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create quotation image: ${error.message}`)
  }

  return image
}

/**
 * 批量建立報價單附件照片
 */
export async function createQuotationImages(
  db: SupabaseClient,
  images: CreateQuotationImageData[]
): Promise<QuotationImage[]> {
  if (images.length === 0) {
    return []
  }

  const now = new Date().toISOString()
  const records = images.map((data, index) => ({
    id: crypto.randomUUID(),
    quotation_id: data.quotation_id,
    file_url: data.file_url,
    file_name: data.file_name,
    file_size: data.file_size || null,
    mime_type: data.mime_type || null,
    sort_order: data.sort_order ?? index,
    caption: data.caption || null,
    created_at: now
  }))

  const { data, error } = await db
    .from('quotation_images')
    .insert(records)
    .select()

  if (error) {
    throw new Error(`Failed to create quotation images: ${error.message}`)
  }

  return data || []
}

/**
 * 更新報價單附件照片
 */
export async function updateQuotationImage(
  db: SupabaseClient,
  imageId: string,
  data: UpdateQuotationImageData
): Promise<QuotationImage> {
  const { data: image, error } = await db
    .from('quotation_images')
    .update(data)
    .eq('id', imageId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update quotation image: ${error.message}`)
  }

  return image
}

/**
 * 刪除報價單附件照片
 */
export async function deleteQuotationImage(
  db: SupabaseClient,
  imageId: string
): Promise<void> {
  const { error } = await db
    .from('quotation_images')
    .delete()
    .eq('id', imageId)

  if (error) {
    throw new Error(`Failed to delete quotation image: ${error.message}`)
  }
}

/**
 * 刪除報價單的所有附件照片
 */
export async function deleteAllQuotationImages(
  db: SupabaseClient,
  quotationId: string
): Promise<void> {
  const { error } = await db
    .from('quotation_images')
    .delete()
    .eq('quotation_id', quotationId)

  if (error) {
    throw new Error(`Failed to delete quotation images: ${error.message}`)
  }
}

/**
 * 更新報價單附件照片的排序
 */
export async function reorderQuotationImages(
  db: SupabaseClient,
  quotationId: string,
  imageIds: string[]
): Promise<void> {
  // 批量更新排序
  const updates = imageIds.map((id, index) =>
    db
      .from('quotation_images')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('quotation_id', quotationId)
  )

  const results = await Promise.all(updates)

  const errors = results.filter(r => r.error)
  if (errors.length > 0) {
    throw new Error(`Failed to reorder quotation images: ${errors[0].error?.message}`)
  }
}
