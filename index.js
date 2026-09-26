import { extension_settings } from '/scripts/extensions.js';

// 外部探针：测试文件是否被成功解析
toastr.info("【极简版】代码开始解析...", "Explorer-NFL");

jQuery(() => {
    // 极简版 UI 骨架
    const safeHtmlString = `
    <div id="st-am-extension-settings" class="aps-settings-container">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header" style="cursor: pointer; background: rgba(128,128,128,0.2); padding: 10px;">
                <b>Explorer-NFL-资源管理 (极简测试版)</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content" style="display: none; padding: 15px;">
                <p>如果你能点开这个抽屉，说明横边栏注入成功了！</p>
                <button class="menu_button">测试按钮</button>
            </div>
        </div>
    </div>`;

    const htmlInjector = setInterval(() => {
        const container = $("#extensions_settings");
        if (container.length && !$("#st-am-extension-settings").length) {
            
            // 强行置顶插入
            container.prepend(safeHtmlString);
            toastr.success("UI 骨架已成功置顶！", "成功");

            // 绑定抽屉点击
            $("#st-am-extension-settings .inline-drawer-toggle").on("click", function(e) {
                e.preventDefault();
                $(this).find(".inline-drawer-icon").toggleClass("down up");
                $(this).siblings(".inline-drawer-content").slideToggle(200);
            });

            clearInterval(htmlInjector);
        }
    }, 500);
});
