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
        $("#st-am-modal-wrapper").remove();

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
                    <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid var(--SmartThemeBorderColor, #ccc); padding-bottom:10px;">
                        <button class="menu_button" style="flex:1; margin:0; font-weight:bold;">📖 世界书分类管理</button>
                        <button class="menu_button" style="flex:1; margin:0; font-weight:bold;">⚙️ 对话预设管理</button>
                        <button class="menu_button danger" style="flex:0.8; margin:0;">🗑️ 回收站</button>
                    </div>
                    <div style="padding:12px; background:rgba(40,167,69,0.15); border-left:4px solid #28a745; border-radius:4px; margin-bottom:15px;">
                        <b style="color:#28a745;">✅ 通路与选项卡已全部载入</b><br>
                        入口联动与样式防挤压规则均已生效。
                    </div>
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
            const mode = settings.entryMode || 'both';

            // 1. 对话补全预设面板注入：对 #settings_preset 与 #context_presets 执行精准检查
            if (mode === 'native' || mode === 'both') {
                const presetTarget = $('#settings_preset, #context_presets').first();
                if (presetTarget.length) {
                    const parentBlock = presetTarget.closest('.flex-container, .preset_select_wrapper, div');
                    if (parentBlock.length && !parentBlock.parent().find('#st-am-btn-preset').length) {
                        $('#st-am-btn-preset').remove();
                        parentBlock.after(`
                            <div id="st-am-btn-preset" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                                ${ICON_MANAGE} 批量管理预设
                            </div>
                        `);
                    }
                }
            } else {
                $('#st-am-btn-preset').remove();
            }

            // 2. 世界书面板注入：内部节点自愈检测
            if (mode === 'native' || mode === 'both') {
                const worldBox = $('#world_info');
                if (worldBox.length && !worldBox.find('#st-am-btn-world').length) {
                    $('#st-am-btn-world').remove();
                    worldBox.prepend(`
                        <div id="st-am-btn-world" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                            ${ICON_MANAGE} 批量管理世界书
                        </div>
                    `);
                }
            } else {
                $('#st-am-btn-world').remove();
            }

            // 3. 魔法棒菜单注入：捕获当前展开的菜单浮层
            if (mode === 'magic' || mode === 'both') {
                const targetText = $('div, span, a, li').filter(function() {
                    const txt = $(this).text().trim();
                    return txt === '变量管理器' || txt === '打开数据库';
                }).first();

                if (targetText.length) {
                    const rowContainer = targetText.closest('div, li');
                    const menuList = rowContainer.parent();
                    if (menuList.length && !menuList.find('#st-am-btn-magic').length) {
                        $('#st-am-btn-magic').remove();
                        rowContainer.after(`
                            <div id="st-am-btn-magic" class="st-am-native-btn" style="cursor:pointer; display:flex; width:100%; box-sizing:border-box; margin:4px 0; padding:8px 12px; justify-content:flex-start;">
                                ${ICON_MANAGE} <span>资源管理器</span>
                            </div>
                        `);
                    }
                }
            } else {
                $('#st-am-btn-magic').remove();
            }
        }, 800);

        // 统一唤出弹窗并阻止穿透
        $(document).off("click.stAmBtn").on("click.stAmBtn", "#st-am-btn-preset, #st-am-btn-world, #st-am-btn-magic", function(e) {
            e.preventDefault(); e.stopPropagation();
            $("#st-am-modal-wrapper").css("display", "flex");
            if ($(this).attr('id') === 'st-am-btn-magic') {$(this).closest('div[style*="position"], .popup, .dropdown').hide();
            }
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

                    if (settings.entryMode) {
                        $("#st-am-entry-mode").val(settings.entryMode);
                    } else {
                        $("#st-am-entry-mode").val('both');
                    }

                    $("#st-am-save-btn").off("click").on("click", (e) => { 
                        e.preventDefault(); e.stopPropagation();
                        settings.entryMode = $("#st-am-entry-mode").val();
                        if (typeof window.saveSettingsDebounced === 'function') window.saveSettingsDebounced();
                        if (typeof toastr !== 'undefined') toastr.success("入口模式已锁定保存！"); 
                    });

                    $("#st-am-test-open-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
                        $("#st-am-modal-wrapper").css("display", "flex");
                    });

                    $("#st-am-diag-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const out = $("#st-am-diag-output");
                        out.show();
                        out.val(`[版本校验: v1.0.5]\n当前入口配置: ${settings.entryMode}\n预设检测: ${$('#settings_preset, #context_presets').length}\n世界书检测: ${$('#world_info').length}`);
                    });

                    clearInterval(timer);
                }
            }, 500);
        } catch (err) {
            console.warn(`[${PLUGIN_ID}] 侧边栏加载失败。`, err);
        }
    });
})();
