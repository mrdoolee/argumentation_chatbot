import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to get GenAI instance
function getGenAIClient(apiKeyOverride?: string) {
  const apiKey = apiKeyOverride?.trim() || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다. 교사 관리자 [환경설정] 탭에서 Gemini API Key를 저장하거나 서버 환경변수를 확인해주세요.");
  }
  return new GoogleGenAI({ apiKey });
}

// ---------------------------------------------------------
// 1. Student Chat Endpoint (/api/gemini/chat)
// ---------------------------------------------------------
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const {
      pRole = "",
      pAction = "",
      pRestrict = "",
      pException = "",
      pExtra = "",
      classValue = "1반",
      groupValue = "1모둠",
      topicValue = "과학탐구",
      userQuestion = "",
      history = [],
      windowPairs = 3,
      apiKeyOverride = ""
    } = req.body;

    if (!userQuestion || !userQuestion.trim()) {
      return res.status(400).json({ success: false, error: "질문 내용을 입력해주세요." });
    }

    const ai = getGenAIClient(apiKeyOverride);

    // System instruction text
    const systemInstructionText = [
      "[역할]\n" + pRole,
      "[행동 지침]\n" + pAction,
      "[제한 사항]\n" + pRestrict,
      "[예외 대처]\n" + pException,
      "[추가 참고]\n" + pExtra,
      "\n[현재 논의 중인 학생 정보]",
      `- 소속: ${classValue} ${groupValue}`,
      `- 탐구 주제: ${topicValue}`
    ].join("\n");

    // History trimming
    const sliceCount = windowPairs * 2;
    const cleanHistory = (history || []).filter((h: any, idx: number) => {
      if (idx === 0 && h.role === "ai") return false;
      return true;
    });

    const trimmedHistory = cleanHistory.slice(-sliceCount);
    const contents: any[] = [];

    trimmedHistory.forEach((item: any) => {
      contents.push({
        role: item.role === "ai" ? "model" : "user",
        parts: [{ text: item.text }]
      });
    });

    contents.push({
      role: "user",
      parts: [{ text: userQuestion }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemInstructionText,
        temperature: 0.7,
      }
    });

    let aiReply = response.text || "응답 생성 실패";
    let isBlockedByAI = false;

    if (aiReply.includes("[강제차단]")) {
      isBlockedByAI = true;
      aiReply = aiReply.replace("[강제차단]", "").trim();
      aiReply = "🚫 수업과 무관한 헛소리 및 장난이 지속되어 챗봇이 강제 차단되었습니다.\n\n" + aiReply;
    }

    return res.json({
      success: true,
      isBlocked: isBlockedByAI,
      aiReply
    });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Gemini API 통신 중 오류가 발생했습니다."
    });
  }
});

// ---------------------------------------------------------
// 2. Toulmin Argumentation Analysis Endpoint (/api/gemini/analyze)
// ---------------------------------------------------------
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const {
      evalRole = "",
      criteria = "",
      overallRubric = "",
      feedbackGuideline = "",
      chatRecordsText = "",
      apiKeyOverride = ""
    } = req.body;

    if (!chatRecordsText || !chatRecordsText.trim()) {
      return res.status(400).json({ success: false, error: "분석할 대화 기록이 없습니다." });
    }

    const ai = getGenAIClient(apiKeyOverride);

    const systemPrompt = [
      "[역할]\n" + evalRole,
      "[요소별 판정 기준]\n" + criteria,
      "[종합 평가 루브릭]\n" + overallRubric,
      "[피드백 작성 지침]\n" + feedbackGuideline,
      "\n위 기준을 바탕으로 제공된 대화를 툴민 논증 구조로 분석하고, 반드시 아래의 JSON 형식으로만 응답해.",
      "JSON 스키마 예시:",
      "{",
      '  "utterances": [',
      '    { "no": 1, "judgment": "[주장]", "evaluation": "가설의 형태를 잘 갖춤." }',
      "  ],",
      '  "overallLevel": "Level 2",',
      '  "overallFeedback": "종합 피드백 내용..."',
      "}"
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: "분석할 대화 기록:\n" + chatRecordsText }]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            utterances: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.INTEGER },
                  judgment: { type: Type.STRING },
                  evaluation: { type: Type.STRING }
                },
                required: ["no", "judgment", "evaluation"]
              }
            },
            overallLevel: { type: Type.STRING },
            overallFeedback: { type: Type.STRING }
          },
          required: ["utterances", "overallLevel", "overallFeedback"]
        }
      }
    });

    const rawText = response.text || "{}";
    let analysisResult;
    try {
      analysisResult = JSON.parse(rawText);
    } catch (parseErr) {
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      analysisResult = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      result: analysisResult
    });
  } catch (error: any) {
    console.error("Gemini Analysis API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "논증 분석 중 오류가 발생했습니다."
    });
  }
});

// ---------------------------------------------------------
// Express Server & Vite Integration
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
