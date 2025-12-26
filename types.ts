
export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export type AiTurn = 'local' | 'remote' | 'gestures';

export interface UserSettings {
  voice: string;
  language: string;
  tone: string;
  duration: number;
  theme: string;
}

export interface OnlineUser {
  id: string;
  email: string;
  presence_ref: string;
  settings?: UserSettings;
}

export interface Invite {
  fromId: string;
  fromEmail: string;
  roomId: string;
}
