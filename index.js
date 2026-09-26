// 动态加载并注入侧边栏 HTML
    async function mountSettingsDrawer() {
        const SETTINGS_ID = 'st-am-extension-settings';
        if (document.getElementById(SETTINGS_ID)) return; // 防重复加载

        try {
            // 读取我们刚才写的 index.html (注意文件夹名字必须是 st-advanced-manager)
            const htmlPath = `/scripts/extensions/third-party/${PLUGIN_ID}/index.html`;
            const res = await fetch(htmlPath);
            if (!res.ok) throw new Error('HTML文件未找到');
            const html = await res.text();
            
            // 塞进酒馆自带的扩展设置容器里
            const extContainer = document.getElementById('extensions_settings');
            if (extContainer) {
                extContainer.insertAdjacentHTML('beforeend', html);
            }

            // --- 绑定事件 (绝对阻断刷新) ---
            const sel = document.getElementById('st-am-entry-mode');
            if (sel) sel.value = settings.entryMode || 'both';

            // 保存按钮
            document.getElementById('st-am-save-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                settings.entryMode = sel.value;
                savePluginSettings();
                if(typeof toastr !== 'undefined') toastr.success('管理器设置已保存'); // 呼出酒馆原生绿条提示
            });

            // 测试打开按钮 (兜底入口)
            document.getElementById('st-am-test-open-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                openPanel(); // 呼出屏幕正中央的大面板
            });

        } catch (e) {
            console.warn('[ST-Advanced-Manager] 侧边栏加载失败:', e);
        }
    }
