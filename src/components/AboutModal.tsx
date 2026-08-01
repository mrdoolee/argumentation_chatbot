import React from 'react';
import { X, Heart, ShieldCheck, Instagram, HelpCircle } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl">
            🗣️
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Argumentation ChatBOT</h3>
            <p className="text-xs text-indigo-600 font-semibold">버전 v1.0 (2026.07) · 두리쌤</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-gray-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-800 text-xs mb-1.5 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-500" /> 이용 조건
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>교육 목적으로 자유롭게 사용하실 수 있습니다.</li>
              <li>재배포 시 출처(제작자 표기: 두리쌤)를 유지해 주세요.</li>
              <li>코드를 임의로 수정한 버전을 다시 배포하지 말아 주세요.</li>
            </ul>
          </div>

          <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100/60">
            <h4 className="font-bold text-indigo-900 text-xs mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> 데이터 보안 및 저장 안내
            </h4>
            <p className="text-indigo-950">
              학생 응시 기록 및 대화 데이터는 <strong>선생님의 개인 구글 드라이브(스프레드시트)</strong>에만 저장됩니다. 개발자나 외부 서버에 저장되지 않습니다.
            </p>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100/60">
            <h4 className="font-bold text-emerald-900 text-xs mb-1.5 flex items-center gap-1.5">
              <Instagram className="w-4 h-4 text-emerald-600" /> 문의 및 피드백
            </h4>
            <p className="text-emerald-950">
              Instagram: <strong className="text-emerald-800">@trdoolee</strong>
              <br />
              간단한 질문 위주로 답변드리며, 현장 수업 일정에 따라 답변이 지연될 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
