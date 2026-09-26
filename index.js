(function () {
    const FOLDER_NAME = 'Explorer-NFL'; 
    const PLUGIN_ID = 'Explorer-NFL';
    let settings = {};

    const ctx = SillyTavern.getContext?.();
    const eventSource = ctx?.eventSource || window.eventSource;
    const event_types = ctx?.event_types || window.event_types;
    let extSettings = ctx?.extensionSettings || window.extension_settings;

    // 初始化配置：隔离存储世界书与预设的分类列表及映射关系
    if (!extSettings[PLUGIN_ID]) {
        extSettings[PLUGIN_ID] = {
            entryMode: 'both',
            worldCategoriesList: ['日常', '战斗', '重要设定'],
            presetsCategoriesList: ['常用预设', '破限', '测试'],
            worldMap: {},       // { "书名": "分类名" }
            presetsMap: {},     // { "预设名": "分类名" }
            recycleBin: []      // [ { type: 'world'|'preset', name: '', oldCat: '' } ]
        };
    }
    settings = extSettings[PLUGIN_ID];
    if (!settings.worldCategoriesList) settings.worldCategoriesList = ['日常', '战斗', '重要设定'];
    if (!settings.presetsCategoriesList) settings.presetsCategoriesList = ['常用预设', '破限', '测试'];
    if (!settings.worldMap) settings.worldMap = {};
    if (!settings.presetsMap) settings.presetsMap = {};
    if (!settings.recycleBin) settings.recycleBin = [];

    // 静默保存，绝对不刷新页面
    const savePluginSettings = () => {
        extSettings[PLUGIN_ID] = settings;
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        }
    };

    // --- 内联 SVG 图标库 (无 emoji) ---
    const SVG = {
        manage: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`,
        book: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
        sliders: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`,
        trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
        plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        restore: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`
    };

    // 运行态数据
    let currentTab = 'world';     // 'world' | 'preset' | 'recycle'
    let currentFilterCat = 'all'; // 'all' | 'uncategorized' | 分类名称
    let selectedItemNames = new Set();

    // 扫描酒馆原生环境中的所有世界书与预设名称
    const scanResources = () => {
        const worlds = new Set(Object.keys(settings.worldMap));
        const presets = new Set(Object.keys(settings.presetsMap));

        // 1. 扫描世界书
        $('#world_info select option, select#world_info_select option, select#world_editor_select option').each(function() {
            // 【关键修复】：还原为标准的 || 逻辑或运算符
            const val = $(this).val() \vert{}\vert{}$(this).text();
            const clean = String(val).trim();
            if (clean && clean !== '--- 选择以编辑 ---' && clean !== 'None' && clean !== '创建') worlds.add(clean);
        });
        if (Array.isArray(window.world_names)) window.world_names.forEach(w => worlds.add(w));

        // 2. 扫描预设
        $('#context_presets option, #settings_preset option, #openai_preset option, select[id*="preset"] option').each(function() {
            // 【关键修复】：还原为标准的 || 逻辑或运算符
            const val = $(this).val() \vert{}\vert{}$(this).text();
            const clean = String(val).trim();
            if (clean && clean !== '---' && clean !== 'None') presets.add(clean);
        });

        // 写入初始状态
        worlds.forEach(w => { if (settings.worldMap[w] === undefined) settings.worldMap[w] = ''; });
        presets.forEach(p => { if (settings.presetsMap[p] === undefined) settings.presetsMap[p] = ''; });
        savePluginSettings();
    };

    // --- 渲染模态框核心界面 ---
    const renderModalUI = () => {
        const body = $('#st-am-content-body');
        if (!body.length) return;
        body.empty();

        const isWorld = currentTab === 'world';
        const isPreset = currentTab === 'preset';
        const isRecycle = currentTab === 'recycle';

        // 1. 头部选项卡切换栏
        const navHtml = `
            <div style="display:flex; gap:8px; margin-bottom:12px; border-bottom:1px solid var(--SmartThemeBorderColor, #ccc); padding-bottom:8px;">
                <button class="menu_button st-am-tab-btn ${isWorld ? 'active' : ''}" data-tab="world" style="flex:1; margin:0; display:flex; align-items:center; justify-content:center; ${isWorld ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold;' : ''}">${SVG.book} 世界书分类</button>
                <button class="menu_button st-am-tab-btn ${isPreset ? 'active' : ''}" data-tab="preset" style="flex:1; margin:0; display:flex; align-items:center; justify-content:center; ${isPreset ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold;' : ''}">${SVG.sliders} 预设分类</button>
                <button class="menu_button st-am-tab-btn danger ${isRecycle ? 'active' : ''}" data-tab="recycle" style="flex:0.8; margin:0; display:flex; align-items:center; justify-content:center; ${isRecycle ? 'border-color:#dc3545; font-weight:bold;' : ''}">${SVG.trash} 回收站 (${settings.recycleBin.length})</button>
            </div>
        `;
        body.append(navHtml);

        // 2. 回收站专用界面
        if (isRecycle) {
            let recycleListHtml = '';
            if (settings.recycleBin.length === 0) {
                recycleListHtml = `<div style="text-align:center; padding:30px 0; opacity:0.6;">回收站空空如也</div>`;
            } else {
                settings.recycleBin.forEach((item, idx) => {
                    const typeLabel = item.type === 'world' ? '世界书' : '预设';
                    recycleListHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; margin-bottom:6px; background:rgba(128,128,128,0.1); border-radius:6px;">
                            <div>
                                <span style="font-size:0.75em; padding:2px 6px; border-radius:4px; background:rgba(0,0,0,0.2); margin-right:6px;">${typeLabel}</span>
                                <b>${item.name}</b>
                                <span style="font-size:0.8em; opacity:0.6; margin-left:6px;">(原分类: ${item.oldCat || '未分类'})</span>
                            </div>
                            <button class="menu_button st-am-restore-btn" data-idx="${idx}" style="margin:0; padding:4px 8px; font-size:0.8em; display:flex; align-items:center;">${SVG.restore} 还原</button>
                        </div>
                    `;
                });
            }

            body.append(`
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-size:0.9em; opacity:0.8;">已放入回收站的项目（可随时还原或彻底清空）：</span>
                    <button id="st-am-empty-recycle-btn" class="menu_button danger" style="margin:0; padding:4px 10px; font-size:0.8em; ${settings.recycleBin.length === 0 ? 'display:none;' : ''}">彻底清空回收站</button>
                </div>
                <div style="max-height:50vh; overflow-y:auto;">${recycleListHtml}</div>
            `);
            return;
        }

        // 3. 常规分类与管理面板 (世界书 / 预设)
        const categoriesList = isWorld ? settings.worldCategoriesList : settings.presetsCategoriesList;
        const itemMap = isWorld ? settings.worldMap : settings.presetsMap;

        // 提取待展示列表并过滤已在回收站中的条目
        const recycledSet = new Set(settings.recycleBin.filter(r => r.type === (isWorld ? 'world' : 'preset')).map(r => r.name));
        const allItems = Object.keys(itemMap).filter(k => !recycledSet.has(k));

        // 分类标签胶囊栏
        let catBadgesHtml = `
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; align-items:center;">
                <span style="font-size:0.85em; opacity:0.7; margin-right:4px;">分类筛选:</span>
                <button class="menu_button st-am-filter-cat ${currentFilterCat === 'all' ? 'active' : ''}" data-cat="all" style="margin:0; padding:3px 8px; font-size:0.8em; ${currentFilterCat === 'all' ? 'border-color:var(--SmartThemeQuoteColor);' : ''}">全部 (${allItems.length})</button>
                <button class="menu_button st-am-filter-cat ${currentFilterCat === 'uncategorized' ? 'active' : ''}" data-cat="uncategorized" style="margin:0; padding:3px 8px; font-size:0.8em; ${currentFilterCat === 'uncategorized' ? 'border-color:var(--SmartThemeQuoteColor);' : ''}">未分类</button>
        `;
        categoriesList.forEach(cat => {
            const count = allItems.filter(i => itemMap[i] === cat).length;
            const isCur = currentFilterCat === cat;
            catBadgesHtml += `
                <div style="display:inline-flex; align-items:center; border:1px solid ${isCur ? 'var(--SmartThemeQuoteColor)' : 'var(--SmartThemeBorderColor)'}; border-radius:6px; overflow:hidden;">
                    <button class="st-am-filter-cat" data-cat="${cat}" style="background:transparent; border:none; color:inherit; padding:3px 8px; font-size:0.8em; cursor:pointer;">${cat} (${count})</button>
                    <span class="st-am-del-cat" data-cat="${cat}" style="cursor:pointer; padding:3px 6px; font-size:0.75em; opacity:0.6; border-left:1px solid var(--SmartThemeBorderColor);" title="删除该分类">✕</span>
                </div>
            `;
        });
        catBadgesHtml += `</div>`;

        // 新建分类输入栏
        const createCatHtml = `
            <div style="display:flex; gap:6px; margin-bottom:12px;">
                <input type="text" id="st-am-new-cat-input" class="text_pole" placeholder="输入新分类名称..." style="flex:1; padding:4px 8px; font-size:0.85em;">
                <button id="st-am-add-cat-btn" class="menu_button" style="margin:0; padding:4px 10px; font-size:0.85em; display:flex; align-items:center;">${SVG.plus} 新建分类</button>
                <button id="st-am-rescan-btn" class="menu_button" style="margin:0; padding:4px 10px; font-size:0.85em; display:flex; align-items:center;" title="重新扫描酒馆">${SVG.refresh} 扫描资源</button>
            </div>
        `;

        // 过滤后要渲染的资源列表
        const displayItems = allItems.filter(name => {
            const cat = itemMap[name] || '';
            if (currentFilterCat === 'all') return true;
            if (currentFilterCat === 'uncategorized') return !cat;
            return cat === currentFilterCat;
        });

        // 批量操作工具条
        let moveOptionsHtml = `<option value="">-- 选择移动目标分类 --</option><option value="">(移至未分类)</option>`;
        categoriesList.forEach(c => { moveOptionsHtml += `<option value="${c}">${c}</option>`; });

        const batchBarHtml = `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.12); padding:8px 10px; border-radius:6px; margin-bottom:8px;">
                <label style="display:flex; align-items:center; cursor:pointer; font-size:0.85em; margin:0;">
                    <input type="checkbox" id="st-am-select-all" style="margin-right:6px;" ${displayItems.length > 0 && displayItems.every(i => selectedItemNames.has(i)) ? 'checked' : ''}> 全选
                </label>
                <div style="display:flex; gap:6px; align-items:center;">
                    <select id="st-am-batch-move-sel" class="text_pole" style="font-size:0.8em; padding:2px 6px; max-width:140px;">${moveOptionsHtml}</select>
                    <button id="st-am-batch-move-btn" class="menu_button" style="margin:0; padding:4px 8px; font-size:0.8em;">移动</button>
                    <button id="st-am-batch-del-btn" class="menu_button danger" style="margin:0; padding:4px 8px; font-size:0.8em;">移入回收站</button>
                </div>
            </div>
        `;

        // 列表渲染
        let itemsListHtml = '';
        if (displayItems.length === 0) {
            itemsListHtml = `<div style="text-align:center; padding:30px 0; opacity:0.6; font-size:0.9em;">暂无匹配的资源项，可点击上方“扫描资源”</div>`;
        } else {
            displayItems.forEach(name => {
                const checked = selectedItemNames.has(name) ? 'checked' : '';
                const currentCat = itemMap[name] || '未分类';
                itemsListHtml += `
                    <label style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; margin-bottom:4px; border-radius:6px; background:rgba(128,128,128,0.06); cursor:pointer;">
                        <div style="display:flex; align-items:center; overflow:hidden; padding-right:10px;">
                            <input type="checkbox" class="st-am-item-cb" data-name="${name}" ${checked} style="margin-right:8px;">
                            <span style="font-size:0.9em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                        </div>
                        <span style="font-size:0.75em; opacity:0.7; padding:2px 6px; border-radius:4px; background:rgba(0,0,0,0.15); flex-shrink:0;">${currentCat}</span>
                    </label>
                `;
            });
        }

        body.append(createCatHtml);
        body.append(catBadgesHtml);
        body.append(batchBarHtml);
        body.append(`<div style="max-height:48vh; overflow-y:auto;">${itemsListHtml}</div>`);
    };

    // --- 挂载全局模态框 ---
    const mountUIRoot = () => {
        $("#st-am-modal-wrapper").remove();

        const html = `
        <div id="st-am-modal-wrapper">
            <div id="st-am-root">
                <div style="padding:12px 16px; border-bottom:1px solid var(--SmartThemeBorderColor, #ccc); display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.15);">
                    <h3 style="margin:0; font-size:1.05em; font-weight:bold; color:var(--SmartThemeBodyColor, #222) !important; display:flex; align-items:center;">
                        ${SVG.manage} 资源高级管理器
                    </h3>
                    <button class="menu_button st-am-close-btn" style="margin:0; padding:4px 12px; min-width:55px; cursor:pointer;">关闭</button>
                </div>
                <div id="st-am-content-body" style="padding:14px; overflow-y:auto; flex:1; color:var(--SmartThemeBodyColor, #222) !important;">
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

        // 委托：选项卡切换
        $(document).off("click.stAmTab").on("click.stAmTab", ".st-am-tab-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            currentTab = $(this).data("tab");
            currentFilterCat = 'all';
            selectedItemNames.clear();
            renderModalUI();
        });

        // 委托：分类筛选
        $(document).off("click.stAmFilter").on("click.stAmFilter", ".st-am-filter-cat", function(e) {
            e.preventDefault(); e.stopPropagation();
            currentFilterCat = String($(this).data("cat"));
            selectedItemNames.clear();
            renderModalUI();
        });

        // 委托：新建分类
        $(document).off("click.stAmAddCat").on("click.stAmAddCat", "#st-am-add-cat-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            const val = $("#st-am-new-cat-input").val().trim();
            if (!val) return;
            const targetList = currentTab === 'world' ? settings.worldCategoriesList : settings.presetsCategoriesList;
            if (!targetList.includes(val)) {
                targetList.push(val);
                savePluginSettings();
                renderModalUI();
                if (typeof toastr !== 'undefined') toastr.success(`已添加分类: ${val}`);
            }
        });

        // 委托：删除分类 (防呆：内容自动退回未分类)
        $(document).off("click.stAmDelCat").on("click.stAmDelCat", ".st-am-del-cat", function(e) {
            e.preventDefault(); e.stopPropagation();
            const cat = String($(this).data("cat"));
            if (confirm(`确定要删除分类【${cat}】吗？\n该分类下的所有内容将安全退回至“未分类”，不会删除文件。`)) {
                const targetList = currentTab === 'world' ? settings.worldCategoriesList : settings.presetsCategoriesList;
                const targetMap = currentTab === 'world' ? settings.worldMap : settings.presetsMap;
                
                const idx = targetList.indexOf(cat);
                if (idx !== -1) targetList.splice(idx, 1);
                
                Object.keys(targetMap).forEach(k => {
                    if (targetMap[k] === cat) targetMap[k] = '';
                });

                if (currentFilterCat === cat) currentFilterCat = 'all';
                savePluginSettings();
                renderModalUI();
                if (typeof toastr !== 'undefined') toastr.info(`已删除分类【${cat}】，资源已转为未分类`);
            }
        });

        // 委托：单项勾选
        $(document).off("change.stAmItemCb").on("change.stAmItemCb", ".st-am-item-cb", function() {
            const name = String($(this).data("name"));
            if ($(this).is(':checked')) selectedItemNames.add(name);
            else selectedItemNames.delete(name);
        });

        // 委托：全选 / 反选
        $(document).off("change.stAmSelectAll").on("change.stAmSelectAll", "#st-am-select-all", function() {
            const isChecked = $(this).is(':checked');
            $('.st-am-item-cb').each(function() {$(this).prop('checked', isChecked);
                const name = String($(this).data("name"));
                if (isChecked) selectedItemNames.add(name);
                else selectedItemNames.delete(name);
            });
        });

        // 委托：批量移动分类
        $(document).off("click.stAmBatchMove").on("click.stAmBatchMove", "#st-am-batch-move-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            if (selectedItemNames.size === 0) {
                if (typeof toastr !== 'undefined') toastr.warning('请先勾选需要移动的项目');
                return;
            }
            const targetCat = $("#st-am-batch-move-sel").val();
            const targetMap = currentTab === 'world' ? settings.worldMap : settings.presetsMap;
            selectedItemNames.forEach(name => { targetMap[name] = targetCat; });
            selectedItemNames.clear();
            savePluginSettings();
            renderModalUI();
            if (typeof toastr !== 'undefined') toastr.success('已完成批量移动！');
        });

        // 委托：批量移入回收站
        $(document).off("click.stAmBatchDel").on("click.stAmBatchDel", "#st-am-batch-del-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            if (selectedItemNames.size === 0) {
                if (typeof toastr !== 'undefined') toastr.warning('请先勾选要删除的项目');
                return;
            }
            const targetMap = currentTab === 'world' ? settings.worldMap : settings.presetsMap;
            selectedItemNames.forEach(name => {
                settings.recycleBin.push({
                    type: currentTab,
                    name: name,
                    oldCat: targetMap[name] || ''
                });
            });
            selectedItemNames.clear();
            savePluginSettings();
            renderModalUI();
            if (typeof toastr !== 'undefined') toastr.warning('所选项已移入回收站');
        });

        // 委托：回收站单项还原
        $(document).off("click.stAmRestore").on("click.stAmRestore", ".st-am-restore-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            const idx = parseInt($(this).data("idx"), 10);
            if (!isNaN(idx) && settings.recycleBin[idx]) {
                const item = settings.recycleBin.splice(idx, 1)[0];
                const targetMap = item.type === 'world' ? settings.worldMap : settings.presetsMap;
                targetMap[item.name] = item.oldCat || '';
                savePluginSettings();
                renderModalUI();
                if (typeof toastr !== 'undefined') toastr.success(`已还原: ${item.name}`);
            }
        });

        // 委托：清空回收站 (红色二次防呆确认)
        $(document).off("click.stAmEmptyRecycle").on("click.stAmEmptyRecycle", "#st-am-empty-recycle-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            if (confirm("⚠️ 高危操作：确定彻底清空回收站吗？\n清空后将从管理清单中彻底清除这些记录！")) {
                settings.recycleBin = [];
                savePluginSettings();
                renderModalUI();
                if (typeof toastr !== 'undefined') toastr.error('回收站已彻底清空');
            }
        });

        // 委托：手动刷新扫描
        $(document).off("click.stAmRescan").on("click.stAmRescan", "#st-am-rescan-btn", function(e) {
            e.preventDefault(); e.stopPropagation();
            scanResources();
            renderModalUI();
            if (typeof toastr !== 'undefined') toastr.info('资源扫描完成！');
        });
    };

    // 唤起面板
    const openManagerModal = (targetTab = 'world') => {
        currentTab = targetTab;
        selectedItemNames.clear();
        scanResources();
        renderModalUI();
        $("#st-am-modal-wrapper").css("display", "flex");
    };

    // --- 按钮守护注入 (动态锚定 + 抗重绘自愈) ---
    const startUIInjection = () => {
        setInterval(() => {
            const mode = settings.entryMode || 'both';

            // 1. 预设面板注入：通过文本模糊搜索“对话补全预设”准确定位
            if (mode === 'native' || mode === 'both') {
                const btnPreset = document.getElementById('st-am-btn-preset');
                if (!btnPreset || !document.body.contains(btnPreset) || !$(btnPreset).is(':visible')) {
                    let presetHeader = null;
                    $('span, h4, h3, div, label').each(function() {
                        const txt = $(this).clone().children().remove().end().text().trim();
                        if (txt === '对话补全预设' || txt === 'Chat Completion Preset') {
                            presetHeader = $(this).closest('div');
                            return false;
                        }
                    });

                    if (presetHeader && presetHeader.length) {
                        $('#st-am-btn-preset').remove();
                        presetHeader.after(`
                            <div id="st-am-btn-preset" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                                ${SVG.sliders} 批量管理预设
                            </div>
                        `);
                    } else {
                        // 降级兜底：挂载在 #context_presets 附近
                        const fallback = $('#context_presets').first();
                        if (fallback.length && !$('#st-am-btn-preset').length) {
                            fallback.parent().after(`
                                <div id="st-am-btn-preset" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                                    ${SVG.sliders} 批量管理预设
                                </div>
                            `);
                        }
                    }
                }
            } else {
                $('#st-am-btn-preset').remove();
            }

            // 2. 世界书面板注入：抗重绘常驻
            if (mode === 'native' || mode === 'both') {
                const worldBox = $('#world_info');
                const btnWorld = document.getElementById('st-am-btn-world');
                if (worldBox.length && (!btnWorld || !document.body.contains(btnWorld) || !$(btnWorld).is(':visible'))) {$('#st-am-btn-world').remove();
                    const topHeader = worldBox.find('.inline-drawer-header, h3').first();
                    if (topHeader.length) {
                        topHeader.after(`
                            <div id="st-am-btn-world" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                                ${SVG.book} 批量管理世界书
                            </div>
                        `);
                    } else {
                        worldBox.prepend(`
                            <div id="st-am-btn-world" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                                ${SVG.book} 批量管理世界书
                            </div>
                        `);
                    }
                }
            } else {
                $('#st-am-btn-world').remove();
            }

            // 3. 魔法棒菜单注入
            if (mode === 'magic' || mode === 'both') {
                const targetItem = $('div, span, a, li').filter(function() {
                    const txt = $(this).text().trim();
                    return txt === '变量管理器' || txt === '打开数据库';
                }).first();

                if (targetItem.length) {
                    const rowContainer = targetItem.closest('div, li');
                    const menuList = rowContainer.parent();
                    if (menuList.length && !menuList.find('#st-am-btn-magic').length) {
                        $('#st-am-btn-magic').remove();
                        rowContainer.after(`
                            <div id="st-am-btn-magic" class="st-am-native-btn" style="cursor:pointer; display:flex; width:100%; box-sizing:border-box; margin:4px 0; padding:8px 12px; justify-content:flex-start;">
                                ${SVG.manage} <span>资源管理器</span>
                            </div>
                        `);
                    }
                }
            } else {
                $('#st-am-btn-magic').remove();
            }
        }, 800);

        // 统一点击唤起
        $(document).off("click.stAmBtn").on("click.stAmBtn", "#st-am-btn-preset", function(e) {
            e.preventDefault(); e.stopPropagation();
            openManagerModal('preset');
        });

        $(document).off("click.stAmWorldBtn").on("click.stAmWorldBtn", "#st-am-btn-world", function(e) {
            e.preventDefault(); e.stopPropagation();
            openManagerModal('world');
        });

        $(document).off("click.stAmMagicBtn").on("click.stAmMagicBtn", "#st-am-btn-magic", function(e) {
            e.preventDefault(); e.stopPropagation();
            openManagerModal('world');
            $(this).closest('div[style*="position"], .popup, .dropdown').hide();
        });
    };

    // --- 启动引导 ---
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
                        savePluginSettings();
                        if (typeof toastr !== 'undefined') toastr.success("设置已保存！"); 
                    });

                    $("#st-am-test-open-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
                        openManagerModal('world');
                    });

                    $("#st-am-diag-btn").off("click").on("click", (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const out = $("#st-am-diag-output");
                        out.show();
                        out.val(`[版本校验: v1.0.6]\n入口模式: ${settings.entryMode}\n已记录世界书: ${Object.keys(settings.worldMap).length}\n已记录预设: ${Object.keys(settings.presetsMap).length}\n回收站存量: ${settings.recycleBin.length}`);
                    });

                    clearInterval(timer);
                    if (typeof toastr !== 'undefined') toastr.success('资源管理器加载成功！');
                }
            }, 500);
        } catch (err) {
            console.warn(`[${PLUGIN_ID}] 侧边栏加载失败。`, err);
        }
    });
})();
