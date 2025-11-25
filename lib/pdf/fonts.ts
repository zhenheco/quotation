import { Font } from '@react-pdf/renderer'

let fontsRegistered = false

export async function registerFonts(): Promise<void> {
  if (fontsRegistered) return

  Font.register({
    family: 'NotoSansTC',
    src: '/fonts/NotoSansTC-Regular.ttf',
  })

  fontsRegistered = true
}
