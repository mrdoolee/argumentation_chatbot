import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Sparkles, CheckCircle, FileText, Database } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="max-w-4xl w-full text-center space-y-8 my-auto">
        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-xs sm:text-sm font-semibold border border-indigo-100">
          <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
          에듀테크 상용 SaaS 수준 과학탐구 AI 챗봇
        </div>

        {/* Hero Title */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Argumentation ChatBOT
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            소크라테스형 발문 AI와 함께 학생들의 <strong className="font-semibold text-slate-800">툴민(Toulmin) 논증 사고력</strong>을 기르고,
            구글 드라이브 시트/문서 REST API 연동으로 탐구 과정을 분석·평가하세요.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
          {/* Student Portal Card */}
          <Link
            to="/student"
            className="group relative bg-white rounded-3xl p-8 border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-xs mb-6 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                학생용 탐구 공간 (/student)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-normal">
                별도의 로그인 없이 학급·모둠·주제를 선택하고 탐구를 시작합니다. 금지어 3-strike 자동 차단 및 타이머 기능이 제공됩니다.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
              학생용 탐구 입장하기 &rarr;
            </div>
          </Link>

          {/* Teacher Admin Card */}
          <Link
            to="/admin"
            className="group relative bg-white rounded-3xl p-8 border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-xs mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                교사 관리자 Workspace (/admin)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-normal">
                구글 Sheets 5개 탭 자동 연동, 프롬프트/루브릭 수정, 모둠별 대화 조회, AI 툴민 분석 및 Docs 보고서 자동 작성을 관리합니다.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              교사 관리자 입장하기 &rarr;
            </div>
          </Link>
        </div>

        {/* Key Features Pill Highlights */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> 소크라테스형 정답 제시 제한 발문
          </span>
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs">
            <Database className="w-4 h-4 text-indigo-600" /> 구글 드라이브 5개 탭 시트 구조
          </span>
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs">
            <FileText className="w-4 h-4 text-amber-600" /> Docs 보고서 자동 생성 REST API
          </span>
        </div>
      </div>
    </div>
  );
};
