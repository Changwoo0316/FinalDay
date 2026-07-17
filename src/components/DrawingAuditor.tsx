import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, Plus, Eye, Save, Code, CheckSquare, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import { DrawingError } from "../types";

// 기본 도면 검증 룰 셋 (JSON/YAML 분리 준수)
const initialRules = {
  dimensionRules: [
    { id: "R_DIM_01", type: "dimension", name: "허용 공차 누락 방지 규칙", active: true, desc: "정밀 공차 치수에 억지끼워맞춤 등 허용 공차가 명기되어 있는지 스캔" },
    { id: "R_DIM_02", type: "dimension", name: "중복 치수 기입 스캔 규칙", active: true, desc: "기준면으로부터의 중복 또는 불필요한 누적 공차 유발 치수 검사" },
    { id: "R_DIM_03", type: "dimension", name: "치수선 간섭 방지 규칙", active: true, desc: "형상선과 치수선 간의 최소 거리 확보 및 교차 교점 간섭 유무 스캔" },
  ],
  annotationRules: [
    { id: "R_ANN_01", type: "annotation", name: "필수 도면 주석 검출 규칙", active: true, desc: "품번, 원소재, 열처리 주기, 표면 처리 규격 누락 여부 검사" },
    { id: "R_ANN_02", type: "annotation", name: "한국어/영어 혼용 표기법 오탈자 규칙", active: true, desc: "사내 표준 어휘집 기반 단어 오용 스캔" },
  ],
  complianceRules: [
    { id: "R_STD_01", type: "standard", name: "Hanwha Standard Title Block 스캔", active: true, desc: "도면 하부 우측 규격 양식 타이틀 블록 데이터 정합성 검사" },
    { id: "R_STD_02", type: "standard", name: "도면 레이어 및 선 가중치 표준 검사", active: true, desc: "은선(Hidden), 중심선(Center), 외형선(Object) 등 레이어 세팅 여부" },
  ],
};

// 모의 가상 검증 대상 도면 에러셋 (Canvas 위에 하이라이팅될 좌표를 포함)
const defaultDrawingErrors: DrawingError[] = [
  {
    id: "err-1",
    type: "dimension",
    severity: "error",
    title: "중복 치수 기입 감지",
    description: "로터 베어링 하우징 외경부 치수(Ø62.00)와 하부 플랜지 외경 치수가 중복 기입되어 중복 치수로 간주됨.",
    x: 42,
    y: 35,
    resolved: false,
  },
  {
    id: "err-2",
    type: "dimension",
    severity: "warning",
    title: "허용 정밀공차 누락",
    description: "터빈 축 중심 삽입 가이드 핀 지름 치수에 IT공차 등 끼워맞춤 허용 공차 치수 누락됨.",
    x: 25,
    y: 52,
    resolved: false,
  },
  {
    id: "err-3",
    type: "annotation",
    severity: "error",
    title: "필수 주석 누락 및 표기법 오용",
    description: "도면 좌상단 주석(Note)에 '열처리 공정 처리 주기' 문구가 누락되었으며, 'Anodizing'이 'Anodising'으로 오표기됨.",
    x: 12,
    y: 18,
    resolved: false,
  },
  {
    id: "err-4",
    type: "standard",
    severity: "warning",
    title: "Title Block 정보 불일치",
    description: "도면 명판 상의 도번(HW-PV-SHFT-102)과 CATIA Assembly 데이터 상의 도번이 불일치함.",
    x: 82,
    y: 85,
    resolved: false,
  },
];

// 도면 예시 주석 데이터 (AI Audit용)
const mockDrawingNotes = `
[GENERAL NOTES]
1. INTERPRET DIMENSIONS AND TOLERANCES PER ASME Y14.5M-1994.
2. MATERIAL: Ti-6Al-4V PER MIL-T-9047, HEAT TREATMENT TO ANNEALED.
3. SURFACE FINISH TO BE 3.2 Ra MAX EXCEPT WHERE NOTED.
4. REMOVE ALL BURRS AND BREAK SHARP EDGES 0.15~0.30mm MAX.
5. CAD FILE IDENTIFICATION: HW-PV-SHFT-102.CATPart
6. TREATEMENT: ANODISING AND SEALING PER MIL-A-8625 TYPE II CLASS 1.
7. COMPLIANCE CHECK: LAYER SEPARATION NOT FULLY APPLIED ON REVISION 2.
`;

export default function DrawingAuditor() {
  const [rules, setRules] = useState(initialRules);
  const [errors, setErrors] = useState<DrawingError[]>(defaultDrawingErrors);
  const [selectedError, setSelectedError] = useState<DrawingError | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"canvas" | "rules" | "notes">("canvas");
  const [customRuleJSON, setCustomRuleJSON] = useState(JSON.stringify(initialRules, null, 2));
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Canvas 도면 크기
  const canvasRef = useRef<HTMLDivElement>(null);

  // 룰 동적 업데이트
  const handleSaveRules = () => {
    try {
      const parsed = JSON.parse(customRuleJSON);
      setRules(parsed);
      alert("도면 검증 규칙이 실시간으로 로드 및 업데이트되었습니다!");
    } catch (e: any) {
      alert(`JSON 문법 오류가 있습니다: ${e.message}`);
    }
  };

  // 도면 스캔 실행 시뮬레이션
  const triggerDrawingAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setErrors(defaultDrawingErrors);
      setSelectedError(defaultDrawingErrors[0]);
    }, 1800);
  };

  // 에러 해결 상태로 토글
  const handleToggleResolve = (id: string) => {
    setErrors((prev) =>
      prev.map((err) => (err.id === id ? { ...err, resolved: !err.resolved } : err))
    );
    if (selectedError?.id === id) {
      setSelectedError((prev) => (prev ? { ...prev, resolved: !prev.resolved } : null));
    }
  };

  // AI를 통한 도면 주석 초정밀 감사
  const runAiNotesAudit = async () => {
    setAiLoading(true);
    setAiReport("");
    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "drawing-annotations",
          payload: mockDrawingNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiReport(data.result);
      } else {
        setAiReport(`에러 발생: ${data.error}`);
      }
    } catch (err: any) {
      setAiReport(`AI 연결 실패: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div id="drawing-auditor-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Tab Navigation for Drawing Auditor */}
      <div className="col-span-full flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("canvas")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "canvas" ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            실시간 도면 검도 피드백 (2D Canvas)
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "notes" ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            도면 주석 지능형 AI 감사 (Notes Audit)
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "rules" ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            검증 규칙 관리자 (Rules Editor)
          </button>
        </div>

        <button
          onClick={triggerDrawingAudit}
          disabled={isAuditing}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
        >
          {isAuditing ? "도면 표준 및 정밀 치수 스캔 중..." : "도면 자동 정밀 스캔 실행"}
        </button>
      </div>

      {activeTab === "canvas" && (
        <>
          {/* Main Drawing Visual Feedback Area */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col flex-1 relative min-h-[450px]">
              {/* Virtual Engineering Drawing Canvas */}
              <div
                ref={canvasRef}
                className="w-full flex-1 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden flex items-center justify-center p-6"
              >
                {/* Simulated Engineering Blueprint Background */}
                <div className="w-full h-full max-w-4xl max-h-[400px] border border-blue-500/20 relative flex items-center justify-center opacity-85">
                  {/* Grid Lines of Drafting Blueprint */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.04)_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                  {/* Blueprint Boundary Border */}
                  <div className="absolute inset-2 border border-blue-500/30 flex justify-between p-2 text-[8px] text-blue-500/50 font-mono">
                    <span className="absolute top-2 left-2">A1 / HW-PV-SHFT-102 REV.2</span>
                    <span className="absolute bottom-2 right-2">HANWHA AEROSPACE DESIGN DEP.</span>
                  </div>

                  {/* Drawn Part Geometry Lineart (SVG Style) */}
                  <svg className="w-2/3 h-2/3 stroke-sky-500 stroke-[1.5] fill-none opacity-80" viewBox="0 0 400 200">
                    {/* Rotor Shaft Contour Outline */}
                    <path d="M 40 100 L 80 100 L 80 70 L 140 70 L 140 50 L 260 50 L 260 70 L 320 70 L 320 100 L 360 100 L 360 110 L 320 110 L 320 130 L 260 130 L 260 150 L 140 150 L 140 130 L 80 130 L 80 110 L 40 110 Z" />
                    {/* Center axis line */}
                    <path d="M 20 105 L 380 105" strokeDasharray="5,3,1,3" className="stroke-rose-500/50" />
                    {/* Bearing journal lines */}
                    <line x1="140" y1="50" x2="140" y2="150" strokeDasharray="3,3" />
                    <line x1="260" y1="50" x2="260" y2="150" strokeDasharray="3,3" />

                    {/* Dimension lines (Drafting annotations) */}
                    <line x1="140" y1="35" x2="260" y2="35" strokeWidth="1" strokeDasharray="2,2" />
                    <path d="M 140 35 L 145 32 M 140 35 L 145 38 M 260 35 L 255 32 M 260 35 L 255 38" />
                    <text x="180" y="30" fill="#38bdf8" fontSize="8" className="font-mono">120.00 +/-0.05</text>

                    {/* Total Shaft Length Dim */}
                    <line x1="40" y1="175" x2="360" y2="175" strokeWidth="1" />
                    <path d="M 40 175 L 45 172 M 40 175 L 45 178 M 360 175 L 355 172 M 360 175 L 355 178" />
                    <text x="185" y="170" fill="#38bdf8" fontSize="8" className="font-mono">320.00 (Standard)</text>

                    {/* Note Box Area */}
                    <rect x="25" y="20" width="100" height="40" strokeDasharray="2,2" className="stroke-zinc-700" />
                    <text x="30" y="30" fill="#a1a1aa" fontSize="6" className="font-sans">GENERAL NOTES:</text>
                    <text x="30" y="40" fill="#71717a" fontSize="5" className="font-sans">1. HEAT TREATMENT TO ANNEALED</text>
                    <text x="30" y="50" fill="#71717a" fontSize="5" className="font-sans">2. ANODISING MIL-A-8625</text>
                  </svg>

                  {/* Active Interactive Error Coordinates Overlay on Blueprint */}
                  {errors.map((err) => (
                    <button
                      key={err.id}
                      onClick={() => setSelectedError(err)}
                      style={{ left: `${err.x}%`, top: `${err.y}%` }}
                      className={`absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center rounded-full font-bold text-xs transition-all animate-bounce ${
                        err.resolved
                          ? "bg-green-500/80 hover:bg-green-600 text-white cursor-pointer shadow-lg"
                          : err.severity === "error"
                          ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer shadow-lg shadow-red-500/30"
                          : "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-lg shadow-orange-500/30"
                      }`}
                    >
                      !
                    </button>
                  ))}
                </div>

                {/* Instructions overlay */}
                <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 bg-zinc-950/80 p-2 border border-zinc-800 rounded font-mono">
                  도면의 <span className="text-orange-400 font-bold">오류 지점 (!)</span> 아이콘을 누르면 상세 규칙 위반 리포트가 연동됩니다.
                </div>
              </div>
            </div>
          </div>

          {/* Right Selected Error Audit Detail Panel */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-zinc-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  스캔된 도면 오류 상세 리포트
                </h4>

                {selectedError ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          selectedError.severity === "error"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        }`}
                      >
                        {selectedError.severity} : {selectedError.type}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">ID: {selectedError.id}</span>
                    </div>

                    <div>
                      <h5 className="text-sm font-bold text-white mb-1.5">{selectedError.title}</h5>
                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
                        {selectedError.description}
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 text-[11px] text-zinc-400">
                      <strong className="text-zinc-300">권장 조치법 (Standard Fix):</strong>
                      <div className="mt-1 leading-relaxed">
                        {selectedError.type === "dimension"
                          ? "치수 정합성을 위해 CATIA 3D 피처 치수 속성을 갱신하고, 중복 치수는 도면 작성 뷰(Drafting View)에서 참조 치수(괄호 표기) 처리하십시오."
                          : selectedError.type === "annotation"
                          ? "사내 표준 Note 규격집(Doc-HQ-QA-01)에 고시된 템플릿과 열처리 표기 약어를 준수해 철자 수정을 진행하십시오."
                          : "품번 및 레이어 표준화 설정을 위해 레이어 전용 매퍼를 통해 도면 레이어 구성을 한화에어로스페이스 표준 템플릿으로 재할당하십시오."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-800 rounded-lg p-12 text-center text-zinc-500 text-xs my-auto">
                    스캔 후 도면 좌표계 또는 아래 리스트에서 감지된 위반 사항을 선택하세요.
                  </div>
                )}
              </div>

              {selectedError && (
                <div className="mt-6 pt-3 border-t border-zinc-800">
                  <button
                    onClick={() => handleToggleResolve(selectedError.id)}
                    className={`w-full py-2.5 px-4 font-medium text-xs rounded-lg transition-all ${
                      selectedError.resolved
                        ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white"
                        : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/10"
                    }`}
                  >
                    {selectedError.resolved ? "이슈 재활성화 (Active)" : "검토 완료 및 오류 수정완료 마크"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scan summary check results */}
          <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3">설계 도면 내 검출된 사내 규격 위반 전체 리스트 ({errors.length}건)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {errors.map((err) => (
                <div
                  key={err.id}
                  onClick={() => setSelectedError(err)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedError?.id === err.id
                      ? "bg-orange-500/5 border-orange-500/40"
                      : "bg-zinc-950 border-zinc-850 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                        err.resolved
                          ? "bg-green-500/10 text-green-400"
                          : err.severity === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-orange-500/10 text-orange-400"
                      }`}
                    >
                      {err.resolved ? "RESOLVED" : err.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">X:{err.x}% Y:{err.y}%</span>
                  </div>
                  <h5 className={`text-xs font-bold text-white ${err.resolved ? "line-through text-zinc-500" : ""}`}>{err.title}</h5>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{err.description}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "notes" && (
        <div className="col-span-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-orange-500" />
                추출된 설계 도면 Notes (텍스트)
              </h4>
              <p className="text-xs text-zinc-400 mb-3">
                도면 Title Block 및 Note 영역에서 광학식 문자 판독(OCR) 또는 CATIA Drafting API를 통해 실시간 임포트된 주석 구문입니다.
              </p>
              <textarea
                value={mockDrawingNotes}
                readOnly
                className="w-full h-[300px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500 leading-relaxed"
              ></textarea>
            </div>

            <button
              onClick={runAiNotesAudit}
              disabled={aiLoading}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white fill-white" />
              {aiLoading ? "Gemini 지능형 주석 Audit 중..." : "Gemini AI 도면 주석 정밀 검수 실행"}
            </button>
          </div>

          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex-1 flex flex-col">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                지능형 AI 검수 결과 피드백 보고서
              </h4>
              <p className="text-xs text-zinc-400 mb-3">
                사내 표준 품질 규격, ASME 표준 명칭, 오탈자, 필수 미기재 요소에 대해 분석된 AI 정밀 가이드라인입니다.
              </p>

              {aiReport ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-300 font-sans leading-relaxed flex-1 whitespace-pre-wrap overflow-y-auto max-h-[350px]">
                  {aiReport}
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-lg p-12 text-center text-zinc-500 text-xs flex-1 flex flex-col items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-zinc-600 mb-2 animate-pulse" />
                  좌측 검수 실행 버튼을 통해 지능형 AI 도면 주석 검사를 개시하세요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="col-span-full grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-orange-500" />
                  JSON 규격 룰 세트 관리 에디터
                </h4>
                <span className="bg-zinc-800 text-[10px] text-zinc-400 px-2.5 py-1 rounded border border-zinc-700">
                  Real-time Config
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                도면 검도의 모든 스캔 규정(레이어 가중치, 공차 유무, 주석 명칭)은 코드와 완전 분리 관리됩니다. JSON 변경 후 하단 반영 버튼을 누르십시오.
              </p>
              <textarea
                value={customRuleJSON}
                onChange={(e) => setCustomRuleJSON(e.target.value)}
                className="w-full h-[280px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-emerald-400 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500 leading-relaxed"
              ></textarea>
            </div>

            <button
              onClick={handleSaveRules}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              규격 규칙(Rules) 갱신 및 로드 적용
            </button>
          </div>

          <div className="xl:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-orange-500" />
              현재 활성화된 표준 검증 규칙 일람
            </h4>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              <div>
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest border-l-2 border-orange-500 pl-2 mb-2">
                  정밀 치수 규칙 (Dimension Rules)
                </h5>
                <div className="space-y-2">
                  {rules.dimensionRules.map((rule) => (
                    <div key={rule.id} className="bg-zinc-950 border border-zinc-850 p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-mono">{rule.id}</span>
                        <div className="text-xs text-white font-bold">{rule.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{rule.desc}</div>
                      </div>
                      <span className="bg-orange-500/10 text-orange-400 text-[10px] px-2 py-0.5 rounded border border-orange-500/20">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest border-l-2 border-orange-500 pl-2 mb-2">
                  표준 주석 규칙 (Annotation Rules)
                </h5>
                <div className="space-y-2">
                  {rules.annotationRules.map((rule) => (
                    <div key={rule.id} className="bg-zinc-950 border border-zinc-850 p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-mono">{rule.id}</span>
                        <div className="text-xs text-white font-bold">{rule.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{rule.desc}</div>
                      </div>
                      <span className="bg-orange-500/10 text-orange-400 text-[10px] px-2 py-0.5 rounded border border-orange-500/20">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest border-l-2 border-orange-500 pl-2 mb-2">
                  표준 규격 규칙 (Compliance Rules)
                </h5>
                <div className="space-y-2">
                  {rules.complianceRules.map((rule) => (
                    <div key={rule.id} className="bg-zinc-950 border border-zinc-850 p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-mono">{rule.id}</span>
                        <div className="text-xs text-white font-bold">{rule.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{rule.desc}</div>
                      </div>
                      <span className="bg-orange-500/10 text-orange-400 text-[10px] px-2 py-0.5 rounded border border-orange-500/20">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
