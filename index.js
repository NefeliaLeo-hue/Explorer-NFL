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

    const ICON_MANAGE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;

    // 1. 动态注入缺失的 CSS 样式（解决按钮隐形、白屏看不见字的问题）
    if (!document.getElementById('st-am-styles')) {
        const style = document.createElement('style');
        style.id = 'st-am-styles';
        style.innerHTML = `
            .st-am-native-btn { cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; margin: 4px; border-radius: 6px; background: rgba(128,128,128,0.15); color: var(--SmartThemeBodyColor); border: 1px solid var(--SmartThemeBorderColor); }
            .st-am-native-btn:hover { background: rgba(128,128,128,0.3); }
            .st-am-native-btn svg { width: 1.2em; height: 1.2em; stroke: currentColor; margin-right: 5px; }
            #st-am-root { color: var(--SmartThemeBodyColor); background-color: var(--SmartThemeBlurTintColor); }
        `;
        document.head.appendChild(style);
    }

    // 2. 挂载主面板（修复浅色主题下的颜色丢失）
    const mountUIRoot = () => {
        if ($("#st-am-root").length) return;
        const html = `
            <div id="st-am-overlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:1999999; display:none;"></div>
            <div id="st-am-root" class="text_pole" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:90vw; max-width:800px; height:85vh; border:1px solid var(--SmartThemeBorderColor); border-radius:10px; z-index:2000000; display:none; flex-direction:column; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                <div style="padding: 15px; border-bottom: 1px solid var(--SmartThemeBorderColor); display: flex; justify-content: space-between; align-items: center; background: rgba(128,128,128,0.1); border-top-left-radius: 10px; border-top-right-radius: 10px;">
                    <h3 style="margin:0; font-size:1.1em; color:var(--SmartThemeBodyColor);">📦 高级资源管理器</h3>
                    <div class="menu_button st-am-close-btn" style="margin:0; min-width:60px;">关闭</div>
                </div>
                <div style="padding: 15px; overflow-y: auto; flex: 1; color: var(--SmartThemeBodyColor);">
                    <p>✅ 面板已成功挂载！如果你能看到这段文字，说明白屏危机已解除。</p>
                </div>
            </div>
        `;
        $("body").append(html);

        $(document).off("click.stAmClose").on("click.stAmClose", ".st-am-close-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-overlay, #st-am-root").hide();
        });
    };

    // 3. 定时器轮询注入原生按钮 & 魔法棒菜单
    const startUIInjection = () => {
        setInterval(() => {
            // A. 注入原生面板 (图1和图2)
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                // 找世界书标题栏
                const worldHeader = $('.world_info_header, #world_info_panel .panel-heading').first();
                if (worldHeader.length && !$('#st-am-btn-world').length) {
                    worldHeader.append(`<div id="st-am-btn-world" class="st-am-native-btn" title="高级分类管理">${ICON_MANAGE} 资源管理</div>`);
                }
                // 找预设下拉框附近
                const presetControl = $('#context_presets_controls, #context_presets').parent();
                if (presetControl.length && !$('#st-am-btn-preset').length) {
                    presetControl.prepend(`<div id="st-am-btn-preset" class="st-am-native-btn" style="display:flex; margin-bottom:10px;">${ICON_MANAGE} 资源管理</div>`);
                }
            } else {
                $('#st-am-btn-world, #st-am-btn-preset').remove();
            }

            // B. 注入魔法棒 (图3的菜单列表)
            if (settings.entryMode === 'magic' || settings.entryMode === 'both') {
                const magicMenu = $('#extensions_menu, #chat_plus_menu').first();
                if (magicMenu.length && !$('#st-am-btn-magic').length) {
                    magicMenu.append(`<div id="st-am-btn-magic" class="st-am-native-btn" style="display:flex; width:90%; margin: 5px auto;">${ICON_MANAGE} 资源管理器</div>`);
                }
            } else {
                $('#st-am-btn-magic').remove();
            }
        }, 1500);

        // 统一绑定所有唤出按钮的点击事件
        $(document).off("click.stAmBtn").on("click.stAmBtn", ".st-am-native-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-overlay").show();
            $("#st-am-root").css("display", "flex");
            // 如果是从魔法棒点开的，顺手把魔法棒菜单收起来
            $('#extensions_menu, #chat_plus_menu').hide(); 
        });
    };

    // 4. 启动逻辑
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
                        e.preventDefault(); e.stopPropagation();
                        settings.entryMode = $("#st-am-entry-mode").val();
                        if (typeof window.saveSettingsDebounced === 'function') window.saveSettingsDebounced();
                        if (typeof toastr !== 'undefined') toastr.success("入口设置已保存！"); 
                    });

                    $("#st-am-test-open-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
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
