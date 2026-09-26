(function () {
    const FOLDER_NAME = 'Explorer-NFL'; 
    const PLUGIN_ID = 'Explorer-NFL';
    let settings = {};

    const ctx = SillyTavern.getContext?.();
    const eventSource = ctx?.eventSource || window.eventSource;
    const event_types = ctx?.event_types || window.event_types;
    let extSettings = ctx?.extensionSettings || window.extension_settings;

    if (!extSettings[PLUGIN_ID]) {
        extSettings[PLUGIN_ID] = { entryMode: 'both', worldCategories: {}, presetsCategories: {}, recycleBin: [] };
    }
    settings = extSettings[PLUGIN_ID];

    const ICON_MANAGE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;

    const mountUIRoot = () => {
        if ($("#st-am-root").length) return;
        const html = `
            <div id="st-am-overlay"></div>
            <div id="st-am-root" class="text_pole">
                <div class="st-am-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--SmartThemeBorderColor);">
                    <h3 style="margin:0; font-size:1.1em; color:var(--SmartThemeBodyColor, #222);">📦 高级资源管理器</h3>
                    <div class="menu_button st-am-close-btn" style="margin:0; min-width:60px;">关闭</div>
                </div>
                <div class="st-am-content" style="padding:15px; overflow-y:auto; flex:1; color:var(--SmartThemeBodyColor, #222);">
                    <p style="font-weight:bold; margin-bottom:10px;">✅ 核心挂载成功：基础运行环境已打通。</p>
                    <p style="opacity:0.8; font-size:0.9em;">已成功获取预设与世界书挂载点，下一步将在此渲染分类标签与批量勾选框。</p>
                </div>
            </div>
        `;
        $("body").append(html);

        $(document).off("click.stAmClose").on("click.stAmClose", ".st-am-close-btn", function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            $("#st-am-overlay, #st-am-root").hide();
        });
    };

    const startUIInjection = () => {
        setInterval(() => {
            // 1. 原生面板注入 (使用探针确认的 #context_presets 和 #world_info)
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                // 预设面板：精准挂载在 #context_presets 元素下方
                const presetSelect = $('#context_presets');
                if (presetSelect.length && !$('#st-am-btn-preset').length) {
                    presetSelect.after(`<div id="st-am-btn-preset" class="st-am-native-btn" style="display:inline-flex; width:100%; margin:8px 0; box-sizing:border-box; justify-content:center;">${ICON_MANAGE} 批量管理预设</div>`);
                }

                // 世界书面板：精准挂载在 #world_info 的首个标题或顶部
                const worldBox = $('#world_info');
                if (worldBox.length && !$('#st-am-btn-world').length) {
                    const worldHeader = worldBox.find('.inline-drawer-header, h3').first();
                    if (worldHeader.length) {
                        worldHeader.append(`<div id="st-am-btn-world" class="st-am-native-btn" style="margin-left:auto;">${ICON_MANAGE} 资源管理</div>`);
                    } else {
                        worldBox.prepend(`<div id="st-am-btn-world" class="st-am-native-btn" style="margin:8px 0;">${ICON_MANAGE} 批量管理世界书</div>`);
                    }
                }
            } else {
                $('#st-am-btn-world, #st-am-btn-preset').remove();
            }

            // 2. 魔法棒菜单注入：监听原生插件菜单弹出层
            if (settings.entryMode === 'magic' || settings.entryMode === 'both') {
                const pluginMenu = $('#chat_plugins_list, .chat_plugins_list, #chat_plugins_dropdown');
                if (pluginMenu.length && !$('#st-am-btn-magic').length) {
                    pluginMenu.append(`<div id="st-am-btn-magic" class="st-am-native-btn" style="width:100%; margin:4px 0; box-sizing:border-box;">${ICON_MANAGE} 资源管理器</div>`);
                }
            } else {
                $('#st-am-btn-magic').remove();
            }
        }, 1200);

        // 统一委托点击事件
        $(document).off("click.stAmBtn").on("click.stAmBtn", ".st-am-native-btn", function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            $("#st-am-overlay").show();
            $("#st-am-root").css("display", "flex");
            $('#chat_plugins_list, .chat_plugins_list').hide();
        });
    };

    jQuery(async () => {
        mountUIRoot();
        startUIInjection();

        try {
            let htmlFile = '';
            try {
                htmlFile = await $.get(`/scripts/extensions/third-party/${FOLDER_NAME}/index.html`);
            } catch (e1) {
                htmlFile = await $.get(`/scripts/extensions/local/${FOLDER_NAME}/index.html`);
            }

            const timer = setInterval(() => {
                if ($("#extensions_settings").length && !$("#st-am-extension-settings").length) {
                    $("#extensions_settings").append(htmlFile);

                    if (settings.entryMode) $("#st-am-entry-mode").val(settings.entryMode);

                    $("#st-am-save-btn").off("click").on("click", (e) => { 
                        e.preventDefault(); 
                        e.stopPropagation();
                        settings.entryMode = $("#st-am-entry-mode").val();
                        if (typeof window.saveSettingsDebounced === 'function') window.saveSettingsDebounced();
                        if (typeof toastr !== 'undefined') toastr.success("设置已保存！"); 
                    });

                    $("#st-am-test-open-btn").off("click").on("click", (e) => {
                        e.preventDefault(); 
                        e.stopPropagation();
                        $("#st-am-overlay").show();
                        $("#st-am-root").css("display", "flex");
                    });

                    clearInterval(timer);
                }
            }, 500);
        } catch (err) {
            console.warn(`[${PLUGIN_ID}] 侧边栏加载失败。`, err);
        }
    });
})();
