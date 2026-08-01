import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, AlertCircle, Sparkles, RefreshCw, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatMessage, StudentSession } from '../types';
import { appendChatRecord } from '../lib/googleSheets';

export const StudentPage: React.FC = () => {
  const { baseConfig, envConfig, spreadsheetId, authUser, showToast } = useApp();

  const [session, setSession] = useState<StudentSession>({
    classValue: baseConfig.classList[0] || '1반',
    groupValue: baseConfig.groupList[0] || '1모둠',
    topicValue: baseConfig.topicList[0] || '과학탐구',
    history: [],
    strikeCount: 0,
    isBlocked: false
  });

  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(baseConfig.timeLimitMinutes * 60);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Keep dropdown options updated if baseConfig changes
  useEffect(() => {
    if (!isStarted) {
      setSession((prev) => ({
        ...prev,
        classValue: baseConfig.classList[0] || '1반',
        groupValue: baseConfig.groupList[0] || '1모둠',
        topicValue: baseConfig.topicList[0] || '과학탐구'
      }));
      setRemainingSeconds((baseConfig.timeLimitMinutes || 20) * 60);
    }
  }, [baseConfig, isStarted]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Countdown Timer
  useEffect(() => {
    if (!isStarted || isTimeUp || session.isBlocked) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimeUp(true);
          setMessages((msgs) => [
            ...msgs,
            {
              id: 'system_timeout',
              role: 'system',
              text: '⚠️ 대화 시간이 모두 종료되었습니다.\n지금까지 나눈 기록을 바탕으로 실험보고서를 작성해 주세요.'
            }
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isTimeUp, session.isBlocked]);

  const handleStartInquiry = () => {
    setIsStarted(true);
    setRemainingSeconds((baseConfig.timeLimitMinutes || 20) * 60);
    const welcomeMsg: ChatMessage = {
      id: 'welcome_' + Date.now(),
      role: 'ai',
      text: `환영합니다! '${session.topicValue}'에 대해 어떤 가설(주장)을 세우셨나요? 관련된 근거와 함께 이야기해 봅시다.`
    };
    setMessages([welcomeMsg]);
    setSession((prev) => ({
      ...prev,
      history: [{ role: 'ai', text: welcomeMsg.text }]
    }));
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading || isTimeUp || session.isBlocked) return;

    setInputText('');

    // 1. Check Banned Words (3-Strike System)
    const bannedWords = baseConfig.bannedWords || [];
    const hasBannedWord = bannedWords.some((w) => w && text.includes(w));

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (hasBannedWord) {
      const newStrike = session.strikeCount + 1;
      let replyMsg = '';
      let logStatus = '';
      let shouldBlock = false;

      if (newStrike === 1) {
        replyMsg =
          '⚠️ [1차 경고] 부적절한 단어가 감지되었습니다! 바르고 고운 언어로 탐구에 참여해주세요. (누적 3회 시 챗봇이 강제 차단됩니다.)';
        logStatus = '⚠️ [1차 경고] 금지어 사용';
        showToast('⚠️ [1차 경고] 부적절한 단어가 감지되었습니다.', 'warning');
      } else if (newStrike === 2) {
        replyMsg =
          '🚨 [2차 경고 - 최종] 또다시 부적절한 단어가 감지되었습니다! 한 번만 더 사용하면 즉시 챗봇이 강제 차단되고 선생님께 보고됩니다.';
        logStatus = '🚨 [2차 경고] 금지어 사용';
        showToast('🚨 [2차 경고] 금지어 2회 누적! 주의하세요.', 'error');
      } else {
        replyMsg = '🚫 [강제 차단] 부적절한 언어 사용이 3회 누적되어 탐구 대화가 강제 차단되었습니다.';
        logStatus = '🚫 [시스템 차단] 금지어 3회 누적';
        shouldBlock = true;
        showToast('🚫 금지어 3회 누적으로 탐구가 차단되었습니다.', 'error');
      }

      setSession((prev) => ({
        ...prev,
        strikeCount: newStrike,
        isBlocked: shouldBlock
      }));

      // Append user message & system warning
      const userMsgObj: ChatMessage = { id: 'u_' + Date.now(), role: 'user', text };
      const systemWarnObj: ChatMessage = {
        id: 'sys_' + Date.now(),
        role: 'system',
        text: replyMsg
      };

      setMessages((prev) => [...prev, userMsgObj, systemWarnObj]);

      // Save record to Sheet
      appendChatRecord(authUser?.accessToken || '', spreadsheetId, {
        date: dateStr,
        time: timeStr,
        classVal: session.classValue,
        groupVal: session.groupValue,
        topicVal: session.topicValue,
        userQuestion: text,
        aiReply: logStatus
      });

      return;
    }

    // 2. Normal Message - Append user message to state
    const userMsgObj: ChatMessage = { id: 'u_' + Date.now(), role: 'user', text };
    setMessages((prev) => [...prev, userMsgObj]);
    setIsLoading(true);

    const updatedHistory = [...session.history, { role: 'user' as const, text }];

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pRole: baseConfig.pRole,
          pAction: baseConfig.pAction,
          pRestrict: baseConfig.pRestrict,
          pException: baseConfig.pException,
          pExtra: baseConfig.pExtra,
          classValue: session.classValue,
          groupValue: session.groupValue,
          topicValue: session.topicValue,
          userQuestion: text,
          history: updatedHistory,
          windowPairs: baseConfig.windowPairs || 3,
          apiKeyOverride: envConfig.geminiApiKey
        })
      });

      const resText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (pErr) {
        throw new Error(`서버 응답 파싱 실패 (${response.status}): ${resText.slice(0, 150) || '응답이 비어있습니다.'}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Gemini API 응답 오류');
      }

      const aiReplyText = data.aiReply;
      const isBlockedByAI = data.isBlocked;

      const aiMsgObj: ChatMessage = {
        id: 'ai_' + Date.now(),
        role: isBlockedByAI ? 'system' : 'ai',
        text: aiReplyText,
        isBlocked: isBlockedByAI
      };

      setMessages((prev) => [...prev, aiMsgObj]);

      setSession((prev) => ({
        ...prev,
        history: [...updatedHistory, { role: 'ai', text: aiReplyText }],
        isBlocked: isBlockedByAI || prev.isBlocked
      }));

      // Append record to Sheet
      appendChatRecord(authUser?.accessToken || '', spreadsheetId, {
        date: dateStr,
        time: timeStr,
        classVal: session.classValue,
        groupVal: session.groupValue,
        topicVal: session.topicValue,
        userQuestion: text,
        aiReply: isBlockedByAI ? '🚫 [AI 차단] 헛소리/장난' : aiReplyText
      });
    } catch (err: any) {
      console.error('Student Chat Error:', err);
      const errObj: ChatMessage = {
        id: 'err_' + Date.now(),
        role: 'system',
        text: `❌ 서버 오류: ${err.message || '네트워크 통신 중 오류가 발생했습니다.'}`
      };
      setMessages((prev) => [...prev, errObj]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `⏳ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 overflow-hidden h-[calc(100vh-61px-41px)]">
      <div className="w-full max-w-2xl h-full bg-white sm:rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
        {/* Step A: Setup Modal Card */}
        {!isStarted ? (
          <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-50">
            <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-xs mb-3">
                  🗣️
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Argumentation ChatBOT</h2>
                <p className="text-xs text-indigo-600 font-semibold mt-1">
                  소크라테스형 AI와 함께하는 툴민 논증 탐구
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    🔹 우리 학급
                  </label>
                  <select
                    value={session.classValue}
                    onChange={(e) => setSession({ ...session, classValue: e.target.value })}
                    className="w-full p-3.5 text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-medium transition-all"
                  >
                    {(baseConfig.classList || []).map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    🔹 우리 모둠
                  </label>
                  <select
                    value={session.groupValue}
                    onChange={(e) => setSession({ ...session, groupValue: e.target.value })}
                    className="w-full p-3.5 text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-medium transition-all"
                  >
                    {(baseConfig.groupList || []).map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    🔹 탐구 주제
                  </label>
                  <select
                    value={session.topicValue}
                    onChange={(e) => setSession({ ...session, topicValue: e.target.value })}
                    className="w-full p-3.5 text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-medium transition-all"
                  >
                    {(baseConfig.topicList || []).map((tpc) => (
                      <option key={tpc} value={tpc}>
                        {tpc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleStartInquiry}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-2xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                논증 탐구 시작하기
              </button>
            </div>
          </div>
        ) : (
          /* Step B: Chat UI */
          <div className="flex-1 flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {session.classValue} {session.groupValue}
                </h3>
                <p className="text-xs text-slate-500 font-medium">주제: {session.topicValue}</p>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-full font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
                    isTimeUp || session.isBlocked
                      ? 'bg-slate-200 text-slate-600'
                      : remainingSeconds < 300
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {isTimeUp ? '종료됨' : session.isBlocked ? '차단됨' : formatTimer(remainingSeconds)}
                </div>

                <button
                  onClick={() => setIsStarted(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="설정 다시 하기"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Chat History View */}
            <div ref={chatContainerRef} className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => {
                if (msg.role === 'system') {
                  return (
                    <div
                      key={msg.id}
                      className="mx-auto max-w-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold p-3.5 rounded-2xl text-center shadow-2xs whitespace-pre-line flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{msg.text}</span>
                    </div>
                  );
                }

                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] bg-indigo-600 text-white font-medium text-sm sm:text-base px-4 py-3 rounded-2xl rounded-tr-2xs shadow-xs whitespace-pre-wrap leading-relaxed break-words">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                // AI Message
                return (
                  <div key={msg.id} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      🤖
                    </div>
                    <div className="max-w-[85%] bg-white border border-slate-200 text-slate-800 font-medium text-sm sm:text-base px-4 py-3 rounded-2xl rounded-tl-2xs shadow-2xs whitespace-pre-wrap leading-relaxed break-words">
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                    🤖
                  </div>
                  <div className="bg-white border border-slate-200 text-indigo-600 font-semibold text-xs px-4 py-3 rounded-2xl rounded-tl-2xs shadow-2xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></div>
                    <span>AI가 논증을 분석 중입니다...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shrink-0">
              <div className="flex items-end gap-2.5">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading || isTimeUp || session.isBlocked}
                  placeholder={
                    isTimeUp
                      ? '대화 시간이 종료되었습니다.'
                      : session.isBlocked
                      ? '부적절한 단어 사용 누적으로 차단되었습니다.'
                      : '여기에 논증(주장, 근거 등)을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)'
                  }
                  rows={2}
                  className="flex-1 p-3 text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none resize-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading || isTimeUp || session.isBlocked}
                  className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs active:scale-95 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                  title="전송"
                >
                  {session.isBlocked || isTimeUp ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
