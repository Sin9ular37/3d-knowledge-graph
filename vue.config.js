const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production' ? '/graphview/' : '/',
  outputDir: 'dist-graphview',
  devServer: {
    port: 8080,
    open: true,
    historyApiFallback: {
      rewrites: [
        { from: /^\/graphview\//, to: '/index.html' }
      ]
    }
  }
})
