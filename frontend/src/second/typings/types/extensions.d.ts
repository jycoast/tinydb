import { EngineDriver } from './engines';

export interface PluginDefinition {
  packageName: string;
  manifest: any;
  content: any;
}

export interface ExtensionsDirectory {
  plugins: PluginDefinition[];
  drivers: EngineDriver[];
}
