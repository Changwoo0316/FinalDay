/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FileSpreadsheet, Ruler, Cpu, ShieldAlert, Sparkles, LayoutDashboard, Database, HelpCircle } from "lucide-react";
import SmartBOM from "./components/SmartBOM";
import DrawingAuditor from "./components/DrawingAuditor";
import StandardPartGen from "./components/StandardPartGen";

export default function App() {
  const [activeTab, setActiveTab] = useState<"bom" | "drawing" | "standard">("bom");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      {/* Upper Navigation Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                  Aero-Design Intelligence Suite
                </h1>
                <span className="bg-orange-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">
                  ADIS
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Hanwha Aerospace Standard Shape Design Automation Workspace
              </p>
            </div>
          </div>

          {/* Module Selection Navigation */}
          <nav className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab("bom")}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "bom"
                  ? "bg-orange-500 text-white shadow"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Smart BOM 변환기
            </button>
            <button
              onClick={() => setActiveTab("drawing")}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "drawing"
                  ? "bg-orange-500 text-white shadow"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              도면 자동 검증기
            </button>
            <button
              onClick={() => setActiveTab("standard")}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "standard"
                  ? "bg-orange-500 text-white shadow"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              표준 부품 생성기
            </button>
          </nav>
        </div>
      </header>

      {/* Main Suite Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upper Value Proposition Overview Card */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-orange-950/20 border border-zinc-800 rounded-xl p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              형상설계 지능형 자동화 효율 지표
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              사내 CATIA API와 CAD 룰베이스 연동을 통해 데이터 검수 리드타임을 최대 95% 단축하고, 휴먼 에러 요소를 원천 제거하여 고효율의 디지털 엔지니어링 자산을 확보합니다.
            </p>
          </div>
          <div className="flex gap-4 font-mono">
            <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg text-center min-w-[100px]">
              <div className="text-xs text-zinc-500">BOM 작성</div>
              <div className="text-base font-bold text-orange-500 mt-0.5">95% 단축</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg text-center min-w-[100px]">
              <div className="text-xs text-zinc-500">도면 검도</div>
              <div className="text-base font-bold text-orange-500 mt-0.5">85% 단축</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg text-center min-w-[100px]">
              <div className="text-xs text-zinc-500">데이터 무결</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">100% 실현</div>
            </div>
          </div>
        </div>

        {/* Dynamic Panel Renderer */}
        <div className="transition-all duration-300">
          {activeTab === "bom" && <SmartBOM />}
          {activeTab === "drawing" && <DrawingAuditor />}
          {activeTab === "standard" && <StandardPartGen />}
        </div>
      </main>

      {/* Corporate Footer (Aerospace quality compliance style) */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-6 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div>AERO-DESIGN INTELLIGENCE SUITE (ADIS) v2.5.4</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">
              Designed for Hanwha Aerospace Gas Turbine Mechanical CAD Engineering
            </div>
          </div>
          <div className="flex gap-4">
            <a href="#compliance" className="hover:text-zinc-400">사내 품질 규정서</a>
            <a href="#catia" className="hover:text-zinc-400">pycatia Docs</a>
            <a href="#security" className="hover:text-zinc-400">보안성 및 암호 규격</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

