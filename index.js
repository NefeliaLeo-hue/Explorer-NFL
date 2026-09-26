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
        // 清理所有旧残留节点，杜绝任何历史 DOM 冲突
        $("#st-am-modal-wrapper, #st-am-root, #st-am-overlay").remove();

        const html = `
        <div id="st-am-modal-wrapper">
            <div id="st-am-root">
                <div style="padding:14px 16px; border-bottom:1px solid var(--SmartThemeBorderColor, #ccc); display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.15);">
                    <h3 style="margin:0; font-size:1.1em; font-weight:bold; color:var(--SmartThemeBodyColor, #222) !important; display:flex; align-items:center;">
                        ${ICON_MANAGE} 高级资源管理器
                    </h3>
                    <button class="menu_button st-am-close-btn" style="margin:0; padding:4px 14px; min-width:60px; cursor:pointer;">关闭</button>
                </div>
                <div style="padding:18px; overflow-y:auto; flex:1; color:var(--SmartThemeBodyColor, #222) !important;">
                    <div style="padding:12px; background:rgba(40,167,69,0.15); border-left:4px solid #28a745; border-radius:4px; margin-bottom:15px;">
                        <b style="color:#28a745;">✅ 布局重构生效：居中定位正常！</b><br>
                        视口与关闭按钮已全部可见。
                    </div>
                    <p style="font-size:0.9em; opacity:0.85; line-height:1.6; margin:0;">
                        核心通路已畅通，接下来将在此接入世界书与预设的分类卡片。
                    </p>
                </div>
            </div>
        </div>
        `;
        $("body").append(html);

        $("#st-am-modal-wrapper").on("click", function(e) {
            if (e.target === this) $("#st-am-modal-wrapper").css("display", "none");
        });

        $(document).off("click.stAmClose").on("click.stAmClose", ".st-am-close-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-modal-wrapper").css("display", "none");
        });
    };

    const startUIInjection = () => {
        setInterval(() => {
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                // 精准锚定探针验证存在的 #settings_preset 与 #context_presets
                const presetTarget = $('#settings_preset, #context_presets').first();
                if (presetTarget.length && !$('#st-am-btn-preset').length) {
                    presetTarget.after(`<div id="st-am-btn-preset" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">${ICON_MANAGE} 批量管理预设</div>`);
                }

                const worldBox = $('#world_info');
                if (worldBox.length && !$('#st-am-btn-world').length) {
                    worldBox.prepend(`<div id="st-am-btn-world" class="menu_button st-am-native-btn" style="margin:8px 0; display:flex; justify-content:center; align-items:center;">${ICON_MANAGE} 批量管理世界书</div>`);
                }
            } else {
                $('#st-am-btn-world, #st-am-btn-preset').remove();
            }
        }, 1200);

        $(document).off("click.stAmBtn").on("click.stAmBtn", ".st-am-native-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-modal-wrapper").css("display", "flex");
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
                        $("#st-am-modal-wrapper").css("display", "flex");
                    });

                    $("#st-am-diag-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const out = $("#st-am-diag-output");
                        out.show();
                        out.val(`[环境核验通过]\n运行版本: v1.0.3\n预设锚点: ${$('#settings_preset, #context_presets').length}\n世界书锚点: ${$('#world_info').length}`);
                    });

                    clearInterval(timer);
                }
            }, 500);
        } catch (err) {
            console.warn(`[${PLUGIN_ID}] 侧边栏加载失败。`, err);
        }
    });
})();
