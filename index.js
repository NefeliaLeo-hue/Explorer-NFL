(function () {
    // 
    const FOLDER_NAME = 'Explorer-NFL'; 
    const PLUGIN_ID = 'st-advanced-manager';
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

    const mountUIRoot = () => {
        if ($("#st-am-root").length) return;
        const html = `
            <div id="st-am-overlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:1999999; display:none;"></div>
            <div id="st-am-root" class="text_pole" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:90vw; max-width:800px; height:85vh; background:var(--SmartThemeBlurTintColor); backdrop-filter:blur(10px); border:1px solid var(--SmartThemeBorderColor); border-radius:10px; z-index:2000000; display:none; flex-direction:column; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                <div style="padding: 15px; border-bottom: 1px solid var(--SmartThemeBorderColor); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0;">📦 高级资源管理器</h3>
                    <div class="menu_button st-am-close-btn" style="margin:0;">关闭</div>
                </div>
                <div style="padding: 15px; overflow-y: auto; flex: 1;">
                    <p>面板已成功挂载！后续我们将在这里渲染世界书和预设的分类列表。</p>
                </div>
            </div>
        `;
        $("body").append(html);

        $(document).off("click.stAmClose").on("click.stAmClose", ".st-am-close-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-overlay, #st-am-root").hide();
        });
    };

    const startUIInjection = () => {
        setInterval(() => {
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                const worldHeader = $('.world_info_header');
                if (worldHeader.length && !$('#st-am-btn-world').length) {
                    worldHeader.append(`<div id="st-am-btn-world" class="menu_button st-am-native-btn" title="高级分类管理">${ICON_MANAGE}</div>`);
                }
                const presetControl = $('#context_presets_controls');
                if (presetControl.length && !$('#st-am-btn-preset').length) {
                    presetControl.append(`<div id="st-am-btn-preset" class="menu_button st-am-native-btn" title="高级分类管理">${ICON_MANAGE}</div>`);
                }
            } else {
                $('#st-am-btn-world, #st-am-btn-preset').remove();
            }
        }, 1500);

        $(document).off("click.stAmBtn").on("click.stAmBtn", ".st-am-native-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-overlay").show();
            $("#st-am-root").css("display", "flex");
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
                        e.preventDefault(); e.stopPropagation();
                        settings.entryMode = $("#st-am-entry-mode").val();
                        if (typeof window.saveSettingsDebounced === 'function') window.saveSettingsDebounced();
                        if (typeof toastr !== 'undefined') toastr.success("设置已保存！"); 
                    });

                    $("#st-am-test-open-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
                        $("#st-am-overlay").show();
                        $("#st-am-root").css("display", "flex");
                    });
                    
                    clearInterval(timer);
                    console.log(`[${PLUGIN_ID}] 侧边栏初始化完成。`);
                }
            }, 500);
        } catch (err) {
            console.warn(`[${PLUGIN_ID}] 侧边栏加载失败，请检查文件路径。`, err);
        }
    });
})();
