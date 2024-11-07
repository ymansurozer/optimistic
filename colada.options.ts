// colada.options.ts
import type { PiniaColadaOptions } from '@pinia/colada'
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'
import { PiniaColadaAutoRefetch } from './pinia-colada/autoRefetch'

export default {
  plugins: [PiniaColadaAutoRefetch(), PiniaColadaRetry()],
} satisfies PiniaColadaOptions
