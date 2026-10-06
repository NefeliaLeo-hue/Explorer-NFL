// SillyTavern UI theme adapter.
// Theme changes go through the native #themes change handler.

export const listSillyTavernThemes = () => {
    const select = document.querySelector('#themes');

    if (!select) {
        return [];
    }

    return [...select.options]
        .map(option => String(option.value || '').trim())
        .filter(Boolean);
};

export const applySillyTavernTheme = name => {
    const select = document.querySelector('#themes');

    if (!select || ![...select.options].some(option => option.value === name)) {
        throw new Error(`找不到酒馆主题：${name}`);
    }

    select.value = name;
    select.dispatchEvent(new Event('change', { bubbles: true }));
};

export const deleteSillyTavernTheme = async (name, requestHeaders) => {
    const response = await fetch('/api/themes/delete', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        throw new Error(`主题删除失败：${name}（${response.status}）`);
    }

    const select = document.querySelector('#themes');
    const option = [...(select?.options || [])]
        .find(candidate => candidate.value === name);

    option?.remove();
};
