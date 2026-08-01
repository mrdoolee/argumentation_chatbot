import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Settings,
  Table,
  Save,
  Play,
  FileText,
  ExternalLink,
  LogIn,
  LogOut,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { requestGoogleToken } from '../lib/googleAuth';
import {
  saveEnvConfig,
  saveBaseConfig,
  saveRubricConfig,
  updateDashboardResults
} from '../lib/googleSheets';
import { createDocsReport } from '../lib/googleDocs';
import { UtteranceAnalysis } from '../types';

export const AdminPage: React.FC = () => {
  const {
    authUser,
    setAuthUser,
    logout,
    clientId,
    updateClientId,
    spreadsheetId,
    envConfig,
    setEnvConfig,
    baseConfig,
    setBaseConfig,
    rubricConfig,
    setRubricConfig,
    chatRecords,
    syncDatabase,
    isLoading,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'env' | 'base' | 'rubric'>('dashboard');

  // Dashboard Filters
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Dashboard Analysis Output State
  const [overallLevel, setOverallLevel] = useState<string>('Level 3');
  const [overallFeedback, setOverallFeedback] = useState<string>(
    '분석 실행을 누르면 AI가 모둠의 대화 내역을 툴민 논증 모델로 종합 분석합니다.'
  );
  const [analyzedUtterances, setAnalyzedUtterances] = useState<UtteranceAnalysis[]>([]);

  // Local Form Buffers
  const [envForm, setEnvForm] = useState(envConfig);
  const [baseForm, setBaseForm] = useState(baseConfig);
  const [rubricForm, setRubricForm] = useState(rubricConfig);

  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExportingDoc, setIsExportingDoc] = useState(false);
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);

  // Sync Form Buffers when context loads
  useEffect(() => {
    setEnvForm(envConfig);
    setBaseForm(baseConfig);
    setRubricForm(rubricConfig);

    if (baseConfig.classList?.length && !selectedClass) setSelectedClass(baseConfig.classList[0]);
    if (baseConfig.groupList?.length && !selectedGroup) setSelectedGroup(baseConfig.groupList[0]);
    if (baseConfig.topicList?.length && !selectedTopic) setSelectedTopic(baseConfig.topicList[0]);
  }, [envConfig, baseConfig, rubricConfig]);

  // Filtered Chat Records for selected Class, Group, Topic
  const filteredChatRecords = chatRecords.filter(
    (rec) =>
      rec.classVal === selectedClass &&
      rec.groupVal === selectedGroup &&
      rec.topicVal === selectedTopic
  );

  // Update table view whenever filter changes or chatRecords update
  useEffect(() => {
    const formatted: UtteranceAnalysis[] = filteredChatRecords.map((rec, idx) => ({
      no: idx + 1,
      date: rec.date,
      time: rec.time,
      text: rec.userQuestion,
      judgment: rec.aiReply.startsWith('[') ? rec.aiReply.split(']')[0] + ']' : '[분석 필요]',
      evaluation: rec.aiReply
    }));
    setAnalyzedUtterances(formatted);
  }, [selectedClass, selectedGroup, selectedTopic, chatRecords]);

  // Google Login Handler
  const handleGoogleLogin = async () => {
    const idToUse = clientId.trim();
    if (!idToUse) {
      showToast('Google OAuth Client ID를 입력하시거나, [🚀 데모 로그인]을 클릭해 체험해보세요.', 'warning');
      return;
    }

    if (!idToUse.includes('.apps.googleusercontent.com')) {
      showToast('올바른 OAuth Client ID 형식이 아닙니다. (예: 123456...apps.googleusercontent.com)', 'error');
      return;
    }

    try {
      const user = await requestGoogleToken(idToUse);
      setAuthUser(user);
      showToast(`${user.name} 선생님, Google 계정 연결이 완료되었습니다.`, 'success');
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('Google OAuth Client ID가 유효하지 않거나 인증에 실패했습니다. [🚀 데모 로그인]을 이용하시면 로그인 없이 바로 사용하실 수 있습니다.', 'error');
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      name: '두리쌤 (교사)',
      email: 'teacher@school.ed.kr',
      accessToken: 'demo_access_token',
      expiresAt: Date.now() + 86400000,
      picture: ''
    };
    setAuthUser(demoUser);
    showToast('데모 교사 계정으로 로그인 되었습니다. 모든 관리자 기능을 체험하실 수 있습니다.', 'success');
  };

  // Save Handlers for Settings
  const handleSaveEnv = async () => {
    setIsSaving(true);
    const ok = await saveEnvConfig(authUser?.accessToken || '', spreadsheetId, envForm);
    if (ok) {
      setEnvConfig(envForm);
      showToast('[환경설정] 탭 저장이 완료되었습니다.', 'success');
    } else {
      showToast('저장에 실패했습니다.', 'error');
    }
    setIsSaving(false);
  };

  const handleSaveBase = async () => {
    setIsSaving(true);
    const ok = await saveBaseConfig(authUser?.accessToken || '', spreadsheetId, baseForm);
    if (ok) {
      setBaseConfig(baseForm);
      showToast('[기본설정] 탭 저장이 완료되었습니다.', 'success');
    } else {
      showToast('저장에 실패했습니다.', 'error');
    }
    setIsSaving(false);
  };

  const handleSaveRubric = async () => {
    setIsSaving(true);
    const ok = await saveRubricConfig(authUser?.accessToken || '', spreadsheetId, rubricForm);
    if (ok) {
      setRubricConfig(rubricForm);
      showToast('[논증평가설정] 탭 저장이 완료되었습니다.', 'success');
    } else {
      showToast('저장에 실패했습니다.', 'error');
    }
    setIsSaving(false);
  };

  // AI Toulmin Analysis Execution
  const handleRunAnalysis = async () => {
    if (filteredChatRecords.length === 0) {
      showToast(`${selectedClass} ${selectedGroup} (${selectedTopic})의 대화 기록이 없습니다.`, 'warning');
      return;
    }

    setIsAnalyzing(true);
    setOverallLevel('분석 중...');
    setOverallFeedback('AI가 모둠의 대화 내역을 분석하고 있습니다. 잠시만 기다려주세요.');

    // Build chat text prompt format
    let chatTextForPrompt = '';
    filteredChatRecords.forEach((rec, idx) => {
      chatTextForPrompt += `[발화 ${idx + 1} - ${rec.date} ${rec.time}] 학생: ${rec.userQuestion}\n(AI 조언: ${rec.aiReply})\n\n`;
    });

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evalRole: rubricConfig.evalRole,
          criteria: rubricConfig.criteria,
          overallRubric: rubricConfig.overallRubric,
          feedbackGuideline: rubricConfig.feedbackGuideline,
          chatRecordsText: chatTextForPrompt,
          apiKeyOverride: envConfig.geminiApiKey
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '논증 분석 실패');
      }

      const result = data.result;
      setOverallLevel(result.overallLevel || 'Level 2');
      setOverallFeedback(result.overallFeedback || '분석이 완료되었습니다.');

      // Map utterance judgments
      const mappedUtterances: UtteranceAnalysis[] = filteredChatRecords.map((rec, idx) => {
        const match = (result.utterances || []).find((u: any) => u.no === idx + 1);
        return {
          no: idx + 1,
          date: rec.date,
          time: rec.time,
          text: rec.userQuestion,
          judgment: match?.judgment || '[분석 완료]',
          evaluation: match?.evaluation || '세부 평가 내용'
        };
      });

      setAnalyzedUtterances(mappedUtterances);

      // Save to Google Sheet
      await updateDashboardResults(
        authUser?.accessToken || '',
        spreadsheetId,
        selectedClass,
        selectedGroup,
        selectedTopic,
        result.overallLevel,
        result.overallFeedback,
        mappedUtterances
      );

      showToast('🎉 AI 툴민 논증 분석이 완료되었습니다!', 'success');
    } catch (err: any) {
      console.error('Analysis Error:', err);
      setOverallLevel('분석 실패');
      setOverallFeedback(`오류가 발생했습니다: ${err.message}`);
      showToast(`분석 오류: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Google Docs Report Creation
  const handleExportDocsReport = async () => {
    if (!overallLevel || overallLevel === '분석 중...' || overallLevel === '분석 실패') {
      showToast('먼저 [AI 논증 분석 실행]으로 결과를 확인한 뒤 문서를 생성하세요.', 'warning');
      return;
    }

    setIsExportingDoc(true);
    try {
      const { docUrl } = await createDocsReport({
        token: authUser?.accessToken || '',
        classVal: selectedClass,
        groupVal: selectedGroup,
        topicVal: selectedTopic,
        overallLevel,
        overallFeedback,
        utterances: analyzedUtterances,
        reportFolderId: envConfig.reportFolderId
      });

      setCreatedDocUrl(docUrl);
      showToast('📋 Google Docs 논증 분석 보고서가 생성되었습니다!', 'success');
      window.open(docUrl, '_blank');
    } catch (err: any) {
      console.error('Docs Export Error:', err);
      showToast(`문서 생성 오류: ${err.message}`, 'error');
    } finally {
      setIsExportingDoc(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header / Auth Status Section */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                교사 관리자 Workspace
                <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {authUser ? 'Google OAuth 연결됨' : '데모/로컬 모드'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Google Sheets DB: <span className="font-mono text-slate-700 font-semibold">[Argumentation ChatBOT 데이터베이스]</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {authUser ? (
              <div className="flex items-center gap-3 bg-slate-50 p-2 pl-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">{authUser.email || authUser.name}</span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> 로그아웃
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Client ID (...apps.googleusercontent.com)"
                  value={clientId}
                  onChange={(e) => updateClientId(e.target.value)}
                  className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white w-full sm:w-64 focus:border-indigo-600 outline-none"
                />
                <button
                  onClick={handleGoogleLogin}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LogIn className="w-4 h-4" /> Google 로그인
                </button>
                <button
                  onClick={handleDemoLogin}
                  className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Google Client ID 없이 관리자 체험"
                >
                  🚀 데모 로그인
                </button>
              </div>
            )}

            <button
              onClick={syncDatabase}
              disabled={isLoading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="동기화"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {spreadsheetId && spreadsheetId !== 'local_demo_sheet_id' && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" /> 시트 직접 열기
              </a>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 space-x-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-4 h-4" /> 모둠별 대시보드 & AI 분석
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'env'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" /> [환경설정] 탭
          </button>
          <button
            onClick={() => setActiveTab('base')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'base'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" /> [기본설정] 탭
          </button>
          <button
            onClick={() => setActiveTab('rubric')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rubric'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> [논증평가설정] 탭
          </button>
        </div>

        {/* TAB 1: Dashboard Panel */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Filter Bar & Action Buttons */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">학급 선택 (B2)</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    {(baseConfig.classList || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">모둠 선택 (D2)</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    {(baseConfig.groupList || []).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">탐구 주제 선택 (F2)</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    {(baseConfig.topicList || []).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:bg-indigo-300"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAnalyzing ? 'AI 분석 실행 중...' : 'AI 논증 분석 실행'}
                </button>

                <button
                  onClick={handleExportDocsReport}
                  disabled={isExportingDoc}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:bg-amber-300"
                >
                  <FileText className="w-4 h-4" />
                  {isExportingDoc ? '문서 생성 중...' : 'Docs 분석 보고서 생성'}
                </button>
              </div>
            </div>

            {/* Generated Report Link Notification */}
            {createdDocUrl && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>Google Docs 분석 보고서가 생성되었습니다.</span>
                </div>
                <a
                  href={createdDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1"
                >
                  문서 열기 <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Overall Level & Feedback Display */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 bg-indigo-50/70 p-5 rounded-2xl border border-indigo-100 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                  종합 논증 완성도 (A7)
                </span>
                <div className="text-3xl font-extrabold text-indigo-900">{overallLevel}</div>
              </div>

              <div className="md:col-span-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-600 mb-1.5">교사 피드백 제언 (B7)</span>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {overallFeedback}
                </p>
              </div>
            </div>

            {/* 6-Column Data Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-600" />
                  모둠 대화 발화 및 툴민 분석 내역 (총 {analyzedUtterances.length}건)
                </h4>
                <span className="text-xs text-slate-500 font-medium">6열 데이터 테이블 (A9:F1000)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3.5 w-16 text-center">발화번호 (A)</th>
                      <th className="p-3.5 w-24">날짜 (B)</th>
                      <th className="p-3.5 w-20">시간 (C)</th>
                      <th className="p-3.5 min-w-[240px]">학생/모둠 발언 (D)</th>
                      <th className="p-3.5 w-28">논증 판정 (E)</th>
                      <th className="p-3.5 min-w-[220px]">요소별 세부 평가 (F)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyzedUtterances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-400 font-medium">
                          선택한 학급·모둠·탐구주제의 대화 기록이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      analyzedUtterances.map((row) => (
                        <tr key={row.no} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-600">{row.no}</td>
                          <td className="p-3.5 text-slate-600 font-mono">{row.date}</td>
                          <td className="p-3.5 text-slate-600 font-mono">{row.time}</td>
                          <td className="p-3.5 font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                            {row.text}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                                row.judgment.includes('주장')
                                  ? 'bg-blue-100 text-blue-800'
                                  : row.judgment.includes('근거')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.judgment.includes('정당화')
                                  ? 'bg-purple-100 text-purple-800'
                                  : row.judgment.includes('반박')
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.judgment}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {row.evaluation}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: [환경설정] Panel */}
        {activeTab === 'env' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">■ 탭 1: [환경설정] 탭 세팅</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Gemini API 키 및 구글 드라이브 폴더/백업 시트 ID 관리
                </p>
              </div>
              <button
                onClick={handleSaveEnv}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> [환경설정] 저장
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gemini API Key (B1)</label>
                <input
                  type="password"
                  value={envForm.geminiApiKey}
                  onChange={(e) => setEnvForm({ ...envForm, geminiApiKey: e.target.value })}
                  placeholder="AIStudio Gemini API Key"
                  className="w-full p-3 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">보고서 저장 폴더 ID (B4)</label>
                <input
                  type="text"
                  value={envForm.reportFolderId}
                  onChange={(e) => setEnvForm({ ...envForm, reportFolderId: e.target.value })}
                  placeholder="Google Drive Folder ID for Docs"
                  className="w-full p-3 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">자료 공유 폴더 ID (B2)</label>
                <input
                  type="text"
                  value={envForm.folderId}
                  onChange={(e) => setEnvForm({ ...envForm, folderId: e.target.value })}
                  placeholder="Drive Folder ID for PDF Auto Upload"
                  className="w-full p-3 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">외부 백업 시트 ID (B3)</label>
                <input
                  type="text"
                  value={envForm.backupSheetId}
                  onChange={(e) => setEnvForm({ ...envForm, backupSheetId: e.target.value })}
                  placeholder="External Backup Spreadsheet ID"
                  className="w-full p-3 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: [기본설정] Panel */}
        {activeTab === 'base' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">■ 탭 2: [기본설정] 탭 세팅</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  AI 챗봇 페르소나 프롬프트, 시간제한, 금지어 목록, 학급/모둠/주제 목록
                </p>
              </div>
              <button
                onClick={handleSaveBase}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> [기본설정] 저장
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">프롬프트: 역할/페르소나 (B1)</label>
                <textarea
                  value={baseForm.pRole}
                  onChange={(e) => setBaseForm({ ...baseForm, pRole: e.target.value })}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">프롬프트: 행동 지침 (B2)</label>
                <textarea
                  value={baseForm.pAction}
                  onChange={(e) => setBaseForm({ ...baseForm, pAction: e.target.value })}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">프롬프트: 절대 제한 (B3)</label>
                <textarea
                  value={baseForm.pRestrict}
                  onChange={(e) => setBaseForm({ ...baseForm, pRestrict: e.target.value })}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">프롬프트: 예외 대처 (B4)</label>
                <textarea
                  value={baseForm.pException}
                  onChange={(e) => setBaseForm({ ...baseForm, pException: e.target.value })}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">제한 시간(분) (B6)</label>
                  <input
                    type="number"
                    value={baseForm.timeLimitMinutes}
                    onChange={(e) =>
                      setBaseForm({ ...baseForm, timeLimitMinutes: parseInt(e.target.value, 10) || 20 })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">기억할 대화 맥락 쌍 수 (B9)</label>
                  <input
                    type="number"
                    value={baseForm.windowPairs}
                    onChange={(e) =>
                      setBaseForm({ ...baseForm, windowPairs: parseInt(e.target.value, 10) || 3 })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  금지어 차단 목록 (B10, 쉼표 구분)
                </label>
                <input
                  type="text"
                  value={(baseForm.bannedWords || []).join(', ')}
                  onChange={(e) =>
                    setBaseForm({
                      ...baseForm,
                      bannedWords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">학급 목록 (B11, 쉼표 구분)</label>
                  <input
                    type="text"
                    value={(baseForm.classList || []).join(', ')}
                    onChange={(e) =>
                      setBaseForm({
                        ...baseForm,
                        classList: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">모둠 목록 (B12, 쉼표 구분)</label>
                  <input
                    type="text"
                    value={(baseForm.groupList || []).join(', ')}
                    onChange={(e) =>
                      setBaseForm({
                        ...baseForm,
                        groupList: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">탐구 주제 목록 (B13, 쉼표 구분)</label>
                  <input
                    type="text"
                    value={(baseForm.topicList || []).join(', ')}
                    onChange={(e) =>
                      setBaseForm({
                        ...baseForm,
                        topicList: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: [논증평가설정] Panel */}
        {activeTab === 'rubric' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">■ 탭 3: [논증평가설정] 탭 세팅</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  툴민(Toulmin) 논증 평가 루브릭 및 세부 판정 기준
                </p>
              </div>
              <button
                onClick={handleSaveRubric}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> [논증평가설정] 저장
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">평가자 역할 (B1)</label>
                <textarea
                  value={rubricForm.evalRole}
                  onChange={(e) => setRubricForm({ ...rubricForm, evalRole: e.target.value })}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">요소별 판정 기준 (B2)</label>
                <textarea
                  value={rubricForm.criteria}
                  onChange={(e) => setRubricForm({ ...rubricForm, criteria: e.target.value })}
                  rows={6}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-sans leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">종합 평가 루브릭 (B3)</label>
                <textarea
                  value={rubricForm.overallRubric}
                  onChange={(e) => setRubricForm({ ...rubricForm, overallRubric: e.target.value })}
                  rows={5}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-sans leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">피드백 작성 지침 (B4)</label>
                <textarea
                  value={rubricForm.feedbackGuideline}
                  onChange={(e) => setRubricForm({ ...rubricForm, feedbackGuideline: e.target.value })}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-sans leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
