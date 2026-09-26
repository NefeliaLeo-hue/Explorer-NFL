import { getContext, extension_settings } from '/scripts/extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '/script.js';

const extName = "Explorer-NFL";

if (!extension_settings[extName]) {
    extension_settings[extName] = {
        entryMode: 'both',
        worldCategories: ['日常', '战斗', '重要设定'],
        presetsCategories: ['常用预设', '破限', '测试'],
        worldMap: {},       
        presetsMap: {},     
        recycleBin: []      
    };
}
const settings = extension_settings[extName];

if (!settings.worldCategories) settings.worldCategories = ['日常', '战斗', '重要设定'];
if (!settings.presetsCategories) settings.presetsCategories = ['常用预设', '破限', '测试'];
if (!settings.worldMap) settings.worldMap = {};
if (!settings.presetsMap) settings.presetsMap = {};
if (!settings.recycleBin) settings.recycleBin = [];

const SVG = {
    manage: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`,
    book: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    sliders: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`,
    trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    restore: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`
};

let currentTab = 'world';     
let currentFilterCat = 'all'; 
let selectedItemNames = new Set();

// 已经完全清除了错误的 \vert{}\vert{}，恢复标准 ||
const scanResources = () => {
    const worlds = new Set(Object.keys(settings.worldMap));
    const presets = new Set(Object.keys(settings.presetsMap));

    $('#world_info select option, select#world_info_select option, select#world_editor_select option').each(function() {
        const val = $(this).val() \vert{}\vert{}$(this).text();
        const clean = String(val).trim();
        if (clean && clean !== '--- 选择以编辑 ---' && clean !== 'None' && clean !== '创建') worlds.add(clean);
    });
    if (Array.isArray(window.world_names)) window.world_names.forEach(w => worlds.add(w));

    $('#openai_preset option, #chat_completion_preset option, #settings_preset option, select[id*="preset"] option').each(function() {
        const val = $(this).val() \vert{}\vert{}$(this).text();
        const clean = String(val).trim();
        if (clean && clean !== '---' && clean !== 'None') presets.add(clean);
    });

    worlds.forEach(w => { if (settings.worldMap[w] === undefined) settings.worldMap[w] = ''; });
    presets.forEach(p => { if (settings.presetsMap[p] === undefined) settings.presetsMap[p] = ''; });
    saveSettingsDebounced();
};

const renderModalUI = () => {
    const body = $('#st-am-content-body');
    if (!body.length) return;
    body.empty();

    const isWorld = currentTab === 'world';
    const isPreset = currentTab === 'preset';
    const isRecycle = currentTab === 'recycle';

    const navHtml = `
        <div style="display:flex; gap:8px; margin-bottom:12px; border-bottom:1px solid var(--SmartThemeBorderColor, #ccc); padding-bottom:8px;">
            <button class="menu_button st-am-tab-btn" data-tab="world" style="flex:1; margin:0; display:flex; align-items:center; justify-content:center; ${isWorld ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold; background:rgba(128,128,128,0.2);' : ''}">${SVG.book} 世界书分类</button>
            <button class="menu_button st-am-tab-btn" data-tab="preset" style="flex:1; margin:0; display:flex; align-items:center; justify-content:center; ${isPreset ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold; background:rgba(128,128,128,0.2);' : ''}">${SVG.sliders} 预设分类</button>
            <button class="menu_button st-am-tab-btn danger" data-tab="recycle" style="flex:0.8; margin:0; display:flex; align-items:center; justify-content:center; ${isRecycle ? 'border-color:#dc3545; font-weight:bold; background:rgba(220,53,69,0.2);' : ''}">${SVG.trash} 回收站 (${settings.recycleBin.length})</button>
        </div>
    `;
    body.append(navHtml);

    if (isRecycle) {
        let recycleListHtml = '';
        if (settings.recycleBin.length === 0) {
            recycleListHtml = `<div style="text-align:center; padding:35px 0; opacity:0.6;">回收站空空如也</div>`;
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
                        <button class="menu_button st-am-restore-btn" data-idx="${idx}" style="margin:0; padding:4px 10px; font-size:0.8em; display:flex; align-items:center;">${SVG.restore} 还原</button>
                    </div>
                `;
            });
        }
        body.append(`
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-size:0.9em; opacity:0.85;">已丢弃的项目清单：</span>
                <button id="st-am-empty-recycle-btn" class="menu_button danger" style="margin:0; padding:4px 10px; font-size:0.8em; ${settings.recycleBin.length === 0 ? 'display:none;' : ''}">彻底清空回收站</button>
            </div>
            <div style="max-height:50vh; overflow-y:auto;">${recycleListHtml}</div>
        `);
        return;
    }

    const categoriesList = isWorld ? settings.worldCategories : settings.presetsCategories;
    const itemMap = isWorld ? settings.worldMap : settings.presetsMap;
    const recycledSet = new Set(settings.recycleBin.filter(r => r.type === (isWorld ? 'world' : 'preset')).map(r => r.name));
    const allItems = Object.keys(itemMap).filter(k => !recycledSet.has(k));

    let catBadgesHtml = `
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; align-items:center;">
            <span style="font-size:0.85em; opacity:0.7; margin-right:4px;">分类筛选:</span>
            <button class="menu_button st-am-filter-cat" data-cat="all" style="margin:0; padding:3px 8px; font-size:0.8em; ${currentFilterCat === 'all' ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold;' : ''}">全部 (${allItems.length})</button>
            <button class="menu_button st-am-filter-cat" data-cat="uncategorized" style="margin:0; padding:3px 8px; font-size:0.8em; ${currentFilterCat === 'uncategorized' ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold;' : ''}">未分类</button>
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

    const createCatHtml = `
        <div style="display:flex; gap:6px; margin-bottom:12px;">
            <input type="text" id="st-am-new-cat-input" class="text_pole" placeholder="新建分类名称..." style="flex:1; padding:4px 8px; font-size:0.85em;">
            <button id="st-am-add-cat-btn" class="menu_button" style="margin:0; padding:4px 10px; font-size:0.85em; display:flex; align-items:center;">${SVG.plus} 新建分类</button>
            <button id="st-am-rescan-btn" class="menu_button" style="margin:0; padding:4px 10px; font-size:0.85em; display:flex; align-items:center;">${SVG.refresh} 重新扫描</button>
        </div>
    `;

    const displayItems = allItems.filter(name => {
        const cat = itemMap[name] || '';
        if (currentFilterCat === 'all') return true;
        if (currentFilterCat === 'uncategorized') return !cat;
        return cat === currentFilterCat;
    });

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

    let itemsListHtml = '';
    if (displayItems.length === 0) {
        itemsListHtml = `<div style="text-align:center; padding:35px 0; opacity:0.6; font-size:0.9em;">暂无条目，请点击上方“重新扫描”获取系统列表</div>`;
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

const mountUIRoot = () => {
    if ($("#st-am-modal-wrapper").length) return;

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

    $(document).off("click.stAmTab").on("click.stAmTab", ".st-am-tab-btn", function(e) {
        e.preventDefault(); e.stopPropagation();
        currentTab = $(this).data("tab");
        currentFilterCat = 'all';
        selectedItemNames.clear();
        renderModalUI();
    });

    $(document).off("click.stAmFilter").on("click.stAmFilter", ".st-am-filter-cat", function(e) {
        e.preventDefault(); e.stopPropagation();
        currentFilterCat = String($(this).data("cat"));
        selectedItemNames.clear();
        renderModalUI();
    });

    $(document).off("click.stAmAddCat").on("click.stAmAddCat", "#st-am-add-cat-btn", function(e) {
        e.preventDefault(); e.stopPropagation();
        const val = $("#st-am-new-cat-input").val().trim();
        if (!val) return;
        const targetList = currentTab === 'world' ? settings.worldCategories : settings.presetsCategories;
        if (!targetList.includes(val)) {
            targetList.push(val);
            saveSettingsDebounced();
            renderModalUI();
            toastr.success(`已添加分类: ${val}`);
        }
    });

    $(document).off("click.stAmDelCat").on("click.stAmDelCat", ".st-am-del-cat", function(e) {
        e.preventDefault(); e.stopPropagation();
        const cat = String($(this).data("cat"));
        if (confirm(`确定要删除分类【${cat}】吗？\n该分类下的项目将自动退回“未分类”，不会删除实际文件。`)) {
            const targetList = currentTab === 'world' ? settings.worldCategories : settings.presetsCategories;
            const targetMap = currentTab === 'world' ? settings.worldMap : settings.presetsMap;
            const idx = targetList.indexOf(cat);
            if (idx !== -1) targetList.splice(idx, 1);
            Object.keys(targetMap).forEach(k => {
                if (targetMap[k] === cat) targetMap[k] = '';
            });
            if (currentFilterCat === cat) currentFilterCat = 'all';
            saveSettingsDebounced();
            renderModalUI();
            toastr.info(`已移除分类【${cat}】`);
        }
    });

    $(document).off("change.stAmItemCb").on("change.stAmItemCb", ".st-am-item-cb", function() {
        const name = String($(this).data("name"));
        if ($(this).is(':checked')) selectedItemNames.add(name);
        else selectedItemNames.delete(name);
    });

    $(document).off("change.stAmSelectAll").on("change.stAmSelectAll", "#st-am-select-all", function() {
        const isChecked = $(this).is(':checked');
        $('.st-am-item-cb').each(function() {$(this).prop('checked', isChecked);
            const name = String($(this).data("name"));
            if (isChecked) selectedItemNames.add(name);
            else selectedItemNames.delete(name);
        });
    });

    $(document).off("click.stAmBatchMove").on("click.stAmBatchMove", "#st-am-batch-move-btn", function(e) {
        e.preventDefault(); e.stopPropagation();
        if (selectedItemNames.size === 0) return toastr.warning('请先勾选需要移动的项目');
        const targetCat = $("#st-am-batch-move-sel").val();
        const targetMap = currentTab === 'world' ? settings.worldMap : settings.presetsMap;
        selectedItemNames.forEach(name => { targetMap[name] = targetCat; });
        selectedItemNames.clear();
        saveSettingsDebounced();
        renderModalUI();
        toastr.success('已完成批量移动！');
    });

    $(document).off("click.stAmBatchDel").on("click.stAmBatchDel", "#st-am-batch-del-btn", function(e) {
        e.preventDefault(); e.stopPropagation();
        if (selectedItemNames.size === 0) return toastr.warning('请先勾选要删除的项目');
        const targetMap = currentTab === 'world' ? settings.worldMap : settings.presetsMap;
        selectedItemNames.forEach(name => {
            settings.recycleBin.push({ type: currentTab, name: name, oldCat: targetMap[name] || '' });
        });
        selectedItemNames.clear();
        saveSettingsDebounced();
        renderModalUI();
        toastr.warning('已移入回收站');
    });

    $(document).off("click.stAmRestore").on("click.stAmRestore", ".st-am-restore-btn", function(e) {
        e.preventDefault(); e.stopPropagation();
        const idx = parseInt($(this).data("idx"), 10);
        if (!isNaN(idx) && settings.recycleBin[idx]) {
            const item = settings.recycleBin.splice(idx, 1)[0];
            const targetMap = item.type === 'world' ? settings.worldMap : settings.presetsMap;
            targetMap[item.name] = item.oldCat || '';
            saveSettingsDebounced();
            renderModalUI();
            toastr.success(`已还原: ${item.name}`);
        }
    });

    $(document).off("click.stAmEmptyRecycle").on("click.stAmEmptyRecycle", "#st-am-empty-recycle-btn", function(e) {
        e.preventDefault(); e.stopPropagation();
        if (confirm("⚠️ 确定彻底清空回收站吗？此操作无法恢复！")) {
            settings.recycleBin = [];
            saveSettingsDebounced();
            renderModalUI();
            toastr.error('回收站已彻底清空');
        }
    });

    $(document).off("click.stAmRescan").on("click.stAmRescan", "#st-am-rescan-btn", function(e) {
        e.preventDefault(); e.stopPropagation();
        scanResources();
        renderModalUI();
        toastr.info('扫描完成！');
    });
};

const openManagerModal = (targetTab = 'world') => {
    currentTab = targetTab;
    selectedItemNames.clear();
    scanResources();
    renderModalUI();
    $("#st-am-modal-wrapper").css("display", "flex");
};

const injectButtons = () => {
    const mode = settings.entryMode || 'both';

    if (mode === 'native' || mode === 'both') {
        const presetEl = $('#openai_preset, #chat_completion_preset, #settings_preset').filter(':visible').first();
        const targetEl = presetEl.length ? presetEl : $('#openai_preset, #chat_completion_preset, #settings_preset').first();
        if (targetEl.length && !$('#st-am-btn-preset').length) {
            targetEl.closest('.flex-container, div').after(`
                <div id="st-am-btn-preset" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                    ${SVG.sliders} 批量管理预设
                </div>
            `);
        }
    } else {
        $('#st-am-btn-preset').remove();
    }

    if (mode === 'native' || mode === 'both') {
        const worldBox = $('#world_info');
        if (worldBox.length && !$('#st-am-btn-world').length) {
            worldBox.prepend(`
                <div id="st-am-btn-world" class="menu_button st-am-native-btn" style="width:100%; margin:8px 0; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                    ${SVG.book} 批量管理世界书
                </div>
            `);
        }
    } else {
        $('#st-am-btn-world').remove();
    }

    if (mode === 'magic' || mode === 'both') {
        const targetItem = $('div, span, a, li').filter(function() {
            const txt = $(this).text().trim();
            return txt === '变量管理器' || txt === '打开数据库';
        }).first();

        if (targetItem.length) {
            const rowContainer = targetItem.closest('div, li');
            const menuList = rowContainer.parent();
            if (menuList.length && !menuList.find('#st-am-btn-magic').length) {
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
};

// 【核心修复】：完全对标旧插件的稳定加载方式
jQuery(async () => {
    mountUIRoot();

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

    setInterval(injectButtons, 500);

    // 完美复刻 Auto-Persona-Switch-NFL 的 $.get 加载机制
    try {
        const htmlFile = await $.get(`/scripts/extensions/third-party/${extName}/index.html`);
        const timer = setInterval(() => {
            if ($("#extensions_settings").length && !$("#st-am-extension-settings").length) {
                $("#extensions_settings").append(htmlFile);

                // 绑定抽屉展开折叠
                $("#st-am-extension-settings .inline-drawer-toggle").off("click").on("click", function(e) {
                    e.preventDefault();
                    const icon = $(this).find(".inline-drawer-icon");
                    const content = $(this).siblings(".inline-drawer-content");
                    icon.toggleClass("down up");
                    content.slideToggle(200);
                });

                if (settings.entryMode) {
                    $("#st-am-entry-mode").val(settings.entryMode);
                }

                $("#st-am-save-btn").css("white-space", "nowrap").off("click").on("click", (e) => { 
                    e.preventDefault(); e.stopPropagation();
                    settings.entryMode = $("#st-am-entry-mode").val();
                    saveSettingsDebounced();
                    toastr.success("设置已保存！"); 
                });

                $("#st-am-test-open-btn").off("click").on("click", (e) => {
                    e.preventDefault(); e.stopPropagation();
                    openManagerModal('world');
                });

                clearInterval(timer);
            }
        }, 500);
    } catch (err) {
        console.error(`[${extName}] 侧边栏 HTML 加载失败，请检查路径:`, err);
    }
});
