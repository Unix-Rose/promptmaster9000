import { appWindow } from '@tauri-apps/api/window';
import { register } from '@tauri-apps/api/globalShortcut';
import { join, appDataDir } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { preferences, paths } from '../cache';
import { createPromptsTable } from './database';
import { createDashboardWindow, getDashboardWindow } from './window';
import { IPrompt } from '../types/Prompt.types';

export const fetchPreferencesData = async () => {
  const preferencesData = await readTextFile(await join(paths.get('appDataDirPath'), 'preferences.json')).then(
    (data) => JSON.parse(data),
  );
  Object.keys(preferencesData).forEach((key) => {
    preferences.set(key, preferencesData[key]);
  });
};

export const listenForHotkey = async (shortcut: string) => {
  await register(shortcut, async () => {
    if (document.hasFocus()) {
      await appWindow.hide();
    } else {
      await appWindow.show();
      await appWindow.center();
      await appWindow.setFocus();
    }
  });
};

export const initialiseApp = async () => {
  await createPromptsTable();
  paths.set('appDataDirPath', await appDataDir());
  await fetchPreferencesData();
  await invoke('init_ns_panel', {
    appShortcut: preferences.get('shortcut'),
  });
  createDashboardWindow();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      appWindow.hide();
    }
  });

  document.onkeyup = (event) => {
    if (event.metaKey && event.key === 'n') {
      getDashboardWindow()?.show();
      getDashboardWindow()?.setFocus();
    }
  };

  document.onblur = async () => {
    await appWindow.hide();
  };

  await listen('showDashboard', () => {
    getDashboardWindow()?.show();
  });

  await listen('showApp', () => {
    // document.getElementById('search-input')!.focus();
  });

  await invoke('launch_on_login', {
    enable: preferences.get('launch_on_login'),
  });
};

export const filterPrompts = (prompts: IPrompt[], searchInput: string): IPrompt[] => {
  const filteredPrompts = prompts.filter((prompt) => {
    const promptNameMatches = prompt.promptName.toLowerCase().includes(searchInput.toLowerCase());
    const promptMatches = prompt.prompt.toLowerCase().includes(searchInput.toLowerCase());
    return promptNameMatches || promptMatches;
  });

  return filteredPrompts;
};
