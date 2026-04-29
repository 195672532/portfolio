// Cloudflare Workers + KV 配置文件
// 国内访问速度快，免费额度充足

const CLOUDFLARE_CONFIG = {
  // Cloudflare Worker API 地址
  // 你需要部署自己的 Worker，或者使用我提供的公共 Worker
  apiUrl: 'https://portfolio-api.your-subdomain.workers.dev',
  
  // 数据缓存键
  cacheKey: 'portfolio_data',
  
  // 本地存储备份键
  localKey: 'portfolio_cf_backup'
};

// 模拟 Cloudflare KV 存储（使用 localStorage 作为回退）
const CFStorage = {
  data: null,
  
  // 获取数据
  async get() {
    // 如果内存中有数据，直接返回
    if (this.data) return this.data;
    
    // 尝试从 localStorage 读取
    const local = localStorage.getItem(CLOUDFLARE_CONFIG.localKey);
    if (local) {
      this.data = JSON.parse(local);
      return this.data;
    }
    
    // 返回默认数据
    return this.getDefaultData();
  },
  
  // 保存数据
  async set(data) {
    this.data = data;
    localStorage.setItem(CLOUDFLARE_CONFIG.localKey, JSON.stringify(data));
    
    // 尝试同步到云端（如果有配置 Worker）
    try {
      if (CLOUDFLARE_CONFIG.apiUrl && !CLOUDFLARE_CONFIG.apiUrl.includes('your-subdomain')) {
        await fetch(CLOUDFLARE_CONFIG.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    } catch (e) {
      console.log('云端同步失败，使用本地存储');
    }
    
    return true;
  },
  
  // 默认数据
  getDefaultData() {
    return {
      profile: {
        name: '设计师',
        badge: '平面设计师',
        subtitle: '专注品牌视觉 · 创意设计',
        bio: '热爱设计，用视觉语言传递品牌价值。专注于LOGO设计、画册排版、海报创意及地产平面设计。',
        years: '5+',
        avatar: '',
        tags: ['LOGO设计', '画册排版', '海报创意', '视觉识别', '地产平面'],
        phone: '',
        email: '',
        wechat: ''
      },
      types: ['LOGO', '画册', '传单', '海报', '户型图', '区位图', '其他'],
      works: [],
      projects: [],
      password: 'admin123'
    };
  }
};

// 数据操作封装
const PortfolioDB = {
  // 初始化标记
  _initialized: false,
  
  // 初始化数据
  async _init() {
    if (this._initialized) return;
    
    const data = await CFStorage.get();
    // 确保所有字段存在
    if (!data.works) data.works = [];
    if (!data.projects) data.projects = [];
    if (!data.types) data.types = ['LOGO', '画册', '传单', '海报', '户型图', '区位图', '其他'];
    if (!data.profile) data.profile = CFStorage.getDefaultData().profile;
    if (!data.password) data.password = 'admin123';
    
    await CFStorage.set(data);
    this._initialized = true;
  },

  // ========== 作品相关 ==========
  async getWorks() {
    await this._init();
    const data = await CFStorage.get();
    return data.works || [];
  },

  async addWork(work) {
    await this._init();
    const data = await CFStorage.get();
    work.id = Date.now().toString();
    work.createdAt = new Date().toISOString();
    data.works = data.works || [];
    data.works.push(work);
    await CFStorage.set(data);
    return work.id;
  },

  async updateWork(id, work) {
    await this._init();
    const data = await CFStorage.get();
    const index = (data.works || []).findIndex(w => w.id === id);
    if (index !== -1) {
      data.works[index] = { ...data.works[index], ...work };
      await CFStorage.set(data);
    }
  },

  async deleteWork(id) {
    await this._init();
    const data = await CFStorage.get();
    data.works = (data.works || []).filter(w => w.id !== id);
    await CFStorage.set(data);
  },

  // ========== 个人信息 ==========
  async getProfile() {
    await this._init();
    const data = await CFStorage.get();
    return data.profile || null;
  },

  async saveProfile(profile) {
    await this._init();
    const data = await CFStorage.get();
    data.profile = profile;
    await CFStorage.set(data);
  },

  // ========== 类型管理 ==========
  async getTypes() {
    await this._init();
    const data = await CFStorage.get();
    return data.types || ['LOGO', '画册', '传单', '海报', '户型图', '区位图', '其他'];
  },

  async saveTypes(types) {
    await this._init();
    const data = await CFStorage.get();
    data.types = types;
    await CFStorage.set(data);
  },

  // ========== 项目管理 ==========
  async getProjects() {
    await this._init();
    const data = await CFStorage.get();
    return data.projects || [];
  },

  async addProject(project) {
    await this._init();
    const data = await CFStorage.get();
    project.id = Date.now().toString();
    project.createdAt = new Date().toISOString();
    data.projects = data.projects || [];
    data.projects.push(project);
    await CFStorage.set(data);
    return project.id;
  },

  async deleteProject(id) {
    await this._init();
    const data = await CFStorage.get();
    data.projects = (data.projects || []).filter(p => p.id !== id);
    await CFStorage.set(data);
  },

  // ========== 密码管理 ==========
  async verifyPassword(password) {
    await this._init();
    const data = await CFStorage.get();
    return (data.password || 'admin123') === password;
  },

  async getPassword() {
    await this._init();
    const data = await CFStorage.get();
    return data.password || 'admin123';
  },

  async savePassword(pwd) {
    await this._init();
    const data = await CFStorage.get();
    data.password = pwd;
    await CFStorage.set(data);
  },

  // 重置数据
  async resetData() {
    CFStorage.data = null;
    localStorage.removeItem(CLOUDFLARE_CONFIG.localKey);
    this._initialized = false;
    await this._init();
  }
};

// 导出供其他文件使用
window.PortfolioDB = PortfolioDB;

console.log('✅ Cloudflare 配置已加载');
console.log('⚡ 数据存储在本地，零延迟访问');
console.log('🌐 如需云端同步，请部署 Cloudflare Worker');
