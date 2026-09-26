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

    const mountUIRoot = () => {
        if ($("#st-am-root").length) return;
        const html = `
            <div id="st-am-overlay"></div>
            <div id="st-am-root" class="text_pole">
                <div class="st-am-header">
                    <h3 style="margin:0; font-size:1.1em;">📦 高级资源管理器</h3>
                    <div class="menu_button st-am-close-btn" style="margin:0; min-width:60px;">关闭</div>
                </div>
                <div class="st-am-content">
                    <p>✅ 面板已成功挂载！(如果你看到这段文字，说明 CSS 已生效，白屏危机解除)</p>
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
            // A. 原生面板按钮
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                const worldHeader = $('.world_info_header');
                if (worldHeader.length && !$('#st-am-btn-world').length) {
                    worldHeader.append(`<div id="st-am-btn-world" class="st-am-native-btn" title="高级分类管理">${ICON_MANAGE}</div>`);
                }
                const presetControl = $('#context_presets').parent(); 
                if (presetControl.length && !$('#st-am-btn-preset').length) {
                    presetControl.after(`<div id="st-am-btn-preset" class="st-am-native-btn" style="margin-top: 10px;">${ICON_MANAGE} 资源管理</div>`);
                }
            } else {
                $('#st-am-btn-world, #st-am-btn-preset').remove();
            }

            // B. 魔法棒菜单按钮 (查找ID)
            if (settings.entryMode === 'magic' || settings.entryMode === 'both') {
                const magicMenu = $('#extensions_menu');
                if (magicMenu.length && !$('#st-am-btn-magic').length) {
                    magicMenu.append(`<div id="st-am-btn-magic" class="st-am-native-btn" style="width: 90%; margin: 5px auto;">${ICON_MANAGE} 资源管理</div>`);
                }
            } else {
                $('#st-am-btn-magic').remove();
            }
        }, 1500);

        $(document).off("click.stAmBtn").on("click.stAmBtn", ".st-am-native-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-overlay").show();
            $("#st-am-root").css("display", "flex");
            $('#extensions_menu').hide(); 
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
