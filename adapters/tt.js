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

const waitForTauriTavernReady = async (
    timeoutMs = 5000
) => {

    if (!isTauriTavern()) {

        return null;

    }

    const startTime = Date.now();

    while (
        Date.now() - startTime <
        timeoutMs
    ) {
        
        const host =
            getTauriTavernHost();

        if (host) {

            const ready =
                host?.ready ??
                window.__TAURITAVERN_MAIN_READY__ ??
                null;

            if (
                ready &&
                typeof ready.then === 'function'
            ) {

                try {

                    await ready;

                } catch (err) {

                    console.warn(
                        '[Explorer-NFL][TT] TT ready Promise rejected:',
                        err
                    );
                }
            }

            const api =
                host?.api?.llmConnections;

            if (
                api &&
                typeof api.list === 'function'
            ) {
                return host;
            }
        }

        await new Promise(
            resolve =>
                setTimeout(resolve, 100)
        );
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

// =========================
// 只读：列出 LLM Connections
// =========================
//
// TT 官方 list() 返回 Connection summaries。
// Explorer 只留下：
// id
// displayName → name
// kind
//
// 不把原始 DTO 整体交给 Explorer。
// =========================

export const listTauriTavernLLMConnections =
    async () => {

        const api =
            await getTauriTavernLLMConnectionsAPI();

        if (!api) {

            throw new Error(
                'TT LLM Connection Public API 尚未就绪'
            );
        }

        const result =
            await api.list();

        let connections;

        if (
            Array.isArray(
                result?.connections
            )
        ) {
            
            connections =
                result.connections;

        } else if (
            Array.isArray(result)
        ) {

            // 兼容少数旧版 / 非标准实现
            connections = result;

        } else {

            throw new Error(
                'TT llmConnections.list() 返回的数据格式无法识别'
            );

        }

        return connections

            .filter(
                connection =>
                    connection &&
                    connection.id
            )

            .map(connection => {

                const id =
                    String(
                        connection.id
                    );

                const name =
                    String(
                        connection.displayName ||
                        connection.name ||
                        ''
                    ).trim();

                return {
                    id,
                    name:
                        name || id,

                    kind:
                        id.startsWith(
                            'model-target-'
                        )
                            ? 'model-target'
                            : 'connection'

                };
            });
    };
