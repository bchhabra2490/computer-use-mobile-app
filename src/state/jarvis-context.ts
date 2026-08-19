import { createContext, useContext } from "react";

import type { ControlAction, StatusPayload } from "@/api/types";
import type { Pairing } from "@/storage/pairing";
import type { ConnectionState } from "@/state/connection";

export type SentCommand = {
  id: string;
  text: string;
  at: number;
};

export type JarvisContextValue = {
  ready: boolean;
  pairing: Pairing | null;
  connection: ConnectionState;
  status: StatusPayload | null;
  authError: string | null;
  actionError: string | null;
  sentCommands: SentCommand[];
  optimisticQueued: boolean;
  screenUri: string | null;
  screenLoading: boolean;
  savePairingAndConnect: (pairing: Pairing) => Promise<void>;
  forgetMac: () => Promise<void>;
  sendCommand: (text: string) => Promise<void>;
  sendAudio: (uri: string) => Promise<void>;
  sendPhoto: (uri: string, text?: string, audioUri?: string) => Promise<void>;
  sendControl: (action: ControlAction) => Promise<void>;
  refresh: () => Promise<void>;
  clearActionError: () => void;
};

export const JarvisContext = createContext<JarvisContextValue | null>(null);

export function useJarvis(): JarvisContextValue {
  const value = useContext(JarvisContext);
  if (!value) {
    throw new Error("useJarvis must be used within JarvisProvider");
  }
  return value;
}
