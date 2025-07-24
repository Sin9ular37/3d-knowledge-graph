import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import offlineConfig from './config/offline-config'

// 初始化离线配置
offlineConfig.init()

createApp(App).use(router).mount('#app')
