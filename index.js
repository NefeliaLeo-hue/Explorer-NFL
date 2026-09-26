import { getContext, extension_settings } from '/scripts/extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '/script.js';

const PLUGIN_ID = 'st-advanced-manager';
// 注意：如果你改了文件夹名字，这里的文件夹名必须跟着改！
const FOLDER_NAME = 'Explorer-NFL'; 

if (!extension_settings[PLUGIN_ID]) {
    extension_settings[PLUGIN_ID] = {
        entryMode: 'both', 
        worldCategories: {}, 
        presetsCategories: {}, 
        recycleBin: []
    };
}
const settings = extension_settings[PLUGIN_ID];

const ICON_MANAGE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;

// --- 界面控制模块 ---
const mountUIRoot = () => {
    if ($("#st-am-root").length) return;
    const html = `
        <div id="st-am-overlay"></div>
        <div id="st-am-root" class="text_pole">
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

    // 绑定关闭事件，严防穿透
    $(document).on("click", ".st-am-close-btn", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $("#st-am-overlay, #st-am-root").hide();
    });
};

const startUIInjection = () => {
    setInterval(() => {
        if (settings.entryMode === 'native' || settings.entryMode === 'both') {
            // 图2：世界书
            const worldHeader = $('.world_info_header');
            if (worldHeader.length && !$('#st-am-btn-world').length) {
                worldHeader.append(`<div id="st-am-btn-world" class="menu_button st-am-native-btn" title="高级分类管理">${ICON_MANAGE}</div>`);
            }
            // 图1：预设
            const presetControl = $('#context_presets_controls');
            if (presetControl.length && !$('#st-am-btn-preset').length) {
                presetControl.append(`<div id="st-am-btn-preset" class="menu_button st-am-native-btn" title="高级分类管理">${ICON_MANAGE}</div>`);
            }
        } else {
            $('#st-am-btn-world, #st-am-btn-preset').remove();
        }
    }, 1500);

    // 委托原生面板小按钮的点击事件 (只需绑一次)
    $(document).off("click.stAmBtn").on("click.stAmBtn", ".st-am-native-btn", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $("#st-am-overlay").show();
        $("#st-am-root").css("display", "flex");
    });
};

// --- jQuery 启动器 (防阻断优化版) ---
jQuery(async () => {
    // 1. 优先执行！先把不需要依赖 HTML 文件的面板和图1图2的小按钮挂载上去。
    // 这样就算侧边栏加载失败，原生的按钮和面板依然能正常工作！
    mountUIRoot();
    startUIInjection();

    try {
        // 注意：这里一定要和你手机里的文件夹名字一模一样！
        const FOLDER_NAME = 'st-advanced-manager'; 
        
        // 2. 双路径尝试机制：先找 third-party，找不到再去 local 找，防呆拉满
        let htmlFile = '';
        try {
            htmlFile = await $.get(`/scripts/extensions/third-party/${FOLDER_NAME}/index.html`);
        } catch (e1) {
            htmlFile = await $.get(`/scripts/extensions/local/${FOLDER_NAME}/index.html`);
        }

        // 3. 轮询等待酒馆的扩展设置页面准备好
        const timer = setInterval(() => {
            if ($("#extensions_settings").length && !$("#st-am-extension-settings").length) {
                $("#extensions_settings").append(htmlFile);
                
                // 恢复之前的开关设置
                if (settings.entryMode) {
                    $("#st-am-entry-mode").val(settings.entryMode);
                }

                // 绑定保存按钮
                $("#st-am-save-btn").off("click").on("click", (e) => { 
                    e.preventDefault();
                    e.stopPropagation();
                    settings.entryMode = $("#st-am-entry-mode").val();
                    saveSettingsDebounced(); 
                    if (typeof toastr !== 'undefined') toastr.success("管理器设置已保存！"); 
                });

                // 绑定兜底的测试打开按钮
                $("#st-am-test-open-btn").off("click").on("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    $("#st-am-overlay").show();
                    $("#st-am-root").css("display", "flex");
                });
                
                clearInterval(timer);
                console.log(`[${PLUGIN_ID}] 侧边栏初始化完成。`);
            }
        }, 500);

    } catch (err) {
        // 如果 HTML 实在找不到，只会在控制台静默报错，绝对不会拖累上面的主面板逻辑
        console.warn(`[${PLUGIN_ID}] 侧边栏加载失败，请检查文件夹是否名为 ${FOLDER_NAME}`, err);
    }
});
