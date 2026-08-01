/**
 * Argumentation ChatBOT Type Definitions
 */

export interface EnvConfig {
  geminiApiKey: string;
  folderId: string;
  backupSheetId: string;
  reportFolderId: string;
  webAppUrl: string;
}

export interface BaseConfig {
  pRole: string;
  pAction: string;
  pRestrict: string;
  pException: string;
  pExtra: string;
  timeLimitMinutes: number;
  fileApi: 'ON' | 'OFF';
  fileUris: string;
  windowPairs: number;
  bannedWords: string[];
  classList: string[];
  groupList: string[];
  topicList: string[];
}

export interface RubricConfig {
  evalRole: string;
  criteria: string;
  overallRubric: string;
  feedbackGuideline: string;
}

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user' | 'system';
  text: string;
  timestamp?: string;
  isBlocked?: boolean;
}

export interface ChatRecord {
  rowIndex?: number;
  date: string;
  time: string;
  classVal: string;
  groupVal: string;
  topicVal: string;
  userQuestion: string;
  aiReply: string;
}

export interface UtteranceAnalysis {
  no: number;
  date: string;
  time: string;
  text: string;
  judgment: string;
  evaluation: string;
}

export interface AnalysisResponse {
  utterances: {
    no: number;
    judgment: string;
    evaluation: string;
  }[];
  overallLevel: string;
  overallFeedback: string;
}

export interface GoogleAuthUser {
  accessToken: string;
  expiresAt: number;
  email?: string;
  name?: string;
  picture?: string;
}

export interface StudentSession {
  classValue: string;
  groupValue: string;
  topicValue: string;
  history: { role: 'ai' | 'user'; text: string }[];
  strikeCount: number;
  isBlocked: boolean;
}
