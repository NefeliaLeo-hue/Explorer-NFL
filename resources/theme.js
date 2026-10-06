import { getThemeAdapter } from '../adapters/index.js';

export const listThemes = () => getThemeAdapter().list();

export const applyTheme = async (name, context) =>
    getThemeAdapter().apply(name, context);

export const deleteTheme = async (name, requestHeaders) =>
    getThemeAdapter().delete(name, requestHeaders);
