<template>
  <div class="three-graph-container">
    <!-- 动态背景 -->
    <div class="animated-background">
      <div class="bg-layer layer1"></div>
      <div class="bg-layer layer2"></div>
      <div class="bg-layer layer3"></div>
    </div>
    
    <!-- 星空背景 -->
    <div class="starry-background">
      <div v-for="n in 200" :key="n" class="star" :style="getStarStyle()"></div>
    </div>
    
    <!-- 加载动画 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="loading-text">{{ loadingText }}</div>
      </div>
    </div>
    
    <!-- 标题栏 -->
    <div class="title-bar">
      <h1 class="main-title">
        <span class="title-icon">🌌</span>
        知识图谱
      </h1>
    </div>
    
    <!-- Three.js 画布容器 -->
    <div ref="threeContainer" class="three-container"></div>
    
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="panel-header">
        <h3>🎮 Three.js 控制台</h3>
        <button @click="togglePanel" class="panel-toggle">
          {{ panelCollapsed ? '展开' : '收起' }}
        </button>
      </div>
      
      <div class="panel-content" :class="{ collapsed: panelCollapsed }">
        <!-- 数据操作区 -->
        <div class="control-section">
          <h4>数据操作</h4>
          <div class="control-buttons">
            <button @click="refreshData" class="btn btn-primary">
              🔄 刷新数据
            </button>
            <button @click="loadFromFile" class="btn btn-accent">
              ⬆️ 上传文件
            </button>
          </div>
        </div>
        
        <!-- 视图控制区 -->
        <div class="control-section">
          <h4>视图控制</h4>
          <div class="view-controls">
            <button @click="toggleAutoRotate" class="btn" :class="autoRotate ? 'btn-success' : 'btn-outline'">
              {{ autoRotate ? '⏸️ 停止自转' : '▶️ 开始自转' }}
            </button>
            <button @click="resetView" class="btn btn-outline">
              🎯 重置视角
            </button>
          </div>
        </div>
        
        <!-- 统计信息 -->
        <div class="control-section">
          <h4>统计信息</h4>
          <div class="info-cards">
            <div class="info-card">
              <div class="info-icon">📊</div>
              <div class="info-content">
                <div class="info-value">{{ nodeCount }}</div>
                <div class="info-label">节点</div>
              </div>
            </div>
            <div class="info-card">
              <div class="info-icon">🔗</div>
              <div class="info-content">
                <div class="info-value">{{ linkCount }}</div>
                <div class="info-label">连线</div>
              </div>
            </div>
            <div class="info-card">
              <div class="info-icon">🎮</div>
              <div class="info-content">
                <div class="info-value">{{ Math.round(fps) }}</div>
                <div class="info-label">FPS</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 节点详情弹窗 -->
    <div v-if="selectedNode" class="node-detail-modal" @click="closeNodeDetail">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedNode.name }}</h3>
          <button @click="closeNodeDetail" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="node-info">
            <p><strong>类型:</strong> {{ selectedNode.properties?.type || '未知' }}</p>
            <p><strong>权重:</strong> {{ selectedNode.value }}</p>
            <p v-if="selectedNode.description"><strong>描述:</strong> {{ selectedNode.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { markRaw } from 'vue'
import apiService from '@/services/api'

export default {
  name: 'KnowledgeGraphThree',
  data() {
    return {
      // 数据相关
      graphData: { nodes: [], links: [] },
      nodeCount: 0,
      linkCount: 0,
      
      // 控制参数
      autoRotate: false,
      
      // UI 状态
      loading: false,
      loadingText: '加载中...',
      panelCollapsed: false,
      selectedNode: null,
      fps: 60
    }
  },
  
  created() {
    // Three.js 相关对象存储在组件实例上，避免响应式包装
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.raycaster = null
    this.mouse = null
    this.nodeObjects = []
    this.linkObjects = []
  },
  
  mounted() {
    this.initThree()
    this.loadTestData()
    this.startAnimationLoop()
    this.startFPSCounter()
  },
  
  beforeUnmount() {
    this.cleanup()
  },
  
  methods: {
    // Three.js 初始化
    async initThree() {
      try {
        // 创建场景
        this.scene = markRaw(new THREE.Scene())
        this.scene.background = new THREE.Color(0x000011)
        
        // 创建相机
        const container = this.$refs.threeContainer
        this.camera = markRaw(new THREE.PerspectiveCamera(
          75,
          container.clientWidth / container.clientHeight,
          0.1,
          2000
        ))
        this.camera.position.set(100, 100, 100)
        
        // 创建渲染器
        this.renderer = markRaw(new THREE.WebGLRenderer({ antialias: true }))
        this.renderer.setSize(container.clientWidth, container.clientHeight)
        this.renderer.setPixelRatio(window.devicePixelRatio)
        container.appendChild(this.renderer.domElement)
        
        // 创建控制器
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        this.controls = markRaw(new OrbitControls(this.camera, this.renderer.domElement))
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.05
        this.controls.autoRotate = this.autoRotate
        
        // 创建射线投射器
        this.raycaster = markRaw(new THREE.Raycaster())
        this.mouse = markRaw(new THREE.Vector2())
        
        // 添加灯光
        this.addLights()
        
        // 添加事件监听
        this.addEventListeners()
        
        console.log('Three.js 初始化成功')
      } catch (error) {
        console.error('Three.js 初始化失败:', error)
      }
    },
    
    // 添加灯光
    addLights() {
      const ambientLight = markRaw(new THREE.AmbientLight(0x404040, 0.6))
      this.scene.add(ambientLight)
      
      const directionalLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.8))
      directionalLight.position.set(100, 100, 50)
      this.scene.add(directionalLight)
      
      const pointLight = markRaw(new THREE.PointLight(0x4ecdc4, 1, 200))
      pointLight.position.set(50, 50, 50)
      this.scene.add(pointLight)
    },
    
    // 加载测试数据
    async loadTestData() {
      this.loading = true
      this.loadingText = '正在生成测试数据...'
      
      try {
        const data = await apiService.generateSampleData()
        this.graphData = data
        this.nodeCount = data.nodes.length
        this.linkCount = data.links.length
        
        await this.renderGraph()
        this.loading = false
      } catch (error) {
        console.error('加载测试数据失败:', error)
        this.loading = false
      }
    },
    
    // 渲染图谱
    async renderGraph() {
      this.clearGraph()
      await this.renderNodes()
      await this.renderLinks()
      this.applyForceLayout()
    },
    
    // 渲染节点
    async renderNodes() {
      const nodeGeometry = markRaw(new THREE.SphereGeometry(1, 16, 16))
      
      for (let i = 0; i < this.graphData.nodes.length; i++) {
        const node = this.graphData.nodes[i]
        
        const color = new THREE.Color(this.getCategoryColor(node.category))
        const material = markRaw(new THREE.MeshPhongMaterial({
          color: color,
          transparent: true,
          opacity: 0.9
        }))
        
        const nodeMesh = markRaw(new THREE.Mesh(nodeGeometry, material))
        
        // 随机初始位置
        nodeMesh.position.set(
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200
        )
        
        // 设置大小
        const size = Math.sqrt(node.value) * 0.3 + 1
        nodeMesh.scale.setScalar(size)
        
        // 存储节点数据
        nodeMesh.userData = node
        nodeMesh.userData.index = i
        
        this.scene.add(nodeMesh)
        this.nodeObjects.push(nodeMesh)
      }
    },
    
    // 渲染连线
    renderLinks() {
      for (const link of this.graphData.links) {
        const sourceNode = this.nodeObjects.find(n => n.userData.id === link.source)
        const targetNode = this.nodeObjects.find(n => n.userData.id === link.target)
        
        if (sourceNode && targetNode) {
          const points = [sourceNode.position, targetNode.position]
          const geometry = markRaw(new THREE.BufferGeometry().setFromPoints(points))
          
          const color = new THREE.Color(this.getRelationshipColor(link.relationship))
          const material = markRaw(new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
          }))
          
          const line = markRaw(new THREE.Line(geometry, material))
          line.userData = link
          
          this.scene.add(line)
          this.linkObjects.push(line)
        }
      }
    },
    
    // 应用力导向布局
    applyForceLayout() {
      for (let iteration = 0; iteration < 50; iteration++) {
        // 排斥力
        for (let i = 0; i < this.nodeObjects.length; i++) {
          for (let j = i + 1; j < this.nodeObjects.length; j++) {
            const nodeA = this.nodeObjects[i]
            const nodeB = this.nodeObjects[j]
            
            const distance = nodeA.position.distanceTo(nodeB.position)
            if (distance < 50) {
              const force = 1000 / (distance * distance)
              const direction = markRaw(new THREE.Vector3())
                .subVectors(nodeA.position, nodeB.position)
                .normalize()
              
              nodeA.position.add(direction.multiplyScalar(force * 0.01))
              nodeB.position.sub(direction.multiplyScalar(force * 0.01))
            }
          }
        }
        
        // 吸引力（连线）
        for (const link of this.linkObjects) {
          const sourceNode = this.nodeObjects.find(n => n.userData.id === link.userData.source)
          const targetNode = this.nodeObjects.find(n => n.userData.id === link.userData.target)
          
          if (sourceNode && targetNode) {
            const distance = sourceNode.position.distanceTo(targetNode.position)
            const idealDistance = 80
            const force = (distance - idealDistance) * 0.01
            
            const direction = markRaw(new THREE.Vector3())
              .subVectors(targetNode.position, sourceNode.position)
              .normalize()
            
            sourceNode.position.add(direction.multiplyScalar(force))
            targetNode.position.sub(direction.multiplyScalar(force))
          }
        }
      }
      
      this.updateLinkPositions()
    },
    
    // 更新连线位置
    updateLinkPositions() {
      for (const link of this.linkObjects) {
        const sourceNode = this.nodeObjects.find(n => n.userData.id === link.userData.source)
        const targetNode = this.nodeObjects.find(n => n.userData.id === link.userData.target)
        
        if (sourceNode && targetNode) {
          const points = [sourceNode.position.clone(), targetNode.position.clone()]
          link.geometry.setFromPoints(points)
        }
      }
    },
    
    // 清除图谱
    clearGraph() {
      for (const node of this.nodeObjects) {
        this.scene.remove(node)
      }
      this.nodeObjects = []
      
      for (const link of this.linkObjects) {
        this.scene.remove(link)
      }
      this.linkObjects = []
    },
    
    // 添加事件监听
    addEventListeners() {
      window.addEventListener('resize', this.onWindowResize)
      this.renderer.domElement.addEventListener('click', this.onMouseClick)
    },
    
    // 窗口大小变化处理
    onWindowResize() {
      const container = this.$refs.threeContainer
      this.camera.aspect = container.clientWidth / container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(container.clientWidth, container.clientHeight)
    },
    
    // 鼠标点击处理
    onMouseClick(event) {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
      
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObjects(this.nodeObjects)
      
      if (intersects.length > 0) {
        const clickedNode = intersects[0].object
        this.openNodeDetail(clickedNode.userData)
      }
    },
    
    // 动画循环
    startAnimationLoop() {
      const animate = () => {
        requestAnimationFrame(animate)
        
        if (this.controls) {
          this.controls.update()
        }
        
        // 节点动画
        for (const node of this.nodeObjects) {
          node.position.y += Math.sin(Date.now() * 0.001 + node.userData.index) * 0.02
          node.rotation.y += 0.01
        }
        
        this.updateLinkPositions()
        
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera)
        }
      }
      
      animate()
    },
    
    // FPS 计数器
    startFPSCounter() {
      let lastTime = performance.now()
      let frameCount = 0
      
      const updateFPS = () => {
        frameCount++
        const currentTime = performance.now()
        
        if (currentTime - lastTime >= 1000) {
          this.fps = frameCount
          frameCount = 0
          lastTime = currentTime
        }
        
        requestAnimationFrame(updateFPS)
      }
      
      updateFPS()
    },
    
    // 获取分类颜色
    getCategoryColor(category) {
      const colors = ['#ff9800', '#f44336', '#4caf50', '#2196f3', '#9c27b0', '#607d8b']
      return colors[category] || '#ffffff'
    },
    
    // 获取关系颜色
    getRelationshipColor(relationship) {
      const colorMap = {
        '包含': '#4caf50',
        '关联': '#2196f3',
        '应用于': '#ff9800',
        '实现': '#9c27b0',
        '使用': '#607d8b',
        '训练': '#f44336'
      }
      return colorMap[relationship] || '#4ecdc4'
    },
    
    // 生成星星样式
    getStarStyle() {
      return {
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animationDelay: Math.random() * 3 + 's'
      }
    },
    
    // 控制面板方法
    togglePanel() {
      this.panelCollapsed = !this.panelCollapsed
    },
    
    toggleAutoRotate() {
      this.autoRotate = !this.autoRotate
      if (this.controls) {
        this.controls.autoRotate = this.autoRotate
      }
    },
    
    resetView() {
      if (this.camera && this.controls) {
        this.camera.position.set(100, 100, 100)
        this.controls.reset()
      }
    },
    
    refreshData() {
      this.loadTestData()
    },
    
    loadFromFile() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = async (event) => {
        const file = event.target.files[0]
        if (file) {
          try {
            this.loading = true
            this.loadingText = '解析文件...'
            
            const data = await apiService.loadFromFile(file)
            this.graphData = data
            this.nodeCount = data.nodes.length
            this.linkCount = data.links.length
            
            await this.renderGraph()
            this.loading = false
          } catch (error) {
            console.error('文件加载失败:', error)
            this.loading = false
          }
        }
      }
      input.click()
    },
    
    openNodeDetail(node) {
      this.selectedNode = node
    },
    
    closeNodeDetail() {
      this.selectedNode = null
    },
    
    // 清理资源
    cleanup() {
      window.removeEventListener('resize', this.onWindowResize)
      
      if (this.renderer) {
        this.renderer.dispose()
      }
      
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose()
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.three-graph-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
}

/* 动态背景 */
.animated-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}

.bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.1;
  animation: moveBackground 100s linear infinite;
}

.layer1 {
  background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%);
  animation-delay: -20s;
}

.layer2 {
  background: radial-gradient(circle at 60% 60%, rgba(70, 130, 180, 0.2) 0%, transparent 50%);
  animation-delay: -40s;
}

.layer3 {
  background: radial-gradient(circle at 30% 30%, rgba(32, 178, 170, 0.2) 0%, transparent 50%);
  animation-delay: -60s;
}

@keyframes moveBackground {
  0% { transform: translate(0, 0); }
  100% { transform: translate(0, -50%); }
}

/* 星空背景 */
.starry-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  animation: twinkle 3s infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* 加载动画 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.loading-spinner {
  text-align: center;
}

.spinner-ring {
  width: 100px;
  height: 100px;
  border: 5px solid rgba(78, 205, 196, 0.2);
  border-top: 5px solid #4ecdc4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

.loading-text {
  margin-top: 20px;
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 标题栏 */
.title-bar {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
}

.main-title {
  font-size: 48px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(78, 205, 196, 0.8);
  margin-bottom: 5px;
  animation: titleGlow 3s ease-in-out infinite;
}

.title-icon {
  margin-right: 10px;
}

@keyframes titleGlow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(78, 205, 196, 0.8), 0 0 20px rgba(78, 205, 196, 0.6);
  }
  50% {
    text-shadow: 0 0 20px rgba(78, 205, 196, 1), 0 0 40px rgba(78, 205, 196, 0.8);
  }
}

/* Three.js 容器 */
.three-container {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

/* 控制面板 */
.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 10px;
  color: white;
  min-width: 250px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.panel-header h3 {
  margin: 0;
  color: #4ecdc4;
  font-size: 18px;
}

.panel-toggle {
  background: none;
  border: 1px solid #4ecdc4;
  color: #4ecdc4;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
}

.panel-toggle:hover {
  background-color: #4ecdc4;
  color: #000;
}

.panel-content.collapsed {
  display: none;
}

.control-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.control-section:last-child {
  border-bottom: none;
}

.control-section h4 {
  margin: 0 0 10px 0;
  color: #4ecdc4;
  font-size: 14px;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(45deg, #4ecdc4, #45b7d1);
  color: white;
}

.btn-accent {
  background: linear-gradient(45deg, #ff9800, #f44336);
  color: white;
}

.btn-success {
  background: linear-gradient(45deg, #4caf50, #388e3c);
  color: white;
}

.btn-outline {
  background: none;
  border: 1px solid #4ecdc4;
  color: #4ecdc4;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
}

.btn-outline:hover {
  background-color: #4ecdc4;
  color: #000;
}

.view-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.info-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-icon {
  font-size: 20px;
  margin-bottom: 5px;
  color: #4ecdc4;
}

.info-value {
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 2px;
}

.info-label {
  font-size: 10px;
  color: #cccccc;
}

/* 模态框 */
.node-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a2e;
  border-radius: 15px;
  width: 90%;
  max-width: 500px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #2a2a2a;
  border-radius: 15px 15px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.modal-body {
  padding: 20px;
}

.node-info p {
  margin: 8px 0;
  color: #cccccc;
  font-size: 14px;
}

.node-info strong {
  color: #4ecdc4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
  }

  .main-title {
    font-size: 32px;
  }

  .info-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
  }

  .info-card {
    padding: 5px;
  }

  .info-icon {
    font-size: 16px;
  }

  .info-value {
    font-size: 14px;
  }

  .info-label {
    font-size: 9px;
  }
}
</style> 