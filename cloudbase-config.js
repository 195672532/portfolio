/**
 * 云存储配置 - Supabase 版本
 * 使用 Supabase 实现跨设备数据同步
 */

// ========== Supabase 配置 ==========
const SUPABASE_CONFIG = {
  url: 'https://bpwbrssyqlkmogneojox.supabase.co',
  anonKey: 'sb_publishable_kEc880Wafiz6Z3D8PONgEg_7lhRbQkQ',
  tables: {
    profile: 'profile',
    works: 'works',
    projects: 'projects'
  }
};

// ========== 数据存储核心 ==========
const PortfolioDB = {
  _initialized: false,
  _localMode: false,  // 是否本地模式（Supabase 配置未设置时）
  
  // 初始化
  async _init() {
    if (this._initialized) return;
    
    // 检查是否配置了 Supabase
    if (SUPABASE_CONFIG.url.includes('your-project') || 
        SUPABASE_CONFIG.anonKey.includes('your-anon')) {
      console.warn('⚠️ Supabase 未配置，使用本地存储模式');
      this._localMode = true;
    } else {
      console.log('✅ Supabase 云存储已配置');
      this._localMode = false;
    }
    
    // 本地初始化默认数据
    await this._initLocalData();
    
    this._initialized = true;
  },
  
  // 本地初始化
  async _initLocalData() {
    const keys = {
      profile: 'portfolio_profile',
      works: 'portfolio_works',
      projects: 'portfolio_projects',
      types: 'portfolio_types',
      password: 'admin_password'
    };
    
    // 默认个人资料
    if (!localStorage.getItem(keys.profile)) {
      localStorage.setItem(keys.profile, JSON.stringify({
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
      }));
    }
    
    // 默认作品类型
    if (!localStorage.getItem(keys.types)) {
      localStorage.setItem(keys.types, JSON.stringify(['LOGO', '画册', '传单', '海报', '户型图', '区位图', '其他']));
    }
    
    // 默认密码
    if (!localStorage.getItem(keys.password)) {
      localStorage.setItem(keys.password, 'admin123');
    }
    
    // 默认作品列表
    if (!localStorage.getItem(keys.works)) {
      localStorage.setItem(keys.works, JSON.stringify([]));
    }
    
    // 默认项目列表
    if (!localStorage.getItem(keys.projects)) {
      localStorage.setItem(keys.projects, JSON.stringify([]));
    }
  },
  
  // ========== Supabase API 调用 ==========
  async _supabaseRequest(table, method, data = null, id = null) {
    // 构建 URL - Supabase REST API 格式
    let url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
    if (id && method !== 'POST') {
      url += `?id=eq.${encodeURIComponent(id)}`;
    }
    
    const options = {
      method: method,
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // 添加 Prefer 头
    if (method === 'POST') {
      options.headers['Prefer'] = 'return=representation';
    } else if (method === 'PATCH') {
      options.headers['Prefer'] = 'return=minimal';
    }
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      // 204 No Content 或 200 OK 都视为成功
      if (response.status === 204) {
        return { success: true };
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase 错误响应:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 空响应处理
      const text = await response.text();
      return text ? JSON.parse(text) : [];
    } catch (e) {
      console.error('Supabase 请求失败:', e);
      throw e;
    }
  },
  
  // ========== 个人信息 ==========
  async getProfile() {
    await this._init();
    
    // 如果配置了 Supabase，优先从云端获取
    if (!this._localMode) {
      try {
        const data = await this._supabaseRequest(SUPABASE_CONFIG.tables.profile, 'GET');
        if (data && data.length > 0) {
          // 保存到本地缓存
          localStorage.setItem('portfolio_profile', JSON.stringify(data[0]));
          return data[0];
        }
      } catch (e) {
        console.warn('从云端获取个人资料失败，使用本地数据:', e);
      }
    }
    
    // 本地模式或云端获取失败
    const local = localStorage.getItem('portfolio_profile');
    return local ? JSON.parse(local) : null;
  },
  
  async saveProfile(profile) {
    await this._init();
    
    // 保存到本地
    localStorage.setItem('portfolio_profile', JSON.stringify(profile));
    
    // 如果配置了 Supabase，同步到云端
    if (!this._localMode) {
      try {
        // 先查询是否已有记录
        const existing = await this._supabaseRequest(SUPABASE_CONFIG.tables.profile, 'GET');
        
        if (existing && existing.length > 0) {
          // 更新
          await this._supabaseRequest(
            SUPABASE_CONFIG.tables.profile, 
            'PATCH', 
            profile, 
            existing[0].id
          );
        } else {
          // 新建
          await this._supabaseRequest(
            SUPABASE_CONFIG.tables.profile, 
            'POST', 
            { ...profile, id: Date.now().toString() }
          );
        }
        console.log('✅ 个人资料已同步到云端');
      } catch (e) {
        console.warn('同步到云端失败:', e);
        // 标记需要同步
        localStorage.setItem('portfolio_sync_pending', 'true');
      }
    }
    
    return true;
  },
  
  // ========== 作品管理 ==========
  async getWorks() {
    await this._init();
    
    // 如果配置了 Supabase，优先从云端获取
    if (!this._localMode) {
      try {
        const data = await this._supabaseRequest(SUPABASE_CONFIG.tables.works, 'GET');
        if (data && data.length > 0) {
          localStorage.setItem('portfolio_works', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn('从云端获取作品失败，使用本地数据:', e);
      }
    }
    
    const local = localStorage.getItem('portfolio_works');
    return local ? JSON.parse(local) : [];
  },
  
  async saveWorks(works) {
    await this._init();
    
    // 保存到本地
    localStorage.setItem('portfolio_works', JSON.stringify(works));
    
    // 如果配置了 Supabase，同步到云端
    if (!this._localMode) {
      try {
        // 删除云端所有作品，重新插入
        const existing = await this._supabaseRequest(SUPABASE_CONFIG.tables.works, 'GET');
        for (const item of existing || []) {
          await this._supabaseRequest(SUPABASE_CONFIG.tables.works, 'DELETE', null, item.id);
        }
        
        // 插入新数据
        for (const work of works) {
          await this._supabaseRequest(
            SUPABASE_CONFIG.tables.works, 
            'POST', 
            { ...work, id: work.id || Date.now().toString() }
          );
        }
        console.log('✅ 作品已同步到云端');
      } catch (e) {
        console.warn('同步作品到云端失败:', e);
        localStorage.setItem('portfolio_sync_pending', 'true');
      }
    }
    
    return true;
  },
  
  async addWork(work) {
    const works = await this.getWorks();
    work.id = Date.now().toString();
    work.createdAt = new Date().toISOString();
    works.push(work);
    await this.saveWorks(works);
    return work.id;
  },
  
  async updateWork(id, updates) {
    const works = await this.getWorks();
    const idx = works.findIndex(w => w.id === id);
    if (idx !== -1) {
      works[idx] = { ...works[idx], ...updates };
      await this.saveWorks(works);
      return true;
    }
    return false;
  },
  
  async deleteWork(id) {
    const works = await this.getWorks();
    const filtered = works.filter(w => w.id !== id);
    await this.saveWorks(filtered);
    return true;
  },
  
  // ========== 项目管理 ==========
  async getProjects() {
    await this._init();
    
    if (!this._localMode) {
      try {
        const data = await this._supabaseRequest(SUPABASE_CONFIG.tables.projects, 'GET');
        if (data && data.length > 0) {
          localStorage.setItem('portfolio_projects', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn('从云端获取项目失败，使用本地数据:', e);
      }
    }
    
    const local = localStorage.getItem('portfolio_projects');
    return local ? JSON.parse(local) : [];
  },
  
  async saveProjects(projects) {
    await this._init();
    
    localStorage.setItem('portfolio_projects', JSON.stringify(projects));
    
    if (!this._localMode) {
      try {
        const existing = await this._supabaseRequest(SUPABASE_CONFIG.tables.projects, 'GET');
        for (const item of existing || []) {
          await this._supabaseRequest(SUPABASE_CONFIG.tables.projects, 'DELETE', null, item.id);
        }
        
        for (const project of projects) {
          await this._supabaseRequest(
            SUPABASE_CONFIG.tables.projects, 
            'POST', 
            { ...project, id: project.id || Date.now().toString() }
          );
        }
        console.log('✅ 项目已同步到云端');
      } catch (e) {
        console.warn('同步项目到云端失败:', e);
        localStorage.setItem('portfolio_sync_pending', 'true');
      }
    }
    
    return true;
  },
  
  async addProject(project) {
    const projects = await this.getProjects();
    project.id = Date.now().toString();
    project.createdAt = new Date().toISOString();
    projects.push(project);
    await this.saveProjects(projects);
    return project.id;
  },
  
  async updateProject(id, updates) {
    const projects = await this.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], ...updates };
      await this.saveProjects(projects);
      return true;
    }
    return false;
  },
  
  async deleteProject(id) {
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    await this.saveProjects(filtered);
    return true;
  },
  
  // ========== 作品类型 ==========
  async getTypes() {
    await this._init();
    
    const local = localStorage.getItem('portfolio_types');
    return local ? JSON.parse(local) : ['LOGO', '画册', '传单', '海报', '户型图', '区位图', '其他'];
  },
  
  async saveTypes(types) {
    await this._init();
    localStorage.setItem('portfolio_types', JSON.stringify(types));
    return true;
  },
  
  // ========== 密码管理 ==========
  async getPassword() {
    await this._init();
    return localStorage.getItem('admin_password') || 'admin123';
  },
  
  async setPassword(password) {
    await this._init();
    localStorage.setItem('admin_password', password);
    return true;
  },
  
  // ========== 数据导出/导入 ==========
  async exportAllData() {
    const data = {
      profile: await this.getProfile(),
      works: await this.getWorks(),
      projects: await this.getProjects(),
      types: await this.getTypes(),
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    return data;
  },
  
  async importAllData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.profile) await this.saveProfile(data.profile);
      if (data.works) await this.saveWorks(data.works);
      if (data.projects) await this.saveProjects(data.projects);
      if (data.types) await this.saveTypes(data.types);
      
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  // 从文件导入
  async importFromFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve({ success: false, error: '未选择文件' });
          return;
        }
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          const result = await this.importAllData(event.target.result);
          resolve(result);
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },
  
  // ========== 手动同步（当配置好 Supabase 后） ==========
  async syncToCloud() {
    if (this._localMode) {
      console.warn('Supabase 未配置，无法同步');
      return { success: false, error: '未配置云存储' };
    }
    
    try {
      const profile = await this.getProfile();
      const works = await this.getWorks();
      const projects = await this.getProjects();
      
      await this.saveProfile(profile);
      await this.saveWorks(works);
      await this.saveProjects(projects);
      
      localStorage.removeItem('portfolio_sync_pending');
      console.log('✅ 所有数据已同步到云端');
      return { success: true };
    } catch (e) {
      console.error('同步失败:', e);
      return { success: false, error: e.message };
    }
  },
  
  // 强制从云端拉取
  async syncFromCloud() {
    if (this._localMode) {
      console.warn('Supabase 未配置，无法同步');
      return { success: false, error: '未配置云存储' };
    }
    
    try {
      // 清除本地缓存，强制从云端获取
      const profile = await this._supabaseRequest(SUPABASE_CONFIG.tables.profile, 'GET');
      if (profile && profile.length > 0) {
        localStorage.setItem('portfolio_profile', JSON.stringify(profile[0]));
      }
      
      const works = await this._supabaseRequest(SUPABASE_CONFIG.tables.works, 'GET');
      if (works) {
        localStorage.setItem('portfolio_works', JSON.stringify(works));
      }
      
      const projects = await this._supabaseRequest(SUPABASE_CONFIG.tables.projects, 'GET');
      if (projects) {
        localStorage.setItem('portfolio_projects', JSON.stringify(projects));
      }
      
      console.log('✅ 已从云端拉取最新数据');
      return { success: true };
    } catch (e) {
      console.error('拉取失败:', e);
      return { success: false, error: e.message };
    }
  }
};

// 导出
window.PortfolioDB = PortfolioDB;

console.log('✅ 云存储配置已加载（Supabase 模式）');
console.log('💡 如需启用跨设备同步，请配置 SUPABASE_CONFIG');
