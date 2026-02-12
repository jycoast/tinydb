import * as aceModule from "ace-builds/src-noconflict/ace";

export const ace =
  aceModule && (aceModule as { default?: typeof aceModule }).default
    ? (aceModule as { default: typeof aceModule }).default
    : aceModule;

export type Editor = aceModule.Editor;
export type IEditSession = aceModule.IEditSession;
export type Position = aceModule.Position;
