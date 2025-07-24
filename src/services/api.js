/**
 * 知识图谱数据API服务
 * 支持从远程API获取数据和生成测试数据
 */

class KnowledgeGraphAPI {
  constructor() {
    this.baseURL = process.env.VUE_APP_API_BASE_URL || '';
    this.dataCache = new Map(); // 数据缓存
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
   * 从本地records.json文件加载数据
   * @returns {Promise} 返回知识图谱数据
   */
  async loadFromRecords() {
    const cacheKey = 'records_data';
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey);
    }

    try {
      // 使用fetch加载records.json
      // 在开发环境中，直接从public目录或使用相对路径
      const dataUrl = process.env.NODE_ENV === 'production' 
        ? '/graphview/data/records.json' 
        : '/data/records.json';
        
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const recordsData = await response.json();
      const formattedData = this.formatRecordsData(recordsData);
      
      // 缓存数据
      this.dataCache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('从records.json加载数据失败:', error);
      throw error;
    }
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
   * 格式化records.json数据为知识图谱格式
   * @param {Array} recordsData - records.json的原始数据
   * @returns {Object} 格式化后的知识图谱数据
   */
  formatRecordsData(recordsData) {
    console.log('开始格式化records数据，记录数量:', recordsData.length);
    
    const nodesMap = new Map();
    const linksArray = [];
    const categories = new Map();

    // 处理每个记录
    recordsData.forEach((record, index) => {
      if (!record.p || !record.p.segments) {
        console.warn(`记录 ${index} 缺少必要字段:`, record);
        return;
      }

      // 处理每个路径段
      record.p.segments.forEach(segment => {
        // 处理起始节点
        this.processNode(segment.start, nodesMap, categories);
        
        // 处理结束节点
        this.processNode(segment.end, nodesMap, categories);
        
        // 处理关系
        if (segment.relationship) {
          const link = {
            source: segment.start.identity.toString(),
            target: segment.end.identity.toString(),
            value: Math.random() * 5 + 1, // 随机权重
            relationship: segment.relationship.properties?.name || segment.relationship.type || '关联',
            description: `${segment.start.properties?.name || '未知'} 与 ${segment.end.properties?.name || '未知'} 的关系`,
            type: segment.relationship.type
          };
          linksArray.push(link);
        }
      });
    });

    // 转换nodes Map为数组
    const nodesArray = Array.from(nodesMap.values());
    
    // 转换categories Map为数组
    const categoriesArray = Array.from(categories.values());

    console.log('数据格式化完成:', {
      nodes: nodesArray.length,
      links: linksArray.length,
      categories: categoriesArray.length
    });

    return {
      title: '企业关系知识图谱',
      description: '基于真实数据的企业关系网络分析',
      nodes: nodesArray,
      links: linksArray,
      categories: categoriesArray,
      metadata: {
        total_nodes: nodesArray.length,
        total_links: linksArray.length,
        last_updated: new Date().toISOString(),
        data_source: 'records.json',
        version: '1.0'
      }
    };
  }

  /**
   * 处理单个节点
   * @param {Object} nodeData - 节点原始数据
   * @param {Map} nodesMap - 节点映射表
   * @param {Map} categories - 分类映射表
   */
  processNode(nodeData, nodesMap, categories) {
    if (!nodeData || !nodeData.identity) {
      return;
    }

    const nodeId = nodeData.identity.toString();
    
    // 如果节点已存在，跳过
    if (nodesMap.has(nodeId)) {
      return;
    }

    // 确定节点类型和分类
    const labels = nodeData.labels || ['Unknown'];
    const primaryLabel = labels[0];
    
    // 获取或创建分类
    let categoryId = this.getCategoryId(primaryLabel, categories);
    
    // 计算节点值（基于属性数量和重要性）
    const nodeValue = this.calculateNodeValue(nodeData);

    const node = {
      id: nodeId,
      name: nodeData.properties?.name || `节点${nodeId}`,
      category: categoryId,
      value: nodeValue,
      description: this.generateNodeDescription(nodeData),
      properties: {
        type: primaryLabel,
        labels: labels,
        ...nodeData.properties
      },
      originalData: nodeData
    };

    nodesMap.set(nodeId, node);
  }

  /**
   * 获取或创建分类ID
   * @param {string} label - 节点标签
   * @param {Map} categories - 分类映射表
   * @returns {number} 分类ID
   */
  getCategoryId(label, categories) {
    // 预定义的分类映射
    const categoryMapping = {
      'Enterprise': { name: '企业', color: '#ff9800' },
      'Country': { name: '国家', color: '#f44336' },
      'Region': { name: '地区', color: '#4caf50' },
      'Type': { name: '类型', color: '#2196f3' },
      'Industry': { name: '行业', color: '#9c27b0' },
      'Product': { name: '产品', color: '#607d8b' }
    };

    // 查找现有分类
    for (const [id, category] of categories) {
      if (category.label === label) {
        return id;
      }
    }

    // 创建新分类
    const categoryId = categories.size;
    const categoryInfo = categoryMapping[label] || { 
      name: label, 
      color: this.getRandomColor() 
    };
    
    categories.set(categoryId, {
      id: categoryId,
      name: categoryInfo.name,
      color: categoryInfo.color,
      label: label,
      description: `${categoryInfo.name}相关节点`
    });

    return categoryId;
  }

  /**
   * 计算节点值
   * @param {Object} nodeData - 节点数据
   * @returns {number} 节点值
   */
  calculateNodeValue(nodeData) {
    let value = 20; // 基础值

    // 根据属性数量增加值
    if (nodeData.properties) {
      value += Object.keys(nodeData.properties).length * 5;
    }

    // 根据节点类型调整值
    const labels = nodeData.labels || [];
    if (labels.includes('Enterprise')) {
      value += 30; // 企业节点更重要
    }

    // 添加随机因子
    value += Math.random() * 20;

    return Math.min(value, 100); // 限制最大值
  }

  /**
   * 生成节点描述
   * @param {Object} nodeData - 节点数据
   * @returns {string} 节点描述
   */
  generateNodeDescription(nodeData) {
    const props = nodeData.properties || {};
    const name = props.name || '未知节点';
    const type = nodeData.labels?.[0] || '未知类型';
    
    let description = `${type}: ${name}`;
    
    // 添加特定属性的描述
    if (props.address) {
      description += `\n地址: ${props.address}`;
    }
    if (props.setup_time) {
      description += `\n成立时间: ${props.setup_time}`;
    }
    if (props.captial) {
      description += `\n注册资本: ${props.captial}`;
    }
    
    return description;
  }

  /**
   * 生成随机颜色
   * @returns {string} 十六进制颜色值
   */
  getRandomColor() {
    const colors = [
      '#ff9800', '#f44336', '#4caf50', '#2196f3', 
      '#9c27b0', '#607d8b', '#795548', '#ff5722',
      '#3f51b5', '#009688', '#8bc34a', '#ffc107'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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