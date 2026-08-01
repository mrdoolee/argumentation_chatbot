/**
 * Google Docs REST API Utility
 * Generates Toulmin Argumentation Analysis Reports in Teacher's Google Drive.
 */

import { UtteranceAnalysis } from '../types';

export interface CreateReportParams {
  token: string;
  classVal: string;
  groupVal: string;
  topicVal: string;
  overallLevel: string;
  overallFeedback: string;
  utterances: UtteranceAnalysis[];
  reportFolderId?: string;
}

export async function createDocsReport({
  token,
  classVal,
  groupVal,
  topicVal,
  overallLevel,
  overallFeedback,
  utterances,
  reportFolderId
}: CreateReportParams): Promise<{ docId: string; docUrl: string }> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const docTitle = `[논증분석] ${classVal}_${groupVal}_${topicVal}_${dateStr.replace(/-/g, '')}_${timeStr.replace(':', '')}`;

  if (!token) {
    // Demo Mode fallback
    const fakeDocId = 'demo_doc_' + Date.now();
    return {
      docId: fakeDocId,
      docUrl: `https://docs.google.com/document/d/demo_preview/edit?title=${encodeURIComponent(docTitle)}`
    };
  }

  try {
    // 1. Create empty Document
    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: docTitle })
    });

    if (!createRes.ok) {
      throw new Error(`Docs Creation failed: ${createRes.statusText}`);
    }

    const docData = await createRes.json();
    const docId = docData.documentId;
    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    // 2. Build text payload and insert into Document using batchUpdate
    const contentText = [
      `논증 분석 보고서`,
      `==========================================`,
      `■ 기본 정보`,
      `  • 학급: ${classVal}`,
      `  • 모둠: ${groupVal}`,
      `  • 탐구 주제: ${topicVal}`,
      `  • 분석 일시: ${dateStr} ${timeStr}`,
      ``,
      `■ 종합 논증 완성도: ${overallLevel}`,
      `${overallFeedback}`,
      ``,
      `■ 발화별 상세 분석 (${utterances.length}건)`,
      `------------------------------------------`,
      ...utterances.map(
        (u) =>
          `[발화 ${u.no} - ${u.date} ${u.time}]\n` +
          `학생 발언: ${u.text}\n` +
          `논증 판정: ${u.judgment}\n` +
          `세부 평가: ${u.evaluation}\n`
      ),
      `------------------------------------------`,
      `© Argumentation ChatBOT by 두리쌤`
    ].join('\n');

    await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: contentText
            }
          }
        ]
      })
    });

    // 3. Move file to specified folder if folderId is provided
    if (reportFolderId && reportFolderId.trim()) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${docId}?addParents=${encodeURIComponent(
            reportFolderId.trim()
          )}&removeParents=root&fields=id,parents`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (e) {
        console.warn('Failed to move doc to folder:', e);
      }
    }

    return { docId, docUrl };
  } catch (err: any) {
    console.error('Create Docs report error:', err);
    throw new Error(err.message || '보고서 문서 생성에 실패했습니다.');
  }
}
