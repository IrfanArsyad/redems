/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

import type { ApiType } from '../../preload/index'

declare global {
  interface Window {
    api: ApiType
  }
}
