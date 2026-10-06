import {
    isTauriTavern,
    listTauriTavernThemes,
    applyTauriTavernTheme,
    deleteTauriTavernTheme,
} from './tt.js';
import {
    listSillyTavernThemes,
    applySillyTavernTheme,
    deleteSillyTavernTheme,
} from './st.js';

export const getThemeAdapter = () => {
    if (isTauriTavern()) {
        return {
            list: listTauriTavernThemes,
            apply: applyTauriTavernTheme,
            delete: deleteTauriTavernTheme,
        };
    }

    return {
        list: listSillyTavernThemes,
        apply: applySillyTavernTheme,
        delete: deleteSillyTavernTheme,
    };
};
