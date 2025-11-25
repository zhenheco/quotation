export interface BrandColors {
  primary: string
  secondary: string
  text: string
}

export interface BrandColorPreset {
  id: string
  name: { zh: string; en: string }
  colors: BrandColors
}

export const BRAND_COLOR_PRESETS: BrandColorPreset[] = [
  {
    id: 'indigo',
    name: { zh: '靛藍', en: 'Indigo' },
    colors: { primary: '#4f46e5', secondary: '#f3f4f6', text: '#111827' },
  },
  {
    id: 'blue',
    name: { zh: '商務藍', en: 'Business Blue' },
    colors: { primary: '#2563eb', secondary: '#eff6ff', text: '#1e3a5f' },
  },
  {
    id: 'emerald',
    name: { zh: '翡翠綠', en: 'Emerald' },
    colors: { primary: '#059669', secondary: '#ecfdf5', text: '#064e3b' },
  },
  {
    id: 'orange',
    name: { zh: '活力橘', en: 'Orange' },
    colors: { primary: '#ea580c', secondary: '#fff7ed', text: '#9a3412' },
  },
  {
    id: 'purple',
    name: { zh: '高貴紫', en: 'Purple' },
    colors: { primary: '#7c3aed', secondary: '#f5f3ff', text: '#4c1d95' },
  },
  {
    id: 'slate',
    name: { zh: '專業灰', en: 'Slate' },
    colors: { primary: '#475569', secondary: '#f1f5f9', text: '#0f172a' },
  },
]

export const DEFAULT_BRAND_COLORS: BrandColors = BRAND_COLOR_PRESETS[0].colors
