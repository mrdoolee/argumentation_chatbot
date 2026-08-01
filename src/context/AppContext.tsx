import React, { createContext, useContext, useState, useEffect } from 'react';
import { EnvConfig, BaseConfig, RubricConfig, ChatRecord, GoogleAuthUser } from '../types';
import {
  getStoredAuthUser,
  getStoredClientId,
  saveStoredClientId,
  removeAuthUser
} from '../lib/googleAuth';
import {
  ensureSpreadsheetExists,
  fetchEnvConfig,
  fetchBaseConfig,
  fetchRubricConfig,
  fetchChatRecords,
  DEFAULT_ENV_CONFIG,
  DEFAULT_BASE_CONFIG,
  DEFAULT_RUBRIC_CONFIG,
  getLocalDatabase
} from '../lib/googleSheets';

interface ToastState {
  message: string;
  type: 'success' | 'warning' | 'error';
}

interface AppContextType {
  authUser: GoogleAuthUser | null;
  setAuthUser: (user: GoogleAuthUser | null) => void;
  logout: () => void;
  clientId: string;
  updateClientId: (id: string) => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  envConfig: EnvConfig;
  setEnvConfig: React.Dispatch<React.SetStateAction<EnvConfig>>;
  baseConfig: BaseConfig;
  setBaseConfig: React.Dispatch<React.SetStateAction<BaseConfig>>;
  rubricConfig: RubricConfig;
  setRubricConfig: React.Dispatch<React.SetStateAction<RubricConfig>>;
  chatRecords: ChatRecord[];
  setChatRecords: React.Dispatch<React.SetStateAction<ChatRecord[]>>;
  isLoading: boolean;
  syncDatabase: () => Promise<void>;
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'warning' | 'error', duration?: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<GoogleAuthUser | null>(getStoredAuthUser());
  const [clientId, setClientIdState] = useState<string>(getStoredClientId());
  const [spreadsheetId, setSpreadsheetId] = useState<string>('local_demo_sheet_id');

  const [envConfig, setEnvConfig] = useState<EnvConfig>(DEFAULT_ENV_CONFIG);
  const [baseConfig, setBaseConfig] = useState<BaseConfig>(DEFAULT_BASE_CONFIG);
  const [rubricConfig, setRubricConfig] = useState<RubricConfig>(DEFAULT_RUBRIC_CONFIG);
  const [chatRecords, setChatRecords] = useState<ChatRecord[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const updateClientId = (id: string) => {
    setClientIdState(id);
    saveStoredClientId(id);
  };

  const logout = () => {
    removeAuthUser();
    setAuthUser(null);
    showToast('로그아웃 되었습니다.', 'warning');
  };

  const syncDatabase = async () => {
    setIsLoading(true);
    try {
      const token = authUser?.accessToken || '';
      if (!token) {
        const local = getLocalDatabase();
        setSpreadsheetId('local_demo_sheet_id');
        setEnvConfig(local.env);
        setBaseConfig(local.base);
        setRubricConfig(local.rubric);
        setChatRecords(local.chatRecords || []);
        return;
      }

      const sheetId = await ensureSpreadsheetExists(token);
      setSpreadsheetId(sheetId);

      const [env, base, rubric, records] = await Promise.all([
        fetchEnvConfig(token, sheetId),
        fetchBaseConfig(token, sheetId),
        fetchRubricConfig(token, sheetId),
        fetchChatRecords(token, sheetId)
      ]);

      setEnvConfig(env);
      setBaseConfig(base);
      setRubricConfig(rubric);
      setChatRecords(records);
      showToast('Google 드라이브 [Argumentation ChatBOT 데이터베이스] 연동 완료!', 'success');
    } catch (error: any) {
      console.error('Database Sync Error:', error);
      const errMsg = error.message || 'Google Drive/Sheets 연동 오류가 발생했습니다.';
      showToast(errMsg, 'error', 8000);
      setSpreadsheetId('local_demo_sheet_id');

      const local = getLocalDatabase();
      setEnvConfig(local.env);
      setBaseConfig(local.base);
      setRubricConfig(local.rubric);
      setChatRecords(local.chatRecords || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncDatabase();
  }, [authUser]);

  return (
    <AppContext.Provider
      value={{
        authUser,
        setAuthUser,
        logout,
        clientId,
        updateClientId,
        spreadsheetId,
        setSpreadsheetId,
        envConfig,
        setEnvConfig,
        baseConfig,
        setBaseConfig,
        rubricConfig,
        setRubricConfig,
        chatRecords,
        setChatRecords,
        isLoading,
        syncDatabase,
        toast,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
