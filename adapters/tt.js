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

        // =========================
        // TT 扫描诊断
        // =========================

        const report = (
            message,
            type = 'info'
        ) => {

            const text =
                `[Explorer-NFL][TT诊断] ${message}`;

            console.log(text);

            if (
                typeof toastr !== 'undefined'
            ) {

                if (
                    type === 'error'
                ) {

                    toastr.error(message);

                } else if (
                    type === 'warning'
                ) {

                    toastr.warning(message);

                } else {

                    toastr.info(message);

                }

            }

        };


        report(
            '开始检查 TT Public ABI...'
        );


        const host =
            await waitForTauriTavernReady();


        // =========================
        // 检查 Host
        // =========================

        if (!host) {

            report(
                'Host = 不存在。window.__TAURITAVERN__ 未获取到。',
                'error'
            );

            throw new Error(
                'TT Host 不存在'
            );

        }


        report(
            'Host = 存在。'
        );


        // =========================
        // 检查 API
        // =========================

        const api =
            host?.api?.llmConnections;


        if (!api) {

            report(
                'llmConnections = 不存在。',
                'error'
            );

            throw new Error(
                'TT Public API：llmConnections 不存在'
            );

        }


        report(
            'llmConnections = 存在。'
        );


        // =========================
        // 检查 list()
        // =========================

        const listType =
            typeof api.list;


        report(
            `llmConnections.list 类型 = ${listType}`
        );


        if (
            listType !== 'function'
        ) {

            report(
                'list() 不是 function。',
                'error'
            );

            throw new Error(
                'TT llmConnections.list() 不可调用'
            );

        }


        // =========================
        // 真正调用 list()
        // =========================

        let result;

        try {

            result =
                await api.list();

        } catch (err) {

            report(
                `list() 调用失败：${err?.message || err}`,
                'error'
            );

            throw err;

        }


        // =========================
        // 判断返回结构
        // =========================

        let connections;


        if (
            Array.isArray(
                result?.connections
            )
        ) {

            connections =
                result.connections;

            report(
                `list() 返回标准结构：{ connections }，数量 = ${connections.length}`
            );

        } else if (
            Array.isArray(result)
        ) {

            connections =
                result;

            report(
                `list() 返回数组结构，数量 = ${connections.length}`,
                'warning'
            );

        } else {

            report(
                'list() 返回的数据结构无法识别。',
                'error'
            );

            throw new Error(
                'TT llmConnections.list() 返回的数据格式无法识别'
            );

        }


        // =========================
        // 诊断返回的名称
        // =========================

        const debugNames =
            connections

                .slice(0, 5)

                .map(
                    connection =>
                        String(
                            connection?.displayName ||
                            connection?.name ||
                            ''
                        ).trim()
                )

                .filter(
                    name => name
                );


        if (
            debugNames.length > 0
        ) {

            report(
                `收到的前 ${debugNames.length} 个连接名称：` +
                debugNames.join(' | ')
            );

        } else {

            report(
                '收到 Connection 列表，但没有任何可显示名称。',
                'warning'
            );

        }


// =========================
// 临时诊断：读取 TT Model Target
// =========================
//
// 注意：
// 这里只读取非敏感摘要：
// - id
// - name
// - kind
// - mode
//
// 不读取：
// - API Key
// - Secret 本体
// - secretRef
// - URL
// - endpoint
// - 完整 Connection Definition
//
// 这一段只是为了定位当前 TT UI 与
// llmConnections.list() 为什么出现不同步。
// =========================

try {

    const context =
        window.SillyTavern?.getContext?.();


    const modelTargets =
        context
            ?.extensionSettings
            ?.connectionManager
            ?.modelTargets;


    if (
        Array.isArray(modelTargets)
    ) {

        const ccTargets =
            modelTargets
                .filter(
                    target =>
                        target?.kind ===
                            'tauritavern.modelTarget' &&
                        target?.mode === 'cc'
                );


        report(
            `Model Target 数量 = ${ccTargets.length}`
        );


        const targetNames =
            ccTargets

                .slice(0, 5)

                .map(
                    target => {

                        const id =
                            String(
                                target?.id || ''
                            ).trim();

                        const name =
                            String(
                                target?.name || ''
                            ).trim();

                        return (
                            name ||
                            id ||
                            '(无名称)'
                        );

                    }
                )

                .filter(
                    value => value
                );


        if (
            targetNames.length > 0
        ) {

            report(
                `前 ${targetNames.length} 个 Model Target：` +
                targetNames.join(' | ')
            );

        } else {

            report(
                'Model Target 列表存在，但没有可显示名称。',
                'warning'
            );

        }

    } else {

        report(
            'Model Target = 无法读取或不是数组。',
            'warning'
        );

    }

} catch (err) {

    report(
        `Model Target 诊断失败：${err?.message || err}`,
        'warning'
    );

}



        

        // =========================
        // 转换成 Explorer 安全对象
        // =========================

        return connections

            .filter(
                connection =>
                    connection &&
                    connection.id
            )

            .map(
                connection => {

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

                }
            );

    };
