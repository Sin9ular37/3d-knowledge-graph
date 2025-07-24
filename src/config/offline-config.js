class OfflineResourceConfig {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.basePath = process.env.BASE_URL || '/'
  }

  // 配置Three.js离线资源
  configureThreeJS() {
    if (this.isProduction) {
      // Three.js 已通过npm安装，无需额外配置
      console.log('Three.js configured for offline use')
    }
  }

  // CDN资源本地化
  interceptCDNRequests() {
    if (this.isProduction) {
      const originalFetch = window.fetch
      const self = this
      
      window.fetch = function(url, options) {
        // 如果有CDN请求，重定向到本地资源
        const cdnMappings = {
          'cdn.jsdelivr.net': `${self.basePath}assets/cdn/`,
          'unpkg.com': `${self.basePath}assets/cdn/`,
          'fonts.googleapis.com': `${self.basePath}assets/fonts/`,
          'fonts.gstatic.com': `${self.basePath}assets/fonts/`
        }
        
        let localUrl = url
        for (const [cdnDomain, localPath] of Object.entries(cdnMappings)) {
          if (url.includes(cdnDomain)) {
            localUrl = url.replace(`https://${cdnDomain}`, localPath)
            console.log(`CDN请求重定向: ${url} -> ${localUrl}`)
            break
          }
        }
        
        return originalFetch.call(this, localUrl, options)
      }
    }
  }

  // 初始化离线配置
  init() {
    this.configureThreeJS()
    this.interceptCDNRequests()
    console.log('离线资源配置已初始化')
  }
}

export default new OfflineResourceConfig() 