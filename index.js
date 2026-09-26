import { getContext, extension_settings } from '/scripts/extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '/script.js';

const PLUGIN_ID = 'st-advanced-manager';
// 注意：如果你改了文件夹名字，这里的文件夹名必须跟着改！
const FOLDER_NAME = 'st-advanced-manager'; 

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

// --- jQuery 启动器 (照搬你之前的逻辑) ---
jQuery(async () => {
    try {
        // 读取 HTML。这里用了 FOLDER_NAME，请确保它与你实际文件夹名字一致
        const htmlPath = `/scripts/extensions/third-party/${FOLDER_NAME}/index.html`;
        const htmlFile = await $.get(htmlPath);
        
        // 挂载底座面板
        mountUIRoot();
        startUIInjection();

        // 轮询等待扩展面板加载
        const timer = setInterval(() => {
            if ($("#extensions_settings").length && !$("#st-am-extension-settings").length) {
                $("#extensions_settings").append(htmlFile);
                
                // 读取旧设置
                if (settings.entryMode) {
                    $("#st-am-entry-mode").val(settings.entryMode);
                }

                // 绑定保存按钮
                $("#st-am-save-btn").on("click", (e) => { 
                    e.preventDefault();
                    settings.entryMode = $("#st-am-entry-mode").val();
                    saveSettingsDebounced(); 
                    if (typeof toastr !== 'undefined') toastr.success("管理器设置已保存！"); 
                });

                // 绑定测试打开按钮
                $("#st-am-test-open-btn").on("click", (e) => {
                    e.preventDefault();
                    $("#st-am-overlay").show();
                    $("#st-am-root").css("display", "flex");
                });
                
                clearInterval(timer);
                console.log(`[${PLUGIN_ID}] 初始化完成。`);
            }
        }, 500);

    } catch (err) {
        console.error(`[${PLUGIN_ID}] 启动失败，可能是文件夹名字与 ${FOLDER_NAME} 不一致，或者不支持此加载方式。`, err);
    }
});
