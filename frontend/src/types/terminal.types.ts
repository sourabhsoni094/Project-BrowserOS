export type TerminalLineType =
  | 'default'
  | 'error'
  | 'success'
  | 'info'
  | 'warning'
  | 'dir'
  | 'prompt';

export interface TerminalLine {
  id: string;
  text: string;
  type?: TerminalLineType;
}

export interface TerminalTab {
  id: string;
  title: string;
  cwdId: string | null;
  cwdPath: string;
  history: string[];
  historyIndex: number;
  lines: TerminalLine[];
  currentInput: string;
}

export interface TerminalExecutionResponse {
  lines: {
    text: string;
    type?: TerminalLineType;
  }[];
  newCwd?: {
    id: string;
    path: string;
  };
  exitCode: number;
}
