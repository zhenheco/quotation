'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePermission } from './usePermission'
import type { Database } from '@/types/database.types'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

// ============================================================================
// Types
// ============================================================================

export type Product = Database['public']['Tables']['products']['Row']
export type CreateProductData = Database['public']['Tables']['products']['Insert']
export type UpdateProductData = Database['public']['Tables']['products']['Update']

export interface BilingualText {
  zh: string
  en: string
}

export interface CreateProductInput {
  name: BilingualText
  description?: BilingualText
  base_price: number
  base_currency: string
  category?: string
  cost_price?: number
  cost_currency?: string
  profit_margin?: number
  supplier?: string
  supplier_code?: string
  sku?: string
}

export interface UpdateProductInput {
  name?: BilingualText
  description?: BilingualText
  base_price?: number
  base_currency?: string
  category?: string
  cost_price?: number
  cost_currency?: string
  profit_margin?: number
  supplier?: string
  supplier_code?: string
  sku?: string
}

export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchProducts(): Promise<Product[]> {
  return apiGet<Product[]>('/api/products')
}

async function fetchProduct(id: string): Promise<Product> {
  return apiGet<Product>(`/api/products/${id}`)
}

async function createProduct(input: CreateProductInput): Promise<Product> {
  return apiPost<Product>('/api/products', input)
}

async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  return apiPut<Product>(`/api/products/${id}`, input)
}

async function deleteProduct(id: string): Promise<void> {
  await apiDelete(`/api/products/${id}`)
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得所有產品列表（自動處理成本權限）
 *
 * @example
 * ```tsx
 * function ProductList() {
 *   const { data: products, isLoading, error, canSeeCost } = useProducts()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return (
 *     <div>
 *       {products?.map(product => (
 *         <ProductCard
 *           key={product.id}
 *           product={product}
 *           showCost={canSeeCost}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useProducts() {
  const { hasPermission: canSeeCost } = usePermission('products', 'read_cost')

  const query = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })

  return {
    ...query,
    canSeeCost,
  }
}

/**
 * 取得單一產品資料
 *
 * @param id - 產品 ID
 *
 * @example
 * ```tsx
 * function ProductDetail({ id }: { id: string }) {
 *   const { data: product, isLoading, canSeeCost } = useProduct(id)
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (!product) return <NotFound />
 *
 *   return (
 *     <div>
 *       <ProductInfo product={product} />
 *       {canSeeCost && (
 *         <div>
 *           <p>成本: {product.cost_price}</p>
 *           <p>利潤率: {product.profit_margin}%</p>
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useProduct(id: string) {
  const { hasPermission: canSeeCost } = usePermission('products', 'read_cost')

  const query = useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  return {
    ...query,
    canSeeCost,
  }
}

/**
 * 建立新產品
 *
 * @example
 * ```tsx
 * function CreateProductForm() {
 *   const createProduct = useCreateProduct()
 *   const router = useRouter()
 *
 *   const onSubmit = async (data: CreateProductInput) => {
 *     try {
 *       await createProduct.mutateAsync(data)
 *       toast.success('產品建立成功')
 *       router.push('/products')
 *     } catch (error) {
 *       toast.error('建立失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.setQueryData(['products', newProduct.id], newProduct)
    },
  })
}

/**
 * 更新產品資料
 *
 * @example
 * ```tsx
 * function EditProductForm({ product }: { product: Product }) {
 *   const updateProduct = useUpdateProduct(product.id)
 *
 *   const onSubmit = async (data: UpdateProductInput) => {
 *     try {
 *       await updateProduct.mutateAsync(data)
 *       toast.success('更新成功')
 *     } catch (error) {
 *       toast.error('更新失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(id, input),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.setQueryData(['products', id], updatedProduct)
    },
  })
}

/**
 * 刪除產品（含樂觀更新）
 *
 * @example
 * ```tsx
 * function ProductCard({ product }: { product: Product }) {
 *   const deleteProduct = useDeleteProduct()
 *
 *   const handleDelete = async () => {
 *     if (!confirm('確定要刪除此產品？')) return
 *
 *     try {
 *       await deleteProduct.mutateAsync(product.id)
 *       toast.success('刪除成功')
 *     } catch (error) {
 *       toast.error('刪除失敗：可能有報價單正在使用此產品')
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <Button onClick={handleDelete}>刪除</Button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,

    // 樂觀更新
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['products'] })
      const previousProducts = queryClient.getQueryData<Product[]>(['products'])

      queryClient.setQueryData<Product[]>(['products'], (old) =>
        old?.filter((p) => p.id !== id) ?? []
      )

      return { previousProducts }
    },

    onError: (err, id, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * 過濾產品（前端過濾）
 *
 * @param filters - 過濾條件
 *
 * @example
 * ```tsx
 * function ProductFilter() {
 *   const [filters, setFilters] = useState<ProductFilters>({})
 *   const { data: products } = useFilteredProducts(filters)
 *
 *   return (
 *     <div>
 *       <Select
 *         value={filters.category}
 *         onChange={(e) => setFilters({ ...filters, category: e.target.value })}
 *       >
 *         <option value="">所有分類</option>
 *         <option value="electronics">電子產品</option>
 *         <option value="furniture">家具</option>
 *       </Select>
 *
 *       {products?.map(p => <ProductCard key={p.id} product={p} />)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useFilteredProducts(filters: ProductFilters) {
  const { data: products, ...rest } = useProducts()

  const filteredProducts = products?.filter((product) => {
    // 分類過濾
    if (filters.category && product.category !== filters.category) {
      return false
    }

    // 價格範圍過濾
    if (filters.minPrice && product.unit_price < filters.minPrice) {
      return false
    }
    if (filters.maxPrice && product.unit_price > filters.maxPrice) {
      return false
    }

    // 搜尋關鍵字
    if (filters.search) {
      const search = filters.search.toLowerCase()
      const name = product.name as BilingualText
      const description = product.description as BilingualText | null

      const matchesName =
        name.zh.toLowerCase().includes(search) ||
        name.en.toLowerCase().includes(search)

      const matchesDescription =
        description?.zh.toLowerCase().includes(search) ||
        description?.en.toLowerCase().includes(search)

      const matchesSKU = product.sku?.toLowerCase().includes(search)
      const matchesCategory = product.category?.toLowerCase().includes(search)

      if (!matchesName && !matchesDescription && !matchesSKU && !matchesCategory) {
        return false
      }
    }

    return true
  })

  return {
    data: filteredProducts,
    ...rest,
  }
}

/**
 * 取得產品分類列表
 *
 * @example
 * ```tsx
 * function CategorySelector() {
 *   const { data: categories } = useProductCategories()
 *
 *   return (
 *     <Select>
 *       {categories?.map(category => (
 *         <option key={category} value={category}>
 *           {category}
 *         </option>
 *       ))}
 *     </Select>
 *   )
 * }
 * ```
 */
export function useProductCategories() {
  const { data: products } = useProducts()

  const categories = [...new Set(products?.map((p) => p.category).filter((c): c is string => Boolean(c)))]

  return {
    data: categories,
  }
}

/**
 * 計算產品利潤率
 *
 * @param costPrice - 成本價
 * @param sellingPrice - 售價
 */
export function calculateProfitMargin(costPrice: number, sellingPrice: number): number {
  if (costPrice === 0) return 0
  return ((sellingPrice - costPrice) / costPrice) * 100
}

/**
 * 計算售價（根據成本和利潤率）
 *
 * @param costPrice - 成本價
 * @param profitMargin - 利潤率（百分比）
 */
export function calculateSellingPrice(costPrice: number, profitMargin: number): number {
  return costPrice * (1 + profitMargin / 100)
}
