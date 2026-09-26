// 采用自执行函数包裹，避免变量污染全局
(function () {
    const PLUGIN_ID = 'st-advanced-manager';
    let settings = {};
    const DEFAULT_SETTINGS = {
        entryMode: 'both', // 入口模式：'native'(原生面板), 'magic'(魔法棒), 'both'(双开)
        worldCategories: {}, // 世界书分类数据
        presetsCategories: {}, // 预设分类数据
        recycleBin: [] // 回收站
    };

    // 安全获取上下文
    const ctx = SillyTavern.getContext?.();
    const eventSource = ctx?.eventSource || window.eventSource;
    const event_types = ctx?.event_types || window.event_types;
    let extSettings = ctx?.extensionSettings || window.extension_settings;

    // SVG 图标 (内联无 emoji)
    const ICON_MANAGE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;

    // 初始化数据
    function initSettings() {
        if (!extSettings[PLUGIN_ID]) {
            extSettings[PLUGIN_ID] = {};
        }
        settings = Object.assign({}, DEFAULT_SETTINGS, extSettings[PLUGIN_ID]);
    }

    // 保存设置 (绝对无刷新)
    function savePluginSettings() {
        extSettings[PLUGIN_ID] = settings;
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        }
    }

    // 挂载主控面板到底层 (只挂载一次)
    function mountUIRoot() {
        if (document.getElementById('st-am-root')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'st-am-overlay';
        
        const root = document.createElement('div');
        root.id = 'st-am-root';
        root.className = 'text_pole';
        root.innerHTML = `
            <div style="padding: 15px; border-bottom: 1px solid var(--SmartThemeBorderColor); display: flex; justify-content: space-between;">
                <h3>📦 高级资源管理器</h3>
                <div class="menu_button st-am-close-btn" style="margin:0;">关闭</div>
            </div>
            <div style="padding: 15px; overflow-y: auto; flex: 1;">
                <p>面板已成功挂载！后续我们将在这里渲染世界书和预设的分类列表。</p>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(root);

        // 事件委托：关闭按钮，绝对阻断刷新穿透
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

    // 轮询注入原生面板 (智能防刷掉)
    function startUIInjection() {
        setInterval(() => {
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                // 1. 注入世界书面板 (图2)
                const worldInfoHeader = document.querySelector('.world_info_header');
                if (worldInfoHeader && !document.getElementById('st-am-btn-world')) {
                    const btn = document.createElement('div');
                    btn.id = 'st-am-btn-world';
                    btn.className = 'menu_button st-am-native-btn';
                    btn.innerHTML = ICON_MANAGE;
                    btn.title = "高级分类管理";
                    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openPanel(); };
                    // 插在标题区域
                    worldInfoHeader.appendChild(btn);
                }

                // 2. 注入预设面板 (图1 - 找预设下拉框旁边的容器)
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
            }
        }, 1500); // 每1.5秒检查一次，掉了就补上
    }

    // 核心初始化
    function init() {
        initSettings();
        mountUIRoot();
        startUIInjection();
        console.log('[ST-Advanced-Manager] 初始化完成，数据已挂载。');
    }

    // 幂等启动 (交底文档铁律)
    let done = false;
    const fire = () => { 
        if(done) return; 
        done = true; 
        try { init(); } catch(e) { console.warn('[ST-Advanced-Manager] 初始化失败:', e); } 
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
