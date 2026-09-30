// =========================
// TauriTavern Adapter
// =========================
//
// Explorer-NFL 第一个平台适配模块。
//
// 当前只实现：
// - 判断是否运行在 TauriTavern
// - 等待 TT Public ABI 就绪
// - 读取 LLM Connections
//
// 暂时不执行：
// - save
// - delete
//
// 安全保护：
// - 不读取 API Key
// - 不读取 Secret 本体
// - 不复制完整 Connection Definition
// - 不保存 TT Connection 数据
//
// 返回给 Explorer 的只是一组：
// {
//     id: string,
//     name: string
// }
//
// TT Public ABI：
// window.__TAURITAVERN__
// =========================


// =========================
// 获取 TT Host
// =========================

const getTauriTavernHost = () => {

    if (typeof window === 'undefined') {
        return null;
    }

    return (
        window.__TAURITAVERN__ ||
        null
    );
};


// =========================
// 判断是否为 TauriTavern
// =========================

export const isTauriTavern = () => {

    if (typeof window === 'undefined') {
        return false;
    }

    return Boolean(
        window.__TAURITAVERN__ ||
        window.__TAURITAVERN_MAIN_READY__
    );
};


// =========================
// 等待 TT Public ABI 就绪
// =========================

const waitForTauriTavernReady = async () => {

    if (!isTauriTavern()) {
        return null;
    }

    const host =
        getTauriTavernHost();

    const readyPromise =
        host?.ready ??
        window.__TAURITAVERN_MAIN_READY__ ??
        null;

    if (readyPromise) {
        await readyPromise;
    }

    return getTauriTavernHost();
};


// =========================
// 获取 LLM Connection API
// =========================

const getTauriTavernLLMConnectionsAPI = async () => {

    const host =
        await waitForTauriTavernReady();

    if (!host) {
        return null;
    }

    const api =
        host?.api?.llmConnections;

    if (
        !api ||
        typeof api.list !== 'function'
    ) {
        return null;
    }

    return api;
};


// =========================
// 只读：列出 LLM Connections
// =========================
//
// TT 官方 list() 返回 Connection summaries。
// Explorer 只留下：
// id
// displayName → name
//
// 不把原始 DTO 整体交给 Explorer。
// =========================

export const listTauriTavernLLMConnections =
    async () => {

    const api =
        await getTauriTavernLLMConnectionsAPI();

    if (!api) {
        return [];
    }

    const result =
        await api.list();

    const connections =
        Array.isArray(result?.connections)
            ? result.connections
            : [];

    return connections
        .filter(connection =>
            connection &&
            connection.id
        )
        .map(connection => {

            const id =
                String(connection.id);

            const name =
                String(
                    connection.displayName || ''
                ).trim();

            return {
                id,
                name: name || id
            };
        });
};
