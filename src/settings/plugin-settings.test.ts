import {
  describe,
  expect,
  it
} from 'vitest';

import { PluginSettings } from './plugin-settings.ts';

const DEFAULT_MOBILE_CHECKING_INTERVAL_SECONDS = 30;

describe('PluginSettings', () => {
  it('should have correct default values', () => {
    const settings = new PluginSettings();
    expect(settings.defaultCodeButtonConfig).toBe('');
    expect(settings.invocableScriptsFolder).toBe('');
    expect(settings.mobileChangesCheckingIntervalInSeconds).toBe(DEFAULT_MOBILE_CHECKING_INTERVAL_SECONDS);
    expect(settings.modulesRoot).toBe('');
    expect(settings.shouldHandleProtocolUrls).toBe(false);
    expect(settings.shouldUseSyncFallback).toBe(false);
    expect(settings.startupScriptPath).toBe('');
  });

  describe('getInvocableScriptsFolder', () => {
    it('should return empty string when invocableScriptsFolder is empty', () => {
      const settings = new PluginSettings();
      expect(settings.getInvocableScriptsFolder()).toBe('');
    });

    it('should return invocableScriptsFolder when modulesRoot is empty', () => {
      const settings = new PluginSettings();
      settings.invocableScriptsFolder = 'scripts';
      expect(settings.getInvocableScriptsFolder()).toBe('scripts');
    });

    it('should return joined path when both modulesRoot and invocableScriptsFolder are set', () => {
      const settings = new PluginSettings();
      settings.modulesRoot = 'root';
      settings.invocableScriptsFolder = 'scripts';
      expect(settings.getInvocableScriptsFolder()).toBe('root/scripts');
    });
  });

  describe('getStartupScriptPath', () => {
    it('should return empty string when startupScriptPath is empty', () => {
      const settings = new PluginSettings();
      expect(settings.getStartupScriptPath()).toBe('');
    });

    it('should return startupScriptPath when modulesRoot is empty', () => {
      const settings = new PluginSettings();
      settings.startupScriptPath = 'startup.ts';
      expect(settings.getStartupScriptPath()).toBe('startup.ts');
    });

    it('should return joined path when both modulesRoot and startupScriptPath are set', () => {
      const settings = new PluginSettings();
      settings.modulesRoot = 'root';
      settings.startupScriptPath = 'startup.ts';
      expect(settings.getStartupScriptPath()).toBe('root/startup.ts');
    });
  });
});
