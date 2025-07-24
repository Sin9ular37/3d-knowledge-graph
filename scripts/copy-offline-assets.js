const fs = require('fs-extra')
const path = require('path')

class AssetsCopier {
  constructor() {
    this.config = {
      // 配置需要复制的资源
      sources: [
        {
          name: 'Three.js Examples',
          from: 'node_modules/three/examples',
          to: 'public/assets/three/examples'
        },
        {
          name: 'Three.js Build',
          from: 'node_modules/three/build',
          to: 'public/assets/three/build'
        }
      ]
    }
  }

  async copyAllAssets() {
    console.log('开始复制离线资源...')
    
    // 确保assets目录存在
    await fs.ensureDir('public/assets')
    
    for (const source of this.config.sources) {
      try {
        const sourcePath = path.join(process.cwd(), source.from)
        const targetPath = path.join(process.cwd(), source.to)
        
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, targetPath)
          console.log(`✅ ${source.name} 复制成功: ${source.to}`)
        } else {
          console.warn(`⚠️  源路径不存在: ${sourcePath}`)
        }
      } catch (error) {
        console.error(`❌ ${source.name} 复制失败:`, error.message)
      }
    }
    
    console.log('离线资源复制完成!')
  }

  // 清理资源
  async cleanAssets() {
    const assetsDir = path.join(process.cwd(), 'public/assets')
    try {
      await fs.remove(assetsDir)
      console.log('资源目录清理完成')
    } catch (error) {
      console.error('清理失败:', error.message)
    }
  }
}

// 执行复制
const copier = new AssetsCopier()

if (process.argv.includes('--clean')) {
  copier.cleanAssets()
} else {
  copier.copyAllAssets()
}

module.exports = AssetsCopier 