(function () {
    const PLUGIN_ID = 'st-advanced-manager';
    let settings = {};
    
    // 默认设置：双通道入口、空分类、空回收站
    const DEFAULT_SETTINGS = {
        entryMode: 'both', 
        worldCategories: {}, 
        presetsCategories: {}, 
        recycleBin: [] 
    };

    // 严谨获取酒馆上下文，防止报错
    const ctx = SillyTavern.getContext?.();
    const eventSource = ctx?.eventSource || window.eventSource;
    const event_types = ctx?.event_types || window.event_types;
    let extSettings = ctx?.extensionSettings || window.extension_settings;

    // 无 emoji 的标准内联 SVG 图标
    const ICON_MANAGE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;

    // 1. 初始化插件数据
    function initSettings() {
        if (!extSettings[PLUGIN_ID]) {
            extSettings[PLUGIN_ID] = {};
        }
        settings = Object.assign({}, DEFAULT_SETTINGS, extSettings[PLUGIN_ID]);
    }

    // 2. 绝对静默保存机制，杜绝刷新
    function savePluginSettings() {
        extSettings[PLUGIN_ID] = settings;
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        }
    }

    // 3. 挂载中央大面板容器 (只会挂载一次)
    function mountUIRoot() {
        if (document.getElementById('st-am-root')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'st-am-overlay';
        
        const root = document.createElement('div');
        root.id = 'st-am-root';
        root.className = 'text_pole';
        root.innerHTML = `
            <div style="padding: 15px; border-bottom: 1px solid var(--SmartThemeBorderColor); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin:0;">📦 高级资源管理器</h3>
                <div class="menu_button st-am-close-btn" style="margin:0;">关闭</div>
            </div>
            <div style="padding: 15px; overflow-y: auto; flex: 1;">
                <p>面板已成功挂载！后续我们将在这里渲染世界书和预设的分类列表。</p>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(root);

        // 事件委托：关闭面板，死死拦住事件穿透
        root.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.st-am-close-btn');
            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                closePanel();
            }
        });
    }

    function openPanel() {
        document.getElementById('st-am-overlay').style.display = 'block';
        document.getElementById('st-am-root').style.display = 'flex';
    }

    function closePanel() {
        document.getElementById('st-am-overlay').style.display = 'none';
        document.getElementById('st-am-root').style.display = 'none';
    }

    // 4. 动态读取 index.html 注入到酒馆侧边栏扩展列表
    async function mountSettingsDrawer() {
        const SETTINGS_ID = 'st-am-extension-settings';
        if (document.getElementById(SETTINGS_ID)) return; 

        try {
            // 尝试读取 HTML，兼容 local 和 third-party 两种安装路径
            let res = await fetch(`/scripts/extensions/third-party/${PLUGIN_ID}/index.html`);
            if (!res.ok) {
                res = await fetch(`/scripts/extensions/local/${PLUGIN_ID}/index.html`);
            }
            if (!res.ok) throw new Error('找不到 index.html 文件');
            
            const html = await res.text();
            
            // 塞进扩展界面
            const extContainer = document.getElementById('extensions_settings');
            if (extContainer) {
                extContainer.insertAdjacentHTML('beforeend', html);
            }

            // 绑定侧边栏交互
            const sel = document.getElementById('st-am-entry-mode');
            if (sel) sel.value = settings.entryMode || 'both';

            // 点击保存设置
            document.getElementById('st-am-save-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                if (sel) settings.entryMode = sel.value;
                savePluginSettings();
                if (typeof toastr !== 'undefined') toastr.success('管理器设置已保存'); 
            });

            // 点击兜底打开按钮
            document.getElementById('st-am-test-open-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                openPanel(); 
            });

        } catch (e) {
            console.warn('[ST-Advanced-Manager] 侧边栏加载失败:', e);
        }
    }

    // 5. 轮询守护注入原生面板（静默修补，绝不刷新）
    function startUIInjection() {
        setInterval(() => {
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                
                // 找图2：世界书面板标题
                const worldInfoHeader = document.querySelector('.world_info_header');
                if (worldInfoHeader && !document.getElementById('st-am-btn-world')) {
                    const btn = document.createElement('div');
                    btn.id = 'st-am-btn-world';
                    btn.className = 'menu_button st-am-native-btn';
                    btn.innerHTML = ICON_MANAGE;
                    btn.title = "高级分类管理";
                    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openPanel(); };
                    worldInfoHeader.appendChild(btn);
                }

                // 找图1：预设面板下拉框旁边
                const presetControl = document.querySelector('#context_presets_controls');
                if (presetControl && !document.getElementById('st-am-btn-preset')) {
                    const btn = document.createElement('div');
                    btn.id = 'st-am-btn-preset';
                    btn.className = 'menu_button st-am-native-btn';
                    btn.innerHTML = ICON_MANAGE;
                    btn.title = "高级分类管理";
                    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openPanel(); };
                    presetControl.appendChild(btn);
                }
            } else {
                // 如果用户选择了只用魔法棒，我们要负责把原生面板上的按钮清掉
                document.getElementById('st-am-btn-world')?.remove();
                document.getElementById('st-am-btn-preset')?.remove();
            }
        }, 1500);
    }

    // --- 核心执行域 ---
    function init() {
        initSettings();
        mountUIRoot();
        mountSettingsDrawer();
        startUIInjection();
        console.log('[ST-Advanced-Manager] 初始化完成，彻底无刷新安全挂载！');
    }

    // 幂等启动锁：保证酒馆抽风也不会加载两次
    let done = false;
    const fire = () => { 
        if(done) return; 
        done = true; 
        try { init(); } catch(e) { console.warn('[ST-Advanced-Manager] 致命错误:', e); } 
    };

    if (eventSource && event_types && event_types.APP_READY) {
        eventSource.on(event_types.APP_READY, fire);
    }
    const t0 = Date.now();
    const iv = setInterval(() => { 
        const ok = !!(window.extension_settings || window.SillyTavern); 
        if (ok || Date.now() - t0 > 3500) { clearInterval(iv); fire(); } 
    }, 250);

})();
