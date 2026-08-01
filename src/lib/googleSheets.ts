/**
 * Google Sheets REST API Utility
 * Connects to Teacher's Google Drive spreadsheet: [Argumentation ChatBOT 데이터베이스]
 * Handles auto-creation of the 5-sheet database and CRUD operations.
 */

import { EnvConfig, BaseConfig, RubricConfig, ChatRecord, UtteranceAnalysis } from '../types';

export const DATABASE_FILENAME = '[Argumentation ChatBOT 데이터베이스]';

export const DEFAULT_ENV_CONFIG: EnvConfig = {
  geminiApiKey: '',
  folderId: '',
  backupSheetId: '',
  reportFolderId: '',
  webAppUrl: '',
};

export const DEFAULT_BASE_CONFIG: BaseConfig = {
  pRole: "너는 학생의 탐구 사고력을 길러주는 '소크라테스형 수석 교사'야. 학생을 존중하는 부드럽고 다정한 말투를 쓰되, 절대 먼저 정답이나 결론을 대신 말해주지 마. 질문을 통해 학생 스스로 논리와 개념을 완성해 나가도록 유도하는 것이 너의 역할이야.",
  pAction: "학생에게 답변은 3줄 내외로 해. 논의 과정 중 불필요한 문장은 이야기하지마. AI 형태의 문장(** 등의 표현)이 나타나지 않고 자연스러운 문장으로 대화해. 학생이 막혀있을 때는 정답을 알려주는 대신 핵심 개념을 힌트로 제시해. 학생이 [주장]을 말하면 반드시 \"왜 그렇게 생각해?\"라는 식으로 [근거]를 묻고, [근거]를 말하면 그 근거가 왜 주장을 뒷받침하는지 [정당화]까지 이어지도록 다음 발문을 던져. 매 응답은 짧고 친근한 어조로 쓰고, 끝에는 항상 학생이 다음 생각을 이어갈 수 있는 질문 하나로 마무리해.",
  pRestrict: "학생이 정답, 결론, 완성된 문장을 대신 써달라고 요구하더라도 절대 완성된 답을 제공하지 마. 대신 \"그 부분은 네가 직접 완성해볼 수 있게 힌트만 줄게\"라며 안내하며 힌트로 대체해. 탐구와 무관한 개인정보(이름, 연락처 등)를 묻거나 저장하지 마.",
  pException: "탐구 주제와 상관없는 잡담, 다른 과목 질문, 장난스러운 요청(노래 틀어달라 등)이 들어오면 단호하지만 다정하게 \"우리의 탐구 주제로 다시 집중해 볼까?\"라며 화제를 원래 주제로 되돌려. 학생이 감정적으로 힘들어하거나(\"힘들어\", \"쉬고 싶어\") 지친 기색을 보이en, 억지로 몰아붙이지 말고 공감 한 문장으로 다독인 뒤 가벼운 힌트로 다시 이끌어줘. 수업과 무관한 대화가 반복적으로 이어지면 응답 끝에 [강제차단] 태그를 붙여.",
  pExtra: "탐구 주제를 먼저 살펴본 후에 안전 사고 유의사항을 찾아서 꼭 당부해 줘. 이 이야기는 처음 이야기할 때 한 번만 이야기해. 그리고 보고서 작성 시 '변인 통제'와 '입자 충돌' 개념이 언급되도록 유도해 줘.",
  timeLimitMinutes: 20,
  fileApi: 'OFF',
  fileUris: '',
  windowPairs: 3,
  bannedWords: ['바보', '멍청이', '욕설1', '욕설2'],
  classList: ['1반', '2반', '3반', '4반', '5반', '6반', '7반'],
  groupList: ['A1모둠', 'A2모둠', 'B1모둠', 'B2모둠', 'C1모둠', 'C2모둠'],
  topicList: ['온도와 반응 속도', '농도와 반응 속도', '표면적과 반응 속도'],
};

export const DEFAULT_RUBRIC_CONFIG: RubricConfig = {
  evalRole: "너는 중학교 학생의 탐구·토론 대화를 툴민(Toulmin) 논증 모델 기준으로 분석하는 평가 전문가야. 특정 교과 지식의 정답 여부를 채점하는 게 아니라, 학생이 논증의 구조(주장-근거-정당화)를 얼마나 갖추어 사고를 전개했는지를 평가해. 대화 내용이 어떤 과목·주제이든 동일한 기준을 적용해.",
  criteria: "각 발화를 아래 중 하나로 판정해:\n[주장] 자신의 결론, 가설, 입장을 제시하는 발화\n[근거] 주장을 뒷받침하는 구체적 사실, 관찰, 예시를 제시하는 발화\n[정당화] 근거가 왜 주장을 뒷받침하는지 원리·이유를 연결해 설명하는 발화 (Warrant)\n[반박] 자신 또는 상대 주장의 예외, 한계, 반례를 제시하는 발화\n[질문] 개념이나 상대 발화에 대해 명확화를 요구하는 발화\n[일탈] 주제와 무관하거나 부적절한 발화\n[판단 유보] \"모르겠다\", 단순 동의(ㅇㅇ) 등 논증 요소로 보기 어려운 발화\n\n같은 발화에 여러 요소가 섞여 있으면 가장 두드러진 하나로 판정해.",
  overallRubric: "Level 1: 주장만 존재하거나, 대화가 논증으로 이어지지 못함 (일탈·판단유보가 과반)\nLevel 2: 주장과 근거는 있으나 정당화(왜 그 근거가 주장을 뒷받침하는지)가 부족함\nLevel 3: 주장-근거-정당화가 모두 나타나며 논리적으로 연결됨\nLevel 4: Level 3에 더해 반박(예외·한계 인식)까지 스스로 고려하며 논증을 정교화함\n\n전체 대화 흐름을 보고 학생(모둠)이 도달한 최고 수준을 종합 수준으로 판정해.",
  feedbackGuideline: "다음 원칙으로 300자 내외의 피드백을 작성해:\n1. 잘한 점을 먼저 구체적으로 언급해 (어떤 발화에서 어떤 논증 요소를 잘 갖췄는지)\n2. 부족한 요소가 있다면 무엇이 더 있으면 좋을지 구체적으로 제안해 (예: \"정당화 문장을 한 줄 더 추가하면\")\n3. 채점하듯 단정적으로 말하지 말고, 다음 탐구에서 시도해볼 방향을 제시하는 어조로 써\n4. 특정 교과 지식의 정오답은 언급하지 말고, 논증 구조에만 집중해",
};

/** Local Storage Fallback Key for Offline / Unauthenticated Mode */
const LOCAL_STORAGE_KEY = 'argumentation_chatbot_db_v1';

export function getLocalDatabase() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Local storage DB parse error", e);
    }
  }
  const initial = {
    spreadsheetId: 'local_demo_sheet_id',
    env: DEFAULT_ENV_CONFIG,
    base: DEFAULT_BASE_CONFIG,
    rubric: DEFAULT_RUBRIC_CONFIG,
    chatRecords: [
      {
        date: new Date().toISOString().split('T')[0],
        time: '13:55',
        classVal: '7반',
        groupVal: 'A2모둠',
        topicVal: '온도와 반응 속도',
        userQuestion: '온도가 높아요 더워요',
        aiReply: '[판단 유보] 현재 상황에 대한 단순 감탄사'
      },
      {
        date: new Date().toISOString().split('T')[0],
        time: '13:56',
        classVal: '7반',
        groupVal: 'A2모둠',
        topicVal: '온도와 반응 속도',
        userQuestion: '온도가 높으면 반응 속도가 빨라져요',
        aiReply: 'A2모둠 안녕! 온도가 높을 때 반응 속도가 빨라진다는 멋진 가설을 세워주었구나.'
      },
      {
        date: new Date().toISOString().split('T')[0],
        time: '13:56',
        classVal: '7반',
        groupVal: 'A2모둠',
        topicVal: '온도와 반응 속도',
        userQuestion: '온도가 높으면 빨라 움직이니까 충돌 횟수가 증가하니까.',
        aiReply: '맞아! 그렇다면 입자들의 움직임이 왜 전체 반응 속도에 영향을 줄까?'
      }
    ],
    dashboardResults: {
      classVal: '7반',
      groupVal: 'A2모둠',
      topicVal: '온도와 반응 속도',
      overallLevel: 'Level 3',
      overallFeedback: '초반에는 단순 발화가 있었으나, 중반 이후 온도가 높으면 반응 속도가 빨라진다는 명확한 [주장]을 세우고, 입자의 움직임이라는 [근거]를 거쳐, 충돌과 반응 관계를 설명하는 [정당화] 단계까지 논리적으로 사고를 잘 확장했습니다.',
      utterances: [
        { no: 1, date: new Date().toISOString().split('T')[0], time: '13:55', text: '온도가 높아요 더워요', judgment: '[판단 유보]', evaluation: '현재 상황에 대한 단순 감탄사로 논증 요소로 보기 어려움.' },
        { no: 2, date: new Date().toISOString().split('T')[0], time: '13:56', text: '온도가 높으면 반응 속도가 빨라져요', judgment: '[주장]', evaluation: '온도와 반응 속도에 대한 자신의 입장을 명확한 결론 형태로 제시함.' },
        { no: 3, date: new Date().toISOString().split('T')[0], time: '13:56', text: '온도가 높으면 빨라 움직이니까 충돌 횟수가 증가하니까.', judgment: '[근거]', evaluation: '주장을 뒷받침하기 위해 입자의 빠른 움직임과 충돌 횟수 증가라는 원인을 제시함.' }
      ]
    }
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

export function saveLocalDatabase(db: any) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

/**
 * Searches Google Drive for existing database file or creates it.
 */
export async function ensureSpreadsheetExists(token: string): Promise<string> {
  if (!token) {
    return getLocalDatabase().spreadsheetId;
  }

  // 1. Search for existing spreadsheet file in Google Drive
  const qStr = encodeURIComponent(`name = '${DATABASE_FILENAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${qStr}&fields=files(id,name)`;

  let searchRes: Response;
  try {
    searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (netErr: any) {
    throw new Error(`Google Drive 네트워크 연결 실패: ${netErr.message}`);
  }

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  } else {
    const errJson = await searchRes.json().catch(() => ({}));
    const errMsg = errJson.error?.message || searchRes.statusText;
    console.warn("Drive search error:", searchRes.status, errMsg);
    if (searchRes.status === 403 && (errMsg.includes('disabled') || errMsg.includes('has not been used'))) {
      throw new Error(`Google Drive API가 구글 클라우드 콘솔에서 활성화(Enable)되지 않았습니다. Google Cloud Console > 라이브러리에서 'Google Drive API'를 사용 설정해주세요.`);
    }
  }

  // 2. File not found -> Create new spreadsheet with 5 tabs
  const createUrl = 'https://sheets.googleapis.com/v1/spreadsheets';
  const payload = {
    properties: { title: DATABASE_FILENAME },
    sheets: [
      { properties: { title: '환경설정' } },
      { properties: { title: '기본설정' } },
      { properties: { title: '채팅기록' } },
      { properties: { title: '논증평가설정' } },
      { properties: { title: '대시보드' } }
    ]
  };

  let createRes: Response;
  try {
    createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (netErr: any) {
    throw new Error(`Google Sheets 생성 네트워크 오류: ${netErr.message}`);
  }

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    const errMsg = errJson.error?.message || createRes.statusText;
    if (createRes.status === 403) {
      throw new Error(`Google Sheets API 권한 오류(403): ${errMsg}. 구글 클라우드 콘솔 > 라이브러리에서 'Google Sheets API'를 사용 설정(Enable)했는지 확인해주세요.`);
    }
    throw new Error(`구글 시트 생성 실패 (${createRes.status}): ${errMsg}`);
  }

  const newSheet = await createRes.json();
  const spreadsheetId = newSheet.spreadsheetId;

  // 3. Populate default values for the 5 tabs
  await initializeSpreadsheetTabs(token, spreadsheetId);

  return spreadsheetId;
}

async function initializeSpreadsheetTabs(token: string, spreadsheetId: string) {
  const envData = [
    ['Gemini API Key', DEFAULT_ENV_CONFIG.geminiApiKey],
    ['자료 공유 폴더 ID', DEFAULT_ENV_CONFIG.folderId],
    ['외부 연결 시트 ID', DEFAULT_ENV_CONFIG.backupSheetId],
    ['보고서 저장 폴더 ID', DEFAULT_ENV_CONFIG.reportFolderId],
    ['웹앱 배포 URL', DEFAULT_ENV_CONFIG.webAppUrl]
  ];

  const baseData = [
    ['프롬프트: 역할/페르소나', DEFAULT_BASE_CONFIG.pRole],
    ['프롬프트: 행동 지침', DEFAULT_BASE_CONFIG.pAction],
    ['프롬프트: 절대 제한', DEFAULT_BASE_CONFIG.pRestrict],
    ['프롬프트: 예외 대처', DEFAULT_BASE_CONFIG.pException],
    ['프롬프트: 추가/참고', DEFAULT_BASE_CONFIG.pExtra],
    ['설정: 제한 시간(분)', DEFAULT_BASE_CONFIG.timeLimitMinutes],
    ['설정: File API (ON/OFF)', DEFAULT_BASE_CONFIG.fileApi],
    ['설정: File URIs', DEFAULT_BASE_CONFIG.fileUris],
    ['설정: 기억할 대화 맥락(쌍)', DEFAULT_BASE_CONFIG.windowPairs],
    ['설정: 금지어 차단 목록', DEFAULT_BASE_CONFIG.bannedWords.join(', ')],
    ['환경: 학급 목록', DEFAULT_BASE_CONFIG.classList.join(', ')],
    ['환경: 모둠 목록', DEFAULT_BASE_CONFIG.groupList.join(', ')],
    ['환경: 탐구 주제 목록', DEFAULT_BASE_CONFIG.topicList.join(', ')]
  ];

  const rubricData = [
    ['평가자 역할', DEFAULT_RUBRIC_CONFIG.evalRole],
    ['요소별 판정 기준', DEFAULT_RUBRIC_CONFIG.criteria],
    ['종합 평가 루브릭', DEFAULT_RUBRIC_CONFIG.overallRubric],
    ['피드백 작성 지침', DEFAULT_RUBRIC_CONFIG.feedbackGuideline]
  ];

  const chatHeader = [
    ['날짜', '시간', '학급', '모둠', '탐구 주제', '학생 질문', 'AI 조언']
  ];

  const dashboardHeader = [
    ['🎯 모둠별 논증 발화 조회 및 툴민 논증 분석 대시보드', '', '', '', '', ''],
    ['학급 선택:', '7반', '모둠 선택:', 'A2모둠', '주제 선택:', '온도와 반응 속도'],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['논증 완성도 수준', '교사 피드백 제언', '', '', '', ''],
    ['Level 3', '논증 분석 대시보드입니다.', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['발화 번호', '날짜', '입력 시간', '학생/모둠 발언', '논증 판정', '요소별 세부 평가']
  ];

  const batchUpdateUrl = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  await fetch(batchUpdateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: '환경설정!A1:B5', values: envData },
        { range: '기본설정!A1:B13', values: baseData },
        { range: '논증평가설정!A1:B4', values: rubricData },
        { range: '채팅기록!A1:G1', values: chatHeader },
        { range: '대시보드!A1:F9', values: dashboardHeader }
      ]
    })
  });
}

/**
 * Fetch Env Config
 */
export async function fetchEnvConfig(token: string, spreadsheetId: string): Promise<EnvConfig> {
  if (!token || spreadsheetId === 'local_demo_sheet_id') {
    return getLocalDatabase().env;
  }
  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('환경설정!B1:B5')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Fetch Env Config failed');
    const data = await res.json();
    const rows = data.values || [];
    return {
      geminiApiKey: rows[0]?.[0] || '',
      folderId: rows[1]?.[0] || '',
      backupSheetId: rows[2]?.[0] || '',
      reportFolderId: rows[3]?.[0] || '',
      webAppUrl: rows[4]?.[0] || ''
    };
  } catch (e) {
    return getLocalDatabase().env;
  }
}

/**
 * Save Env Config
 */
export async function saveEnvConfig(token: string, spreadsheetId: string, config: EnvConfig): Promise<boolean> {
  const local = getLocalDatabase();
  local.env = config;
  saveLocalDatabase(local);

  if (!token || spreadsheetId === 'local_demo_sheet_id') return true;

  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('환경설정!B1:B5')}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          [config.geminiApiKey],
          [config.folderId],
          [config.backupSheetId],
          [config.reportFolderId],
          [config.webAppUrl]
        ]
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetch Base Config
 */
export async function fetchBaseConfig(token: string, spreadsheetId: string): Promise<BaseConfig> {
  if (!token || spreadsheetId === 'local_demo_sheet_id') {
    return getLocalDatabase().base;
  }
  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('기본설정!B1:B13')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Fetch Base Config failed');
    const data = await res.json();
    const rows = data.values || [];

    const parseList = (val: any) =>
      val ? val.toString().split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    return {
      pRole: rows[0]?.[0] || DEFAULT_BASE_CONFIG.pRole,
      pAction: rows[1]?.[0] || DEFAULT_BASE_CONFIG.pAction,
      pRestrict: rows[2]?.[0] || DEFAULT_BASE_CONFIG.pRestrict,
      pException: rows[3]?.[0] || DEFAULT_BASE_CONFIG.pException,
      pExtra: rows[4]?.[0] || DEFAULT_BASE_CONFIG.pExtra,
      timeLimitMinutes: parseInt(rows[5]?.[0], 10) || 20,
      fileApi: (rows[6]?.[0] || 'OFF').toString().toUpperCase() === 'ON' ? 'ON' : 'OFF',
      fileUris: rows[7]?.[0] || '',
      windowPairs: parseInt(rows[8]?.[0], 10) || 3,
      bannedWords: parseList(rows[9]?.[0]),
      classList: parseList(rows[10]?.[0]),
      groupList: parseList(rows[11]?.[0]),
      topicList: parseList(rows[12]?.[0])
    };
  } catch (e) {
    return getLocalDatabase().base;
  }
}

/**
 * Save Base Config
 */
export async function saveBaseConfig(token: string, spreadsheetId: string, config: BaseConfig): Promise<boolean> {
  const local = getLocalDatabase();
  local.base = config;
  saveLocalDatabase(local);

  if (!token || spreadsheetId === 'local_demo_sheet_id') return true;

  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('기본설정!B1:B13')}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          [config.pRole],
          [config.pAction],
          [config.pRestrict],
          [config.pException],
          [config.pExtra],
          [config.timeLimitMinutes],
          [config.fileApi],
          [config.fileUris],
          [config.windowPairs],
          [config.bannedWords.join(', ')],
          [config.classList.join(', ')],
          [config.groupList.join(', ')],
          [config.topicList.join(', ')]
        ]
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetch Rubric Config
 */
export async function fetchRubricConfig(token: string, spreadsheetId: string): Promise<RubricConfig> {
  if (!token || spreadsheetId === 'local_demo_sheet_id') {
    return getLocalDatabase().rubric;
  }
  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('논증평가설정!B1:B4')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Fetch Rubric failed');
    const data = await res.json();
    const rows = data.values || [];
    return {
      evalRole: rows[0]?.[0] || DEFAULT_RUBRIC_CONFIG.evalRole,
      criteria: rows[1]?.[0] || DEFAULT_RUBRIC_CONFIG.criteria,
      overallRubric: rows[2]?.[0] || DEFAULT_RUBRIC_CONFIG.overallRubric,
      feedbackGuideline: rows[3]?.[0] || DEFAULT_RUBRIC_CONFIG.feedbackGuideline
    };
  } catch (e) {
    return getLocalDatabase().rubric;
  }
}

/**
 * Save Rubric Config
 */
export async function saveRubricConfig(token: string, spreadsheetId: string, config: RubricConfig): Promise<boolean> {
  const local = getLocalDatabase();
  local.rubric = config;
  saveLocalDatabase(local);

  if (!token || spreadsheetId === 'local_demo_sheet_id') return true;

  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('논증평가설정!B1:B4')}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          [config.evalRole],
          [config.criteria],
          [config.overallRubric],
          [config.feedbackGuideline]
        ]
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetch Chat Records
 */
export async function fetchChatRecords(token: string, spreadsheetId: string): Promise<ChatRecord[]> {
  if (!token || spreadsheetId === 'local_demo_sheet_id') {
    return getLocalDatabase().chatRecords || [];
  }
  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('채팅기록!A2:G1000')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Fetch Chat Records failed');
    const data = await res.json();
    const rows = data.values || [];
    return rows.map((r: any[], idx: number) => ({
      rowIndex: idx + 2,
      date: r[0] || '',
      time: r[1] || '',
      classVal: r[2] || '',
      groupVal: r[3] || '',
      topicVal: r[4] || '',
      userQuestion: r[5] || '',
      aiReply: r[6] || ''
    }));
  } catch (e) {
    return getLocalDatabase().chatRecords || [];
  }
}

/**
 * Append Chat Record to Sheet 4 ('채팅기록')
 */
export async function appendChatRecord(token: string, spreadsheetId: string, record: ChatRecord): Promise<boolean> {
  const local = getLocalDatabase();
  if (!local.chatRecords) local.chatRecords = [];
  local.chatRecords.push(record);
  saveLocalDatabase(local);

  if (!token || spreadsheetId === 'local_demo_sheet_id') return true;

  try {
    const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('채팅기록!A1:G1')}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          [record.date, record.time, record.classVal, record.groupVal, record.topicVal, record.userQuestion, record.aiReply]
        ]
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Update Dashboard Tab with Analysis Results
 */
export async function updateDashboardResults(
  token: string,
  spreadsheetId: string,
  classVal: string,
  groupVal: string,
  topicVal: string,
  overallLevel: string,
  overallFeedback: string,
  utterances: UtteranceAnalysis[]
): Promise<boolean> {
  const local = getLocalDatabase();
  local.dashboardResults = {
    classVal,
    groupVal,
    topicVal,
    overallLevel,
    overallFeedback,
    utterances
  };
  saveLocalDatabase(local);

  if (!token || spreadsheetId === 'local_demo_sheet_id') return true;

  try {
    const rows = utterances.map((u) => [u.no, u.date, u.time, u.text, u.judgment, u.evaluation]);

    const batchUrl = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const res = await fetch(batchUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: '대시보드!B2', values: [[classVal]] },
          { range: '대시보드!D2', values: [[groupVal]] },
          { range: '대시보드!F2', values: [[topicVal]] },
          { range: '대시보드!A7', values: [[overallLevel]] },
          { range: '대시보드!B7', values: [[overallFeedback]] },
          { range: '대시보드!A10:F1000', values: rows }
        ]
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
