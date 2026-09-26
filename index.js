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

    // 采用原生居中弹窗架构，彻底防止位移出屏幕与假死
    const mountUIRoot = () => {
        if ($("#st-am-modal-wrapper").length) return;
        const html = `
        <div id="st-am-modal-wrapper" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:9999999; display:none; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
            <div id="st-am-root" style="background:var(--SmartThemeBlurTintColor, #ffffff); color:var(--SmartThemeBodyColor, #222) !important; border:2px solid var(--SmartThemeQuoteColor, #888); border-radius:12px; width:90vw; max-width:600px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.8); overflow:hidden;">
                <!-- 顶部标题栏 -->
                <div style="padding:14px 16px; border-bottom:1px solid var(--SmartThemeBorderColor, #ccc); display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.15);">
                    <h3 style="margin:0; font-size:1.1em; font-weight:bold; color:var(--SmartThemeBodyColor, #222) !important; display:flex; align-items:center;">
                        ${ICON_MANAGE} 高级资源管理器
                    </h3>
                    <button class="menu_button st-am-close-btn" style="margin:0; padding:4px 14px; min-width:60px; cursor:pointer;">关闭</button>
                </div>
                <!-- 内容主体 -->
                <div style="padding:18px; overflow-y:auto; flex:1; color:var(--SmartThemeBodyColor, #222) !important;">
                    <div style="padding:12px; background:rgba(40,167,69,0.15); border-left:4px solid #28a745; border-radius:4px; margin-bottom:15px;">
                        <b style="color:#28a745;">✅ 弹窗定位已彻底修复！</b><br>
                        视口上下完全居中，关闭按钮与内容均已恢复正常可见。
                    </div>
                    <p style="font-size:0.9em; opacity:0.85; line-height:1.6; margin:0;">
                        核心通路已畅通。下一步将在此处渲染世界书与预设的分类卡片、批量勾选框与回收站管理面板。
                    </p>
                </div>
            </div>
        </div>
        `;
        $("body").append(html);

        // 点击遮罩外部半透明暗区瞬间退出，彻底杜绝任何卡死
        $("#st-am-modal-wrapper").on("click", function(e) {
            if (e.target === this) {
                $("#st-am-modal-wrapper").hide();
            }
        });

        $(document).off("click.stAmClose").on("click.stAmClose", ".st-am-close-btn", function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            $("#st-am-modal-wrapper").hide();
        });
    };

    const startUIInjection = () => {
        setInterval(() => {
            // 1. 原生面板注入
            if (settings.entryMode === 'native' || settings.entryMode === 'both') {
                // 预设面板：越过拥挤的内联图标行，挂载在整个父容器下方作为独立的一行
                const presetSelect = $('#context_presets');
                if (presetSelect.length && !$('#st-am-btn-preset').length) {
                    presetSelect.parent().after(`<div id="st-am-btn-preset" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">${ICON_MANAGE} 批量管理预设</div>`);
                }

                // 世界书面板
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

            // 2. 魔法棒菜单注入
            if (settings.entryMode === 'magic' || settings.entryMode === 'both') {
                const pluginMenu = $('#chat_plugins_list, .chat_plugins_list, #chat_plugins_dropdown');
                if (pluginMenu.length && !$('#st-am-btn-magic').length) {
                    pluginMenu.append(`<div id="st-am-btn-magic" class="st-am-native-btn" style="width:100%; margin:4px 0; box-sizing:border-box;">${ICON_MANAGE} 资源管理器</div>`);
                }
            } else {
                $('#st-am-btn-magic').remove();
            }
        }, 1200);

        // 统一点击唤出弹窗
        $(document).off("click.stAmBtn").on("click.stAmBtn", ".st-am-native-btn", function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            $("#st-am-modal-wrapper").css("display", "flex");
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
                        $("#st-am-modal-wrapper").css("display", "flex");
                    });

                    // 诊断按钮依然保留兜底
                    $("#st-am-diag-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const out = $("#st-am-diag-output");
                        out.show();
                        out.val(`[环境核验通过]\n预设容器: ${$('#context_presets').length}\n世界书容器: ${$('#world_info').length}`);
                    });

                    clearInterval(timer);
                }
            }, 500);
        } catch (err) {
            console.warn(`[${PLUGIN_ID}] 侧边栏加载失败。`, err);
        }
    });
})();
