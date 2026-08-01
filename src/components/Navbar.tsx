import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Info, User, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
  onOpenAbout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAbout }) => {
  const location = useLocation();
  const { authUser, logout } = useApp();

  const isStudent = location.pathname === '/student';
  const isAdmin = location.pathname === '/admin';

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-all">
            🗣️
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-snug flex items-center gap-2">
              Argumentation ChatBOT
              <span className="text-[11px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-100">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">과학탐구 툴민 논증 분석 AI</p>
          </div>
        </Link>

        {/* Workspaces Navigation */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/student"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              isStudent
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            학생용 탐구
          </Link>

          <Link
            to="/admin"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              isAdmin
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            교사 관리자
          </Link>

          <button
            onClick={onOpenAbout}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            title="앱 정보 (두리쌤)"
            aria-label="정보"
          >
            <Info className="w-5 h-5" />
          </button>

          {authUser && (
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
              {authUser.picture ? (
                <img
                  src={authUser.picture}
                  alt={authUser.name}
                  className="w-7 h-7 rounded-full border border-slate-300"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[100px]">
                {authUser.name}
              </span>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
