import { getContext, extension_settings } from '/scripts/extensions.js';
import {saveSettingsDebounced,eventSource,event_types,getRequestHeaders} from '/script.js';
import { deleteWorldInfo } from '/scripts/world-info.js';

import {
    isTauriTavern,
    listTauriTavernLLMConnections
} from './adapters/tt.js';

const extName = "Explorer-NFL";

if (!extension_settings[extName]) {
    extension_settings[extName] = {
        entryMode: 'both',
        worldCategories: [],
        presetsCategories: [],
        apiCategories: [],
        worldMap: {},
        presetsMap: {},
        apiMap: {},
        recycleBin: []
    };
}

const settings = extension_settings[extName];

if (!Array.isArray(settings.worldCategories)) {
    settings.worldCategories = [];
}

if (!Array.isArray(settings.presetsCategories)) {
    settings.presetsCategories = [];
}

if (!Array.isArray(settings.apiCategories)) {
    settings.apiCategories = [];
}

if (!settings.worldMap) {
    settings.worldMap = {};
}

if (!settings.presetsMap) {
    settings.presetsMap = {};
}

if (!settings.recycleBin) {
    settings.recycleBin = [];
}

if (!settings.apiMap) {
    settings.apiMap = {};
}

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

// 保存当前勾选的资源。
// 使用「类型::名称」作为唯一标识，
// 避免世界书和预设同名时发生冲突。
let selectedItems = new Set();

// =========================
// API 显示名称缓存
// =========================
// Explorer 内部使用资源 ID。
// 用户界面显示资源名称。
// 这里只保存在内存中，不写入 settings。
let apiDisplayNames = new Map();

// all = 可以查看世界书和预设
// world = 只能查看世界书和回收站
// preset = 只能查看预设和回收站
let managerScope = 'all';

const scanResources = () => {
    const worldsFound = new Set();
    const presetsFound = new Set();

    let worldScanAvailable = false;
    let presetScanAvailable = false;

    // =========================
    // 扫描世界书
    // =========================
    // SillyTavern 的世界书下拉框中：
    // option.value 是数字索引，例如 0、1、2
    // option.text 才是真正的世界书名称。
    if (Array.isArray(window.world_names)) {

        worldScanAvailable = true;

        window.world_names.forEach(name => {
            const clean = String(name).trim();

            if (clean) {
                worldsFound.add(clean);
            }
        });

    } else {

        const worldSelects = $('#world_info, #world_editor_select');

        worldScanAvailable = worldSelects.length > 0;

        worldSelects.find('option').each(function() {

            const clean = $(this).text().trim();

            if (
                clean &&
                clean !== '--- 选择以编辑 ---' &&
                clean !== 'None' &&
                clean !== '创建'
            ) {
                worldsFound.add(clean);
            }

        });
    }


    // =========================
    // 扫描预设
    // =========================
    // 这里只扫描 Chat Completion / OpenAI 预设。
    // 不再使用 select[id*="preset"]，
    // 防止把 NovelAI、其他模型预设等一起扫进来。
    const presetSelector =
        '#settings_preset_openai, #openai_preset, #chat_completion_preset';

    const presetSelect = $(presetSelector);

    if (presetSelect.length) {

        presetScanAvailable = true;

        presetSelect.find('option').each(function() {

            const clean = $(this).text().trim();

            if (
                clean &&
                clean !== '---' &&
                clean !== 'None'
            ) {
                presetsFound.add(clean);
            }

        });
    }


    // =========================
    // 更新世界书列表
    // =========================
    // 只有确认 SillyTavern 的世界书列表存在时，
    // 才清理旧数据。
    //
    // 回收站里的项目必须保留，
    // 否则之后无法正确还原。
    if (worldScanAvailable) {

        const recycledWorlds = new Set(
            settings.recycleBin
                .filter(item => item.type === 'world')
                .map(item => item.name)
        );

        Object.keys(settings.worldMap).forEach(name => {

            if (
                !worldsFound.has(name) &&
                !recycledWorlds.has(name)
            ) {
                delete settings.worldMap[name];
            }

        });

        worldsFound.forEach(name => {

            if (settings.worldMap[name] === undefined) {
                settings.worldMap[name] = '';
            }

        });
    }


    // =========================
    // 更新预设列表
    // =========================
    if (presetScanAvailable) {

        const recycledPresets = new Set(
            settings.recycleBin
                .filter(item => item.type === 'preset')
                .map(item => item.name)
        );

        Object.keys(settings.presetsMap).forEach(name => {

            if (
                !presetsFound.has(name) &&
                !recycledPresets.has(name)
            ) {
                delete settings.presetsMap[name];
            }

        });

        presetsFound.forEach(name => {

            if (settings.presetsMap[name] === undefined) {
                settings.presetsMap[name] = '';
            }

        });
    }


    saveSettingsDebounced();
};


// =========================
// 扫描 API / Connection
// =========================
//
// ST：
// extension_settings.connectionManager.profiles
//
// TT：
// adapters/tt.js
// → llmConnections.list()
//
// Explorer 内部只保存资源 ID → 分类。
// 显示名称放在内存中的 apiDisplayNames。
// 不保存 API Key / Secret / URL。
// =========================

const scanAPIProfiles = async () => {

    // 每次扫描都重新建立显示名称缓存。
    apiDisplayNames = new Map();

    const profilesFound = new Map();


    // =========================
    // TauriTavern
    // =========================

    if (isTauriTavern()) {
        try {
            const connections =
                await listTauriTavernLLMConnections();

            connections.forEach(connection => {
                if (
                    !connection ||
                    !connection.id
                ) {
                    return;
                }

                const id =
                    String(connection.id);

                const name =
                    String(connection.name || '')
                        .trim();

                if (!name) {
                    return;
                }

                profilesFound.set(
                    id,
                    name
                );

                apiDisplayNames.set(
                    id,
                    name
                );
            });

        } catch (err) {

            console.error(
                `[${extName}] TT LLM Connection 扫描失败:`,
                err
            );

            if (
                typeof toastr !== 'undefined'
            ) {
                
                toastr.error(
                    `TT API 扫描失败：${err?.message || err}`
                );
            }

            // TT 扫描失败时：
            // 不清理现有 Explorer API 数据。
            return;
        }

    }


    // =========================
    // SillyTavern
    // =========================

    else {

        const profiles =
            extension_settings
                .connectionManager
                ?.profiles;


        if (!Array.isArray(profiles)) {
            return;
        }


        profiles.forEach(profile => {

            if (
                !profile ||
                !profile.id
            ) {
                return;
            }


            // 这里只读取非敏感字段：
            // profile.id
            // profile.name

            const id =
                String(profile.id);


            const name =
                String(profile.name || '')
                    .trim();


            if (!name) {
                return;
            }


            profilesFound.set(
                id,
                name
            );


            apiDisplayNames.set(
                id,
                name
            );
        });
    }


    // =========================
    // 回收站中的 API
    // =========================

    const recycledAPIs =
        new Set(
            settings.recycleBin
                .filter(
                    item =>
                        item.type === 'api'
                )
                .map(
                    item =>
                        String(item.id)
                )
        );


    // =========================
    // 清理已经不存在的 API
    // =========================

    Object.keys(
        settings.apiMap
    ).forEach(id => {

        if (
            !profilesFound.has(id) &&
            !recycledAPIs.has(id)
        ) {

            delete settings.apiMap[id];
        }

    });


    // =========================
    // 新发现的 API 默认未分类
    // =========================

    profilesFound.forEach(
        (name, id) => {

            if (
                settings.apiMap[id] ===
                undefined
            ) {

                settings.apiMap[id] = '';
            }

        }
    );


    saveSettingsDebounced();
};


// =========================
// 同步原生 Connection Profile UI
// =========================
//
// Explorer 会直接修改
// extension_settings.connectionManager.profiles。
// Connection Manager 自己的 renderConnectionProfiles()
// 是内部私有函数，第三方扩展无法直接调用。
//
// 因此这里只同步原生 UI：
// 1. Profile 下拉框
// 2. Update / Reload / Delete 按钮状态
//
// 不读取或修改任何 API Key / Secret / URL。
// =========================

const syncConnectionProfileUI = (
    deletedSelectedProfile = false
) => {
    const profilesSelect =
        document.getElementById(
            'connection_profiles'
        );

    if (!profilesSelect) {
        return;
    }

    const connectionManager =
        extension_settings.connectionManager;

    if (!connectionManager) {
        return;
    }

    const profiles =
        Array.isArray(connectionManager.profiles)
            ? connectionManager.profiles
            : [];

    const selectedProfile =
        connectionManager.selectedProfile;


    // =========================
    // 重建 Profile 下拉框
    // =========================

    profilesSelect.innerHTML = '';

    // <None>
    const noneOption =
        document.createElement('option');

    noneOption.value = '';
    noneOption.textContent = '<None>';

    noneOption.selected =
        !selectedProfile;

    profilesSelect.appendChild(
        noneOption
    );

    // 与 ST 原生 renderConnectionProfiles()
    // 相同：按照 Profile 名称排序。
    //
    // 使用 slice()，不直接修改
    // Connection Manager 的 profiles 数组。
    profiles
        .slice()
        .sort(
            (a, b) =>
                String(a.name || '')
                    .localeCompare(
                        String(b.name || '')
                    )
        )
        .forEach(profile => {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                String(profile.id);

            option.textContent =
                String(profile.name || '');

            option.selected =
                String(profile.id) ===
                String(selectedProfile);

            profilesSelect.appendChild(
                option
            );
        });


    // =========================
    // 同步原生按钮状态
    // =========================

    const profileSpecificButtons = [
        'update_connection_profile',
        'reload_connection_profile',
        'delete_connection_profile'
    ];

    profileSpecificButtons.forEach(id => {

        const button =
            document.getElementById(id);

        if (!button) {
            return;
        }

        button.classList.toggle(
            'disabled',
            !selectedProfile
        );
    });


    // =========================
    // 如果删除的是当前 Profile
    // =========================
    //
    // 让 Connection Manager 自己的
    // change handler 处理：
    //
    // selectedProfile = null
    // → renderDetailsContent()
    // → CONNECTION_PROFILE_LOADED("<None>")
    //
    // 不手动复制这些内部逻辑。
    //

    if (deletedSelectedProfile) {

        profilesSelect.value = '';

        profilesSelect.dispatchEvent(
            new Event('change')
        );
    }
};


    const renderModalUI = () => {
    const body = $('#st-am-content-body');

    if (!body.length) {
        return;
    }

    body.empty();

    const canShowWorld =
        managerScope === 'all' ||
        managerScope === 'world';

    const canShowPreset =
        managerScope === 'all' ||
        managerScope === 'preset';

    const canShowAPI =
        managerScope === 'all' ||
        managerScope === 'api';

    const isWorld = currentTab === 'world';
    const isPreset = currentTab === 'preset';
    const isAPI = currentTab === 'api';
    const isRecycle = currentTab === 'recycle';


    // 如果当前入口不允许查看当前标签，
    // 自动切换到该入口允许的第一个页面。
    if (
                !isRecycle &&
        (
            (isWorld && !canShowWorld) ||
            (isPreset && !canShowPreset) ||
            (isAPI && !canShowAPI)
        )
    ) {
        currentTab =
            canShowWorld
                ? 'world'
                : canShowPreset
                    ? 'preset'
                    : canShowAPI
                        ? 'api'
                        : 'recycle';
    }


    const navButtons = [];


    // 世界书按钮
    if (canShowWorld) {

        navButtons.push(`
            <button
                class="menu_button st-am-tab-btn"
                data-tab="world"
                style="
                    flex:1;
                    margin:0;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    ${currentTab === 'world'
                        ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold; background:rgba(128,128,128,0.2);'
                        : ''
                    }
                "
            >
                ${SVG.book} 世界书分类
            </button>
        `);
    }


    // 预设按钮
    if (canShowPreset) {

        navButtons.push(`
            <button
                class="menu_button st-am-tab-btn"
                data-tab="preset"
                style="
                    flex:1;
                    margin:0;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    ${currentTab === 'preset'
                        ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold; background:rgba(128,128,128,0.2);'
                        : ''
                    }
                "
            >
                ${SVG.sliders} 预设分类
            </button>
        `);
    }

    
    // API / Connection Profile 按钮
    if (canShowAPI) {

        navButtons.push(`
            <button
                class="menu_button st-am-tab-btn"
                data-tab="api"
                style="
                    flex:1;
                    margin:0;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    ${currentTab === 'api'
                        ? 'border-color:var(--SmartThemeQuoteColor); font-weight:bold; background:rgba(128,128,128,0.2);'
                        : ''
                    }
                "
            >
                ${SVG.manage} API
            </button>
        `);
    }

    // 回收站始终显示
    navButtons.push(`
        <button
            class="menu_button st-am-tab-btn danger"
            data-tab="recycle"
            style="
                flex:0.8;
                margin:0;
                display:flex;
                align-items:center;
                justify-content:center;
                ${isRecycle
                    ? 'border-color:#dc3545; font-weight:bold; background:rgba(220,53,69,0.2);'
                    : ''
                }
            "
        >
            ${SVG.trash} 回收站 (${settings.recycleBin.length})
        </button>
    `);


    const navHtml = `
        <div
            style="
                display:flex;
                gap:8px;
                margin-bottom:12px;
                border-bottom:1px solid var(--SmartThemeBorderColor, #ccc);
                padding-bottom:8px;
            "
        >
            ${navButtons.join('')}
        </div>
    `;


    body.append(navHtml);
    

    if (isRecycle) {
        let recycleListHtml = '';
        if (settings.recycleBin.length === 0) {
            recycleListHtml = `<div style="text-align:center; padding:35px 0; opacity:0.6;">回收站空空如也</div>`;
        } else {
            settings.recycleBin.forEach((item, idx) => {
                const typeLabel =
    item.type === 'world'
        ? '世界书'
        : item.type === 'preset'
            ? '预设'
            : item.type === 'api'
                ? 'API'
                : '未知';
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

    let categoriesList;
if (isWorld) {
    categoriesList = settings.worldCategories;
} else if (isPreset) {
    categoriesList = settings.presetsCategories;
} else if (isAPI) {
    categoriesList = settings.apiCategories;
} else {
    categoriesList = [];
}

if (!Array.isArray(categoriesList)) {
    categoriesList = [];
    
if (isWorld) {
        settings.worldCategories = [];
    } else if (isPreset) {
        settings.presetsCategories = [];
    } else if (isAPI) {
        settings.apiCategories = [];
    }

    saveSettingsDebounced();
}

    
    let itemMap;
if (isWorld) {
    itemMap = settings.worldMap;
} else if (isPreset) {
    itemMap = settings.presetsMap;
} else if (isAPI) {
    itemMap = settings.apiMap;
} else {
    itemMap = {};
}
    
    let recycleType;
if (isWorld) {
    recycleType = 'world';
} else if (isPreset) {
    recycleType = 'preset';
} else {
    recycleType = 'api';
}

const recycledSet = new Set(
    settings.recycleBin
        .filter(r => r.type === recycleType)
        .map(r => isAPI ? r.id : r.name)
);

    
    let allItems = Object.keys(itemMap)
    .filter(k => !recycledSet.has(k));

if (isAPI) {

    // API 内部使用资源 ID。
    // 显示名称统一从 apiDisplayNames 获取。

    allItems = allItems.filter(
        id =>
            apiDisplayNames.has(
                String(id)
            )
    );
}

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
    <div
        style="
            display:flex;
            flex-direction:column;
            gap:6px;
            margin-bottom:12px;
        "
    >

        <input
            type="text"
            id="st-am-new-cat-input"
            class="text_pole"
            placeholder="新建分类名称..."
            style="
                width:100%;
                box-sizing:border-box;
                padding:6px 8px;
                font-size:0.85em;
            "
        >

        <div
            style="
                display:flex;
                gap:6px;
                width:100%;
            "
        >

            <button
                id="st-am-add-cat-btn"
                class="menu_button"
                style="
                    flex:1;
                    margin:0;
                    padding:6px 10px;
                    font-size:0.85em;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    white-space:nowrap;
                "
            >
                ${SVG.plus} 新建分类
            </button>

            <button
                id="st-am-rescan-btn"
                class="menu_button"
                style="
                    flex:1;
                    margin:0;
                    padding:6px 10px;
                    font-size:0.85em;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    white-space:nowrap;
                "
            >
                ${SVG.refresh} 重新扫描
            </button>

        </div>

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

    const worldSelectedCount = [...selectedItems].filter(itemKey =>
    itemKey.startsWith('world::')
).length;

const presetSelectedCount = [...selectedItems].filter(itemKey =>
    itemKey.startsWith('preset::')
).length;

const apiSelectedCount = [...selectedItems].filter(itemKey =>
    itemKey.startsWith('api::')
).length;


let selectedCountText = '未选择资源';


if (
    worldSelectedCount > 0 &&
    presetSelectedCount > 0 &&
    apiSelectedCount > 0
) {

    selectedCountText =
        `已选择 ${worldSelectedCount} 个世界书 / ` +
        `${presetSelectedCount} 个预设 / ` +
        `${apiSelectedCount} 个 API`;

} else if (
    worldSelectedCount > 0 &&
    presetSelectedCount > 0
) {

    selectedCountText =
        `已选择 ${worldSelectedCount} 个世界书 / ` +
        `${presetSelectedCount} 个预设`;

} else if (
    worldSelectedCount > 0 &&
    apiSelectedCount > 0
) {

    selectedCountText =
        `已选择 ${worldSelectedCount} 个世界书 / ` +
        `${apiSelectedCount} 个 API`;

} else if (
    presetSelectedCount > 0 &&
    apiSelectedCount > 0
) {

    selectedCountText =
        `已选择 ${presetSelectedCount} 个预设 / ` +
        `${apiSelectedCount} 个 API`;

} else if (worldSelectedCount > 0) {

    selectedCountText =
        `已选择 ${worldSelectedCount} 个世界书`;

} else if (presetSelectedCount > 0) {

    selectedCountText =
        `已选择 ${presetSelectedCount} 个预设`;

} else if (apiSelectedCount > 0) {

    selectedCountText =
        `已选择 ${apiSelectedCount} 个 API`;
}


const batchBarHtml = `
    <div
        style="
            display:flex;
            flex-direction:column;
            gap:8px;
            background:rgba(128,128,128,0.12);
            padding:8px 10px;
            border-radius:6px;
            margin-bottom:8px;
        "
    >

        <div
            style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:8px;
            "
        >

            <label
                style="
                    display:flex;
                    align-items:center;
                    cursor:pointer;
                    font-size:0.85em;
                    margin:0;
                "
            >
                <input
                    type="checkbox"
                    id="st-am-select-all"
                    style="margin-right:6px;"
                    ${
                        displayItems.length > 0 &&
                        displayItems.every(i =>
                            selectedItems.has(`${currentTab}::${i}`)
                        )
                            ? 'checked'
                            : ''
                    }
                >
                全选
            </label>

            <span
                style="
                    font-size:0.8em;
                    opacity:0.8;
                    text-align:right;
                "
            >
                ${selectedCountText}
            </span>

        </div>


        <div
            style="
                display:flex;
                gap:6px;
                align-items:center;
                width:100%;
            "
        >

            <select
                id="st-am-batch-move-sel"
                class="text_pole"
                style="
                    flex:1;
                    min-width:0;
                    font-size:0.8em;
                    padding:4px 6px;
                "
            >
                ${moveOptionsHtml}
            </select>

            <button
                id="st-am-batch-move-btn"
                class="menu_button"
                style="
                    margin:0;
                    padding:4px 8px;
                    font-size:0.8em;
                    white-space:nowrap;
                "
            >
                移动
            </button>

            <button
                id="st-am-batch-del-btn"
                class="menu_button danger"
                style="
                    margin:0;
                    padding:4px 8px;
                    font-size:0.8em;
                    white-space:nowrap;
                "
            >
                移入回收站
            </button>

        </div>

    </div>
`;

    let itemsListHtml = '';
    if (displayItems.length === 0) {
        itemsListHtml = `<div style="text-align:center; padding:35px 0; opacity:0.6; font-size:0.9em;">暂无条目，请点击上方“重新扫描”获取系统列表</div>`;
    } else {
        
        displayItems.forEach(name => {
    const itemKey = `${currentTab}::${name}`;
    const checked = selectedItems.has(itemKey) ? 'checked' : '';
    const currentCat = itemMap[name] || '未分类';

    let displayName = name;

if (isAPI) {

    displayName =
        apiDisplayNames.get(
            String(name)
        ) || name;
}
            itemsListHtml += `
                <label style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; margin-bottom:4px; border-radius:6px; background:rgba(128,128,128,0.06); cursor:pointer;">
                    <div style="display:flex; align-items:center; overflow:hidden; padding-right:10px;">
                        <input type="checkbox" class="st-am-item-cb" data-name="${name}" data-type="${currentTab}" ${checked} style="margin-right:8px;">
                        <span style="font-size:0.9em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${displayName}</span>
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
    <div id="st-am-modal-wrapper" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.65); z-index: 2147483647; display: none; justify-content: center; align-items: center; backdrop-filter: blur(4px); box-sizing: border-box; padding: 12px;">
        <div id="st-am-root" style="position: relative; width: 100%; max-width: 600px; max-height: 85vh; background: var(--SmartThemeBlurTintColor, #fff); color: var(--SmartThemeBodyColor, #222); border: 2px solid var(--SmartThemeQuoteColor, #888); border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.8); overflow: hidden;">
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
        e.preventDefault();
        e.stopPropagation();
        $("#st-am-modal-wrapper").css("display", "none");
    });

    $(document).off("click.stAmTab").on("click.stAmTab", ".st-am-tab-btn", function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentTab = $(this).data("tab");
        currentFilterCat = 'all';
        
        renderModalUI();
    });

    $(document).off("click.stAmFilter").on("click.stAmFilter", ".st-am-filter-cat", function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentFilterCat = String($(this).data("cat"));
        selectedItems.clear();
        renderModalUI();
    });

    $(document).off("click.stAmAddCat").on(
    "click.stAmAddCat",
    "#st-am-add-cat-btn",
    function(e) {

        e.preventDefault();
        e.stopPropagation();

        const val = $("#st-am-new-cat-input").val().trim();


        if (!val) {

            if (typeof toastr !== 'undefined') {
                toastr.warning("请先输入分类名称");
            }

            return;
        }


        const targetList =
    currentTab === 'world'
        ? settings.worldCategories
        : currentTab === 'preset'
            ? settings.presetsCategories
            : settings.apiCategories;


        if (!targetList.includes(val)) {

            targetList.push(val);

            saveSettingsDebounced();

            renderModalUI();

            if (typeof toastr !== 'undefined') {
                toastr.success(`已添加分类: ${val}`);
            }

        } else {

            if (typeof toastr !== 'undefined') {
                toastr.warning(`分类【${val}】已经存在`);
            }
        }
    }
);

    $(document).off("click.stAmDelCat").on("click.stAmDelCat", ".st-am-del-cat", function(e) {
        e.preventDefault();
        e.stopPropagation();
        const cat = String($(this).data("cat"));
        if (confirm(`确定要删除分类【${cat}】吗？\n该分类下的项目将自动退回“未分类”，不会删除实际文件。`)) {
            
            let targetList;
        let targetMap;

if (currentTab === 'world') {

    targetList = settings.worldCategories;
    targetMap = settings.worldMap;

} else if (currentTab === 'preset') {

    targetList = settings.presetsCategories;
    targetMap = settings.presetsMap;

} else if (currentTab === 'api') {

    targetList = settings.apiCategories;
    targetMap = settings.apiMap;

} else {

    return;
}
            
            const idx = targetList.indexOf(cat);
            if (idx !== -1) targetList.splice(idx, 1);
            Object.keys(targetMap).forEach(k => {
                if (targetMap[k] === cat) targetMap[k] = '';
            });
            if (currentFilterCat === cat) currentFilterCat = 'all';
            saveSettingsDebounced();
            renderModalUI();
            if (typeof toastr !== 'undefined') toastr.info(`已移除分类【${cat}】`);
        }
    });

    $(document).off("change.stAmItemCb").on("change.stAmItemCb", ".st-am-item-cb", function(e) {
    e.preventDefault();
    e.stopPropagation();

    const name = $(this).data('name');
    const type = $(this).data('type');

    const itemKey = `${type}::${name}`;

    if ($(this).is(':checked')) {
        selectedItems.add(itemKey);
    } else {
        selectedItems.delete(itemKey);
    }

    renderModalUI();
});

    $(document).off("change.stAmSelectAll").on(
    "change.stAmSelectAll",
    "#st-am-select-all",
    function(e) {

        e.preventDefault();
        e.stopPropagation();

        const isChecked = $(this).is(':checked');

        $('.st-am-item-cb').each(function() {

            $(this).prop('checked', isChecked);

            const name = String($(this).data("name"));
            const type = String($(this).data("type"));

            const itemKey = `${type}::${name}`;

            if (isChecked) {

                selectedItems.add(itemKey);

            } else {

                selectedItems.delete(itemKey);

            }
        });

        renderModalUI();
    }
);

    $(document).off("click.stAmBatchMove").on("click.stAmBatchMove", "#st-am-batch-move-btn", function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (selectedItems.size === 0) {
        if (typeof toastr !== 'undefined') {
            toastr.warning('请先勾选需要移动的项目');
        }
        return;
    }

    // 当前分类移动只允许处理同一种资源。
    // 世界书和预设混合选择时，不执行分类移动，
    // 避免把资源移动到错误的分类表里。
    const selectedTypes = new Set();

    selectedItems.forEach(itemKey => {
        const separatorIndex = itemKey.indexOf('::');

        if (separatorIndex === -1) {
            return;
        }

        const type = itemKey.substring(0, separatorIndex);
        selectedTypes.add(type);
    });

    if (selectedTypes.size > 1) {
        if (typeof toastr !== 'undefined') {
            toastr.warning(
                '当前同时选择了世界书和预设。\n\n' +
                '分类移动一次只能处理一种资源，' +
                '请分别移动。'
            );
        }
        return;
    }

    const targetCat = $("#st-am-batch-move-sel").val();

    const onlyType = [...selectedTypes][0];

    if (
    onlyType !== 'world' &&
    onlyType !== 'preset' &&
    onlyType !== 'api'
) {
    if (typeof toastr !== 'undefined') {
        toastr.warning('无法识别所选资源类型');
    }
    return;
}

let targetMap;

if (onlyType === 'world') {
    targetMap = settings.worldMap;

} else if (onlyType === 'preset') {
    targetMap = settings.presetsMap;

} else if (onlyType === 'api') {
    targetMap = settings.apiMap;
}

    selectedItems.forEach(itemKey => {

        const separatorIndex = itemKey.indexOf('::');

        if (separatorIndex === -1) {
            return;
        }

        const type = itemKey.substring(0, separatorIndex);
        const name = itemKey.substring(separatorIndex + 2);

        // 双重保险：
        // 只有当前类型的资源才允许进入对应分类表。
        if (type === onlyType) {
            targetMap[name] = targetCat;
        }
    });

    selectedItems.clear();

    saveSettingsDebounced();
    renderModalUI();

    if (typeof toastr !== 'undefined') {
        toastr.success('已完成批量移动！');
    }
});


$(document).off("click.stAmBatchDel").on(
    "click.stAmBatchDel",
    "#st-am-batch-del-btn",
    function(e) {

    e.preventDefault();
    e.stopPropagation();

    if (selectedItems.size === 0) {

        if (typeof toastr !== 'undefined') {
            toastr.warning('请先勾选要移入回收站的项目');
        }

        return;
    }


    // =========================
    // 统计所有资源类型
    // =========================

    let worldCount = 0;
    let presetCount = 0;
    let apiCount = 0;

    selectedItems.forEach(itemKey => {

        const separatorIndex = itemKey.indexOf('::');

        if (separatorIndex === -1) {
            return;
        }

        const type = itemKey.substring(0, separatorIndex);

        if (type === 'world') {
            worldCount++;

        } else if (type === 'preset') {
            presetCount++;

        } else if (type === 'api') {
            apiCount++;
        }

    });

    const totalCount =
        worldCount +
        presetCount +
        apiCount;
        

    // =========================
    // 二次确认
    // =========================

    let summary =
        '确定将以下资源移入回收站吗？\n\n';

    if (worldCount > 0) {

        summary +=
            `世界书：${worldCount} 个\n`;
    }

    if (presetCount > 0) {

        summary +=
            `预设：${presetCount} 个\n`;
    }

    if (apiCount > 0) {

        summary +=
            `API：${apiCount} 个\n`;
    }

    summary +=
        `\n共计：${totalCount} 个\n\n` +
        '移入回收站后仍然可以恢复。';
        
    if (!confirm(summary)) {
        return;
    }


    // =========================
    // 写入回收站
    // =========================

    selectedItems.forEach(itemKey => {

        const separatorIndex =
            itemKey.indexOf('::');

        if (separatorIndex === -1) {
            return;
        }

        const type =
            itemKey.substring(0, separatorIndex);

        const name =
            itemKey.substring(separatorIndex + 2);

        
        // =========================
        // 世界书
        // =========================

        if (type === 'world') {

            const targetMap =
                settings.worldMap;

            settings.recycleBin.push({

                type: 'world',

                name: name,

                oldCat:
                    targetMap[name] || ''

            });

            return;
        }


        // =========================
        // 预设
        // =========================

        if (type === 'preset') {

            const targetMap =
                settings.presetsMap;

            settings.recycleBin.push({

                type: 'preset',

                name: name,

                oldCat:
                    targetMap[name] || ''

            });

            return;
        }


        // =========================
        // API / Connection Profile
        // =========================

        if (type === 'api') {

            const targetMap =
                settings.apiMap;

            // API 的内部唯一标识是 Profile ID。
            //
            // name 在这里是 selectedItems 里的 Profile ID。
            // 真正显示给用户的名称需要从当前 Profile的非敏感字段 name 获取。
            
            const profile =
                extension_settings
                    .connectionManager
                    ?.profiles
                    ?.find(
                        p =>
                            String(p.id) === String(name)
                    );


            const profileName =
                profile?.name
                    ? String(profile.name)
                    : String(name);


            settings.recycleBin.push({

                type: 'api',

                // 永远使用 Profile ID 作为唯一标识
                id: String(name),

                // 这里只保存显示名称
                name: profileName,

                // 保存原来的分类
                oldCat:
                    targetMap[name] || ''

            });


            return;
        }

    });


    selectedItems.clear();

    saveSettingsDebounced();

    renderModalUI();
        

    if (typeof toastr !== 'undefined') {

        toastr.warning(
            `已将 ${totalCount} 个资源移入回收站`
        );

    }

});
    

    $(document).off("click.stAmRestore").on(
    "click.stAmRestore",
    ".st-am-restore-btn",
    function(e) {

    e.preventDefault();
    e.stopPropagation();

    const idx =
        parseInt(
            $(this).data("idx"),
            10
        );

    if (
        isNaN(idx) ||
        !settings.recycleBin[idx]
    ) {
        return;
    }

    const item =
        settings.recycleBin[idx];


    // =========================
    // 世界书
    // =========================

    if (item.type === 'world') {

        settings.worldMap[item.name] =
            item.oldCat || '';
    }


    // =========================
    // 预设
    // =========================

    else if (item.type === 'preset') {
        
        settings.presetsMap[item.name] =
            item.oldCat || '';
    }


    // =========================
    // API
    // =========================

    else if (item.type === 'api') {
        
        // API 必须使用 Profile ID
        // 作为 apiMap 的 key。

        if (item.id) {
            settings.apiMap[String(item.id)] =
                item.oldCat || '';
        }

    }


    // =========================
    // 未知类型
    // =========================

    else {
        if (typeof toastr !== 'undefined') {
            toastr.error(
                `无法恢复未知资源类型：${item.type}`
            );

        }
        return;
    }


    settings.recycleBin.splice(idx, 1);


    saveSettingsDebounced();


    // 重新扫描真实资源
    scanResources();
    scanAPIProfiles();


    renderModalUI();


    if (typeof toastr !== 'undefined') {

        toastr.success(
            `已还原: ${item.name}`
        );

    }

});
    

    $(document).off("click.stAmEmptyRecycle").on(
    "click.stAmEmptyRecycle",
    "#st-am-empty-recycle-btn",
    async function(e) {

    e.preventDefault();
    e.stopPropagation();

    if (settings.recycleBin.length === 0) {
        return;
    }

    const confirmed = confirm(
        "⚠️ 确定彻底清空回收站吗？\n\n" +
        "这里的资源将被从 SillyTavern 中永久删除。\n" +
        "删除后无法通过本插件恢复。\n\n" +
        "确定要继续吗？"
    );

    if (!confirmed) {
        return;
    }


    // 保存本次操作时的回收站快照。
    // 后面的删除全部基于这个快照进行。
    const recycleItems = [...settings.recycleBin];

    let successCount = 0;
    let failedItems = [];
// 本次批量删除中，是否删除了当前正在使用的 Profile
    let deletedSelectedAPIProfile = false;

    for (const item of recycleItems) {

        try {

            // =========================
            // 删除世界书
            // =========================

            if (item.type === 'world') {

                const result =
                    await deleteWorldInfo(item.name);

                if (result === false) {
                    throw new Error(
                        `世界书删除失败：${item.name}`
                    );
                }

                delete settings.worldMap[item.name];

                successCount++;
            }


            // =========================
            // 删除 OpenAI / Chat Completion 预设
            // =========================

    else if (item.type === 'preset') {

    // 优先使用 SillyTavern 原生 PresetManager。
    // 不直接调用 /api/presets/delete，
    // 避免绕过原生预设状态与 UI 同步逻辑。

    const context = getContext();

    const getPresetManager =
        context?.getPresetManager;

    if (
        typeof getPresetManager !== 'function'
    ) {
        throw new Error(
            '当前 SillyTavern 未提供 PresetManager 接口'
        );
    }

    const presetManager =
        getPresetManager('openai');

    if (!presetManager) {
        throw new Error(
            '找不到 OpenAI PresetManager'
        );
    }


    // 确认这个预设确实存在。
    const presetExists =
        typeof presetManager.findPreset === 'function'
            ? presetManager.findPreset(item.name)
            : null;

    if (
        presetExists === undefined ||
        presetExists === null
    ) {
        throw new Error(
            `找不到 OpenAI 预设：${item.name}`
        );
    }


    // 直接调用 ST 原生删除流程。
    // 这里由 PresetManager 自己负责：
    // - 原生预设列表
    // - 内存中的 preset 数据
    // - 当前选中项
    // - CSRF 请求头
    // - /api/presets/delete
    const result =
        await presetManager.deletePreset(
            item.name
        );


    // 不同 ST 版本的 deletePreset()
    // 返回值可能不同。
    // 如果明确返回 false，才判定失败。
    if (result === false) {

        throw new Error(
            `预设删除失败：${item.name}`
        );
    }


    // Explorer 自己的分类映射删除。
    delete settings.presetsMap[
        item.name
    ];


    successCount++;
}


            // =========================
            // 删除 Connection Profile / API
            // =========================

            else if (item.type === 'api') {

                // API 永远使用 Profile ID 定位。
                //
                // 不使用 item.name 查找。
                // item.name 仅用于界面显示。

                if (!item.id) {
                    throw new Error(
                        `API Profile 缺少 ID：${item.name}`
                    );
                }

                const profiles =
                    extension_settings
                        .connectionManager
                        ?.profiles;

                if (!Array.isArray(profiles)) {
                    throw new Error(
                        '无法访问 Connection Manager 的 Profile 列表'
                    );
                }

                const profileIndex =
                    profiles.findIndex(
                        profile =>
                            String(profile.id) ===
                            String(item.id)
                    );

                // 找不到原 Profile 时，不删除任何其他 Profile。
                if (profileIndex === -1) {

                    throw new Error(
                        `找不到 Connection Profile：${item.name} ` +
                        `(ID: ${item.id})`
                    );
                }

                // 保存被删除的 Profile 引用，
                // 仅用于发送官方删除事件。
                // 注意：
                // 这里不会读取、复制或保存 API Key、
                // secret-id、api-url 等敏感字段。
                const deletedProfile =
                    profiles[profileIndex];


                // =========================
                // 删除 Profile
                // =========================

                profiles.splice(
                    profileIndex,
                    1
                );

                // 如果删除的是当前正在使用的 Profile，
                // 清空当前选中的 Profile。
                const selectedProfile =
                    extension_settings
                        .connectionManager
                        ?.selectedProfile;

                if (
                    String(selectedProfile) ===
                    String(item.id)
             ) {

                    deletedSelectedAPIProfile = true;

                    extension_settings
                       .connectionManager
                       .selectedProfile = null;
                 }


                // 保存 Connection Manager 设置。
                saveSettingsDebounced();

                // 通知 Connection Manager：
                // Profile 已被删除。
                //
                // 使用当前 ST 的事件系统。
                if (
                    typeof eventSource !== 'undefined' &&
                    typeof event_types !== 'undefined' &&
                    event_types.CONNECTION_PROFILE_DELETED
                ) {

                    eventSource.emit(
                        event_types.CONNECTION_PROFILE_DELETED,
                        deletedProfile
                    );

                }


                // Explorer 自己的 API 分类映射也删除。
                delete settings.apiMap[
                    String(item.id)
                ];

                successCount++;
            }


            // =========================
            // 未知类型
            // =========================

            else {
                throw new Error(
                    `未知资源类型：${item.type}`
                );
            }


        } catch (err) {

            console.error(
                '[Explorer-NFL] 永久删除资源失败:',
                item,
                err
            );

            failedItems.push(item);
        }
    }


    // =========================
    // 只从回收站移除真正删除成功的项目
    // =========================

    const failedSet = new Set(
        failedItems.map(item => {

            if (item.type === 'api') {

                return (
                    `api::${String(item.id)}`
                );

            }

            return (
                `${item.type}::${item.name}`
            );
        })
    );

    settings.recycleBin =
        settings.recycleBin.filter(item => {

            let key;

            if (item.type === 'api') {

                key =
                    `api::${String(item.id)}`;

            } else {

                key =
                    `${item.type}::${item.name}`;
            }

            return failedSet.has(key);
        });


    saveSettingsDebounced();


    // 重新扫描真实资源
    scanResources();
    scanAPIProfiles();

// 同步 SillyTavern 原生 Connection Profile UI
syncConnectionProfileUI(
    deletedSelectedAPIProfile
);

    renderModalUI();


    // =========================
    // 删除结果提示
    // =========================

    if (failedItems.length === 0) {

        if (typeof toastr !== 'undefined') {

            toastr.success(
                `已永久删除 ${successCount} 个资源。`
            );
        }

    } else {

        if (typeof toastr !== 'undefined') {

            toastr.warning(
                `已删除 ${successCount} 个资源，` +
                `${failedItems.length} 个资源删除失败，` +
                `仍保留在回收站。`
            );
        }
    }

});

    
    $(document).off("click.stAmRescan").on("click.stAmRescan", "#st-am-rescan-btn", async function(e) {
        e.preventDefault();
        e.stopPropagation();
        scanResources();
        await scanAPIProfiles();
        renderModalUI();
        
        if (typeof toastr !== 'undefined') toastr.info('扫描完成！');
    });
};

const openManagerModal = async (
    targetTab = 'world',
    scope = 'all'
) => {
    try {
        console.log("[Explorer-NFL] 打开管理面板");

        // 保存当前入口允许查看的范围
        // all    = 世界书 + 预设 + 回收站
        // world  = 世界书 + 回收站
        // preset = 预设 + 回收站
        managerScope = scope;

        currentTab = targetTab;

        // 每次打开面板时清空之前选中的项目
        selectedItems.clear();

        console.log("[Explorer-NFL] managerScope:", managerScope);
        console.log("[Explorer-NFL] currentTab:", currentTab);

        console.log("[Explorer-NFL] scanResources");
scanResources();

console.log("[Explorer-NFL] scanAPIProfiles");
await scanAPIProfiles();

console.log("[Explorer-NFL] renderModalUI");
renderModalUI();

        console.log("[Explorer-NFL] 显示窗口");
        $("#st-am-modal-wrapper").css("display", "flex");

    } catch (err) {

        console.error(
            "[Explorer-NFL] 打开面板失败:",
            err
        );

        alert(
            "Explorer-NFL错误:\n\n" +
            err.message +
            "\n\n" +
            err.stack
        );
    }
};

const injectButtons = () => {
    const mode = settings.entryMode || 'both';

    // =========================
    // 预设界面按钮
    // =========================
    if (mode === 'native' || mode === 'both') {

        const presetEl = $(
            '#openai_preset, ' +
            '#chat_completion_preset, ' +
            '#settings_preset, ' +
            'select[id*="preset"]'
        ).filter(':visible').first();

        if (presetEl.length && !$('#st-am-btn-preset').length) {

            const container =
                presetEl.closest('.flex-container').length
                    ? presetEl.closest('.flex-container')
                    : presetEl.parent();

            container.after(`
                <div id="st-am-btn-preset"
                class="menu_button st-am-native-btn"
                style="
                width:100%;
                margin:8px 0;
                box-sizing:border-box;
                display:flex;
                justify-content:center;
                align-items:center;">
                    ${SVG.sliders}
                    批量管理预设
                </div>
            `);
        }

    } else {
        $('#st-am-btn-preset').remove();
    }



    // =========================
    // 世界书按钮
    // =========================
   if (mode === 'native' || mode === 'both') {

    const worldBox = $('#world_info');

if (worldBox.length && !$('#st-am-btn-world').length) {

    worldBox.parent().prepend(`
        <div id="st-am-btn-world"
        class="menu_button st-am-native-btn"
        style="
        width:100%;
        margin:8px 0;
        box-sizing:border-box;
        display:flex;
        justify-content:center;
        align-items:center;">
            ${SVG.book}
            批量管理世界书
        </div>
    `);

}

} else {

    $('#st-am-btn-world').remove();

}

    // =========================
    // Connection Profile / API 按钮
    // =========================

    if (mode === 'native' || mode === 'both') {

        const profileBox = $('#connection_profiles');

        if (
            profileBox.length &&
            !$('#st-am-btn-api').length
        ) {

            const container =
                profileBox.closest('.flex-container').length
                    ? profileBox.closest('.flex-container')
                    : profileBox.parent();

            container.after(`
                <div
                    id="st-am-btn-api"
                    class="menu_button st-am-native-btn"
                    style="
                        width:100%;
                        margin:8px 0;
                        box-sizing:border-box;
                        display:flex;
                        justify-content:center;
                        align-items:center;
                    "
                >
                    ${SVG.manage}
                    批量管理 API
                </div>
            `);
        }

    } else {

        $('#st-am-btn-api').remove();

    }

    // =========================
    // 魔法棒入口
    // =========================
    if (mode === 'magic' || mode === 'both') {


        // 新版 ST 不再可靠使用文字匹配
        // 直接找扩展菜单容器

        const menu =
            $('#extensionsMenu').length
                ? $('#extensionsMenu')
                : $('.extensions_menu').first();


        if (menu.length && !$('#st-am-btn-magic').length) {

            menu.append(`
                <div id="st-am-btn-magic"
                class="st-am-native-btn"
                style="
                cursor:pointer;
                display:flex;
                width:100%;
                box-sizing:border-box;
                margin:4px 0;
                padding:8px 12px;
                justify-content:flex-start;">
                    ${SVG.manage}
                    <span>
                    资源管理器
                    </span>
                </div>
            `);

        }


    } else {

        $('#st-am-btn-magic').remove();

    }

};

jQuery(async () => {

    // =========================
    // TT Adapter 只读测试
    // =========================

    try {

    if (isTauriTavern()) {

        const connections =
            await listTauriTavernLLMConnections();

        if (typeof toastr !== 'undefined') {
            toastr.success(
                `TT Adapter 读取成功：${connections.length} 个 LLM Connection`
            );
        }

    }

} catch (err) {

    console.error(
        `[${extName}][TT Adapter] LLM Connection 读取失败：`,
        err
    );

    if (typeof toastr !== 'undefined') {
        toastr.error(
            `TT Adapter 读取失败：${err?.message || err}`
        );
    }
}


    mountUIRoot();


    $(document).off("click.stAmBtn").on("click.stAmBtn", "#st-am-btn-preset", function(e) {
        e.preventDefault();
        e.stopPropagation();
        openManagerModal('preset', 'preset');
    });

    $(document).off("click.stAmWorldBtn").on("click.stAmWorldBtn", "#st-am-btn-world", function(e) {
        e.preventDefault();
        e.stopPropagation();
        openManagerModal('world', 'world');
    });

    $(document)
        .off("click.stAmApiBtn")
        .on(
            "click.stAmApiBtn",
            "#st-am-btn-api",
            function(e) {

                e.preventDefault();
                e.stopPropagation();

                openManagerModal('api', 'api');
            }
        );

   $(document)
    .off("click.stAmMagicBtn")
    .on(
        "click.stAmMagicBtn",
        "#st-am-btn-magic",
        function(e) {

            e.preventDefault();
            e.stopPropagation();

            // 魔法棒入口：允许查看全部资源
            openManagerModal('world', 'all');

            $(this)
                .closest(
                    'div[style*="position"], .popup, .dropdown'
                )
                .hide();
        }
    );

    setInterval(injectButtons, 500);


eventSource.on(event_types.APP_READY, () => {
    injectButtons();
});

eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, () => {
    setTimeout(() => {
        injectButtons();
    }, 300);
});

    // 加载扩展设置面板（新版 SillyTavern 推荐方式）
    try {
        const { renderExtensionTemplateAsync } = getContext();

        const html = await renderExtensionTemplateAsync(
            `third-party/${extName}`,
            'settings'
        );

        $('#extensions_settings2').append(html);

        $("#st-am-extension-settings .inline-drawer-toggle")
            .off("click.stAmDrawer")
            .on("click.stAmDrawer", function(e) {
                e.preventDefault();
                e.stopPropagation();

                const icon = $(this).find(".inline-drawer-icon");
                const content = $(this).siblings(".inline-drawer-content");

                icon.toggleClass("down up");
                content.slideToggle(200);
            });

        if (settings.entryMode) {
            $("#st-am-entry-mode").val(settings.entryMode);
        }

        $("#st-am-save-btn").off("click").on("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            settings.entryMode = $("#st-am-entry-mode").val();
            saveSettingsDebounced();

            if (typeof toastr !== 'undefined') {
                toastr.success("设置已保存！");
            }
        });

        $("#st-am-test-open-btn")
    .off("click")
    .on("click", (e) => {

        e.preventDefault();
        e.stopPropagation();

        // 横边栏入口：允许查看全部资源
        openManagerModal('world', 'all');
    });

        if (typeof toastr !== 'undefined') {
            toastr.success("Explorer-NFL 加载成功！");
        }

    } catch (err) {
        console.error(`[${extName}] 设置面板加载失败:`, err);
    }
});
