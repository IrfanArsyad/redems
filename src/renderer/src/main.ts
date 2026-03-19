import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@renderer/App.vue'
import '@renderer/assets/styles/tailwind.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

app.mount('#app')
