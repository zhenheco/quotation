export function parseJsonbFields<T extends Record<string, unknown>>(
  data: T,
  jsonbFieldNames: string[] = ['name', 'description', 'notes', 'address', 'contact_person']
): T {
  if (!data || typeof data !== 'object') {
    return data
  }

  const result = { ...data }

  for (const fieldName of jsonbFieldNames) {
    if (fieldName in result && typeof result[fieldName] === 'string') {
      try {
        result[fieldName] = JSON.parse(result[fieldName] as string)
      } catch {
        // If parsing fails, keep the original string value
      }
    }
  }

  return result as T
}

export function parseJsonbArray<T extends Record<string, unknown>>(
  data: T[],
  jsonbFieldNames?: string[]
): T[] {
  return data.map(item => parseJsonbFields(item, jsonbFieldNames))
}
