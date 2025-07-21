/**
 * 知识图谱数据API服务
 * 支持从本地JSON文件、远程API或用户上传文件获取数据
 */

class KnowledgeGraphAPI {
  constructor() {
    this.baseURL = process.env.VUE_APP_API_BASE_URL || '';
    this.dataCache = new Map(); // 数据缓存
  }

  /**
   * 从本地JSON文件获取数据（支持多种数据源）
   * @param {string} dataSource - 数据源类型
   * @returns {Promise} 返回知识图谱数据
   */
  async loadFromLocalFile(dataSource = 'knowledge') {
    const fileMap = {
      'knowledge': 'knowledge-graph-data.json',
      'case': 'case-analysis-data.json',
      'test': null // 生成测试数据
    };

    const filename = fileMap[dataSource];
    
    // 如果是测试数据，直接生成
    if (dataSource === 'test') {
      return this.generateSampleData();
    }

    // 检查缓存
    const cacheKey = `local_${filename}`;
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey);
    }

    try {
      const response = await fetch(`/data/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const formattedData = this.formatData(data);
      
      // 缓存数据
      this.dataCache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('加载本地JSON文件失败:', error);
      // 如果加载失败，返回示例数据
      return this.generateSampleData();
    }
  }

  /**
   * 从远程API获取数据
   * @param {string} endpoint - API端点
   * @returns {Promise} 返回知识图谱数据
   */
  async loadFromAPI(endpoint = '/api/knowledge-graph') {
    const cacheKey = `api_${endpoint}`;
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10秒超时
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const formattedData = this.formatData(data);
      
      // 缓存数据
      this.dataCache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('从API获取数据失败:', error);
      throw error;
    }
  }

  /**
   * 提交用户选择的文件
   * @param {File} file - 用户上传的JSON文件
   * @returns {Promise} 返回知识图谱数据
   */
  async loadFromFile(file) {
    return new Promise((resolve, reject) => {
      // 检查文件类型
      if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        reject(new Error('请选择JSON格式的文件'));
        return;
      }

      // 检查文件大小（限制为10MB）
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('文件大小不能超过10MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          const formattedData = this.formatData(data);
          
          // 验证数据
          if (!this.validateData(formattedData)) {
            reject(new Error('JSON文件数据格式不正确'));
            return;
          }
          
          resolve(formattedData);
        } catch (error) {
          reject(new Error('JSON文件解析失败：' + error.message));
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * 格式化数据，确保数据结构正确
   * @param {Object} rawData - 原始数据
   * @returns {Object} 格式化后的数据
   */
  formatData(rawData) {
    // 检查必需的字段
    if (!rawData.nodes || !Array.isArray(rawData.nodes)) {
      throw new Error('数据缺少nodes字段或格式不正确');
    }
    
    if (!rawData.links && !rawData.edges) {
      throw new Error('数据缺少links或edges字段');
    }

    // 统一links字段名
    const links = rawData.links || rawData.edges || [];

    // 确保节点有必需的字段
    const nodes = rawData.nodes.map((node, index) => ({
      id: node.id || `node_${index}`,
      name: node.name || node.label || `节点${index + 1}`,
      category: node.category !== undefined ? node.category : index % 6,
      value: node.value || Math.random() * 50 + 20,
      description: node.description || `${node.name || '节点'}的描述信息`,
      properties: {
        type: node.properties?.type || this.getCategoryName(node.category || index % 6),
        ...node.properties
      },
      ...node
    }));

    // 确保连接有必需的字段
    const formattedLinks = links.map((link) => ({
      source: link.source || link.from,
      target: link.target || link.to,
      value: link.value || link.weight || Math.random() * 5 + 1,
      relationship: link.relationship || link.type || '关联',
      description: link.description || `${link.source} 与 ${link.target} 的关系`,
      ...link
    }));

    return {
      title: rawData.title || '3D知识图谱',
      description: rawData.description || '智能关系网络分析',
      nodes,
      links: formattedLinks,
      categories: rawData.categories || this.getDefaultCategories(),
      metadata: {
        total_nodes: nodes.length,
        total_links: formattedLinks.length,
        last_updated: new Date().toISOString(),
        data_source: rawData.metadata?.data_source || '未知',
        version: rawData.version || '1.0',
        ...rawData.metadata
      }
    };
  }

  /**
   * 获取分类名称
   * @param {number} categoryId - 分类ID
   * @returns {string} 分类名称
   */
  getCategoryName(categoryId) {
    const categoryNames = [
      '核心概念', '应用领域', '工具框架', 
      '具体模型', '证据类型', '相关物品'
    ];
    return categoryNames[categoryId] || '其他';
  }

  /**
   * 获取默认分类配置
   * @returns {Array} 默认分类数组
   */
  getDefaultCategories() {
    return [
      { id: 0, name: '核心概念', color: '#ff9800', description: '领域的核心概念' },
      { id: 1, name: '应用领域', color: '#f44336', description: '具体应用领域' },
      { id: 2, name: '工具框架', color: '#4caf50', description: '相关工具和框架' },
      { id: 3, name: '具体模型', color: '#2196f3', description: '具体的模型和算法' },
      { id: 4, name: '证据类型', color: '#9c27b0', description: '各类证据和材料' },
      { id: 5, name: '相关物品', color: '#607d8b', description: '相关物品和资源' }
    ];
  }

  /**
   * 验证数据格式是否正确
   * @param {Object} data - 要验证的数据
   * @returns {boolean} 验证结果
   */
  validateData(data) {
    try {
      if (!data || typeof data !== 'object') return false;
      if (!Array.isArray(data.nodes) || data.nodes.length === 0) return false;
      if (!Array.isArray(data.links)) return false;
      
      // 检查节点是否有必需字段
      const nodeValid = data.nodes.every(node => 
        Object.prototype.hasOwnProperty.call(node, 'id') && 
        Object.prototype.hasOwnProperty.call(node, 'name') &&
        typeof node.id === 'string' &&
        typeof node.name === 'string'
      );
      
      // 检查连接是否有必需字段
      const linkValid = data.links.every(link => 
        Object.prototype.hasOwnProperty.call(link, 'source') && 
        Object.prototype.hasOwnProperty.call(link, 'target') &&
        typeof link.source === 'string' &&
        typeof link.target === 'string'
      );
      
      // 检查连接的节点是否都存在
      const nodeIds = new Set(data.nodes.map(node => node.id));
      const linkNodesValid = data.links.every(link => 
        nodeIds.has(link.source) && nodeIds.has(link.target)
      );
      
      return nodeValid && linkValid && linkNodesValid;
    } catch (error) {
      console.error('数据验证失败:', error);
      return false;
    }
  }

  /**
   * 生成示例数据（用于演示）
   * @returns {Object} 示例知识图谱数据
   */
  generateSampleData() {
    return {
      title: "AI技术知识图谱",
      description: "人工智能领域的技术关系图谱",
      version: "1.0",
      nodes: [
        { 
          id: 'AI', 
          name: '人工智能', 
          category: 0, 
          value: 100,
          description: '一门让机器模拟人类智能的科学技术',
          properties: { type: '核心概念', field: '计算机科学', level: '顶级概念' }
        },
        { 
          id: 'ML', 
          name: '机器学习', 
          category: 0, 
          value: 90,
          description: '让计算机从数据中学习的方法',
          properties: { type: '核心概念', field: '人工智能', level: '核心技术' }
        },
        { 
          id: 'DL', 
          name: '深度学习', 
          category: 0, 
          value: 80,
          description: '基于神经网络的机器学习方法',
          properties: { type: '核心概念', field: '机器学习', level: '前沿技术' }
        },
        { 
          id: 'NLP', 
          name: '自然语言处理', 
          category: 1, 
          value: 70,
          description: '让计算机理解和处理自然语言的技术',
          properties: { type: '应用领域', field: '语言技术', level: '专业技术' }
        },
        { 
          id: 'CV', 
          name: '计算机视觉', 
          category: 1, 
          value: 75,
          description: '让计算机理解和分析图像的技术',
          properties: { type: '应用领域', field: '图像技术', level: '专业技术' }
        },
        { 
          id: 'TensorFlow', 
          name: 'TensorFlow', 
          category: 2, 
          value: 60,
          description: 'Google开发的开源机器学习框架',
          properties: { type: '工具框架', developer: 'Google', license: 'Apache 2.0' }
        },
        { 
          id: 'PyTorch', 
          name: 'PyTorch', 
          category: 2, 
          value: 58,
          description: 'Facebook开发的开源机器学习框架',
          properties: { type: '工具框架', developer: 'Facebook', license: 'BSD' }
        },
        { 
          id: 'GPT', 
          name: 'GPT模型', 
          category: 3, 
          value: 85,
          description: '生成式预训练transformer模型',
          properties: { type: '具体模型', architecture: 'Transformer', task: '文本生成' }
        },
        { 
          id: 'BERT', 
          name: 'BERT模型', 
          category: 3, 
          value: 80,
          description: '双向编码器表示的transformer',
          properties: { type: '具体模型', architecture: 'Transformer', task: '文本理解' }
        }
      ],
      links: [
        { source: 'AI', target: 'ML', value: 10, relationship: '包含', description: '人工智能包含机器学习' },
        { source: 'ML', target: 'DL', value: 8, relationship: '包含', description: '机器学习包含深度学习' },
        { source: 'ML', target: 'NLP', value: 7, relationship: '应用于', description: '机器学习应用于自然语言处理' },
        { source: 'ML', target: 'CV', value: 7, relationship: '应用于', description: '机器学习应用于计算机视觉' },
        { source: 'DL', target: 'TensorFlow', value: 6, relationship: '使用', description: '深度学习使用TensorFlow框架' },
        { source: 'DL', target: 'PyTorch', value: 6, relationship: '使用', description: '深度学习使用PyTorch框架' },
        { source: 'NLP', target: 'GPT', value: 8, relationship: '实现', description: '自然语言处理通过GPT模型实现' },
        { source: 'NLP', target: 'BERT', value: 7, relationship: '实现', description: '自然语言处理通过BERT模型实现' },
        { source: 'TensorFlow', target: 'GPT', value: 5, relationship: '训练', description: 'TensorFlow可以训练GPT模型' },
        { source: 'PyTorch', target: 'BERT', value: 5, relationship: '训练', description: 'PyTorch可以训练BERT模型' }
      ],
      categories: [
        { id: 0, name: '核心概念', color: '#ff9800', description: 'AI领域的核心概念' },
        { id: 1, name: '应用领域', color: '#f44336', description: 'AI的具体应用领域' },
        { id: 2, name: '工具框架', color: '#4caf50', description: 'AI开发工具和框架' },
        { id: 3, name: '具体模型', color: '#2196f3', description: '具体的AI模型' }
      ],
      metadata: {
        total_nodes: 9,
        total_links: 10,
        last_updated: new Date().toISOString(),
        data_source: '示例数据',
        author: '智能分析系统',
        version: '1.0'
      }
    };
  }

  /**
   * 清除数据缓存
   */
  clearCache() {
    this.dataCache.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return {
      size: this.dataCache.size,
      keys: Array.from(this.dataCache.keys())
    };
  }
}

// 创建全局API实例
const apiService = new KnowledgeGraphAPI();

export default apiService; 