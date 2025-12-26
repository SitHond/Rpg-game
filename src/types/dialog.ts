// src/types/dialog.ts
export interface DialogLine {
  id: string;
  speaker: string;
  text: string;
  portrait?: string;
  choices?: DialogChoice[];
  next?: string | string[];
  action?: any;
}

export interface DialogChoice {
  id: string;
  text: string;
  next: string;
}

export interface DialogData {
  id: string;
  name: string;
  lines: Record<string, DialogLine>;
  start: string;
  portrait?: string;
}