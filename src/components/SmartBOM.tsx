import React, { useState } from "react";
import { Upload, AlertTriangle, FileSpreadsheet, ArrowRight, Download, RefreshCw, RefreshCcw, HelpCircle, Sparkles } from "lucide-react";
import { BOMItem, ChangeLogItem } from "../types";

// 모의 가상 CATIA 어셈블리 데이터셋 (Ver 1.0)
const initialBOMv1: BOMItem[] = [
  { id: "1", partNumber: "HW-BL-D08-L040-TI", partName: "Hex Bolt Titanium", quantity: 24, material: "Ti-6Al-4V", weight: 0.012, treatment: "Anodizing", type: "Part" },
  { id: "2", partNumber: "HW-NT-D08-L000-TI", partName: "Hex Nut Titanium", quantity: 24, material: "Ti-6Al-4V", weight: 0.005, treatment: "None", type: "Part" },
  { id: "3", partNumber: "HW-BR-D15-L000-SS", partName: "Ball Bearing Steel", quantity: 2, material: "SS 316", weight: 0.12, treatment: "Quenching", type: "Part" },
  { id: "4", partNumber: "HW-AS-TURB-001", partName: "Turbine Stage Assembly", quantity: 1, material: "Mixed", weight: 12.5, treatment: "None", type: "Assembly" },
  { id: "5", partNumber: "HW-PV-SHFT-102-IN", partName: "Rotor Main Shaft", quantity: 1, material: "Inconel 718", weight: 4.8, treatment: "Nitridation", type: "Part" },
];

// 도면 기재 수량 (정합성 체크용 모의 도면 데이터)
const drawingQuantityMap: Record<string, number> = {
  "HW-BL-D08-L040-TI": 24,
  "HW-NT-D08-L000-TI": 20, // 3D 수량은 24개인데 도면은 20개 (불일치 발생 유도!)
  "HW-BR-D15-L000-SS": 2,
  "HW-AS-TURB-001": 1,
  "HW-PV-SHFT-102-IN": 1,
};

export default function SmartBOM() {
  const [bomItems, setBomItems] = useState<BOMItem[]>(initialBOMv1);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [changeLog, setChangeLog] = useState<ChangeLogItem[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  // 3D 수량 vs 2D 도면 수량 정합성 체크 결과
  const integrityCheck = bomItems.map((item) => {
    const drawQty = drawingQuantityMap[item.partNumber] ?? item.quantity;
    const isMatched = item.quantity === drawQty;
    return {
      partNumber: item.partNumber,
      bomQty: item.quantity,
      drawQty,
      isMatched,
    };
  });

  // 드래그 앤 드롭 파일 업로드 핸들러
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      triggerBOMExtraction();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      triggerBOMExtraction();
    }
  };

  // CATIA 데이터 추출 가상 엔진
  const triggerBOMExtraction = () => {
    setIsUploading(true);
    setTimeout(() => {
      // 업로드 시 수량이 변동된 Ver 2.0으로 로드 (Change Log 시뮬레이션용)
      const updatedBOM: BOMItem[] = [
        ...initialBOMv1.map((item) => {
          if (item.partNumber === "HW-BL-D08-L040-TI") {
            return { ...item, quantity: 28 }; // Hex Bolt 수량 변경 (24 -> 28)
          }
          return item;
        }),
        // 새로운 리벳 부품 추가
        {
          id: "6",
          partNumber: "HW-RV-D04-L012-SS",
          partName: "Riveting Stud Stainless",
          quantity: 12,
          material: "SS 316",
          weight: 0.002,
          treatment: "Passivation",
          type: "Part",
        },
      ];

      // 삭제된 부품: HW-NT-D08-L000-TI 수정을 가정하기 위해 로그 제작
      const logs: ChangeLogItem[] = [
        {
          partNumber: "HW-BL-D08-L040-TI",
          partName: "Hex Bolt Titanium",
          action: "MODIFIED",
          field: "수량 (Quantity)",
          oldValue: "24 EA",
          newValue: "28 EA",
        },
        {
          partNumber: "HW-RV-D04-L012-SS",
          partName: "Riveting Stud Stainless",
          action: "ADDED",
          newValue: "12 EA",
        },
      ];

      setBomItems(updatedBOM);
      setChangeLog(logs);
      setIsUploading(false);
      setCompareMode(true);
    }, 1500);
  };

  // 한화 ERP 양식 다운로드 (CSV 변환 다운로드 모사)
  const downloadERPBOM = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ERP_CODE,PART_NUMBER,PART_NAME,QTY,MATERIAL,WEIGHT_KG,HEAT_TREATMENT,TYPE\n";

    bomItems.forEach((item) => {
      const erpCode = `HE-${item.partNumber.substring(3, 8)}`;
      csvContent += `"${erpCode}","${item.partNumber}","${item.partName}",${item.quantity},"${item.material}",${item.weight},"${item.treatment}","${item.type}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Hanwha_Aerospace_ERP_BOM.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gemini API를 이용한 BOM 불일치 해결 가이드 제안
  const runAIBOMAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const mismatches = integrityCheck.filter((c) => !c.isMatched);
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bom-mismatch",
          payload: {
            mismatch_items: mismatches,
            full_bom: bomItems,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiAnalysis(data.result);
      } else {
        setAiAnalysis(`에러 발생: ${data.error}`);
      }
    } catch (err: any) {
      setAiAnalysis(`AI 연결에 실패했습니다: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // BOM 상태 리셋
  const handleReset = () => {
    setBomItems(initialBOMv1);
    setChangeLog([]);
    setCompareMode(false);
    setAiAnalysis("");
  };

  return (
    <div id="smart-bom-converter" className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
      {/* BOM Upload & Controls */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-500" />
                CATIA Assembly BOM 자동 변환기
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                CATProduct, CATPart 파일 혹은 트리 구조 어셈블리를 가공하여 ERP 업로드용 Excel 표준으로 정렬 및 매핑합니다.
              </p>
            </div>
            {compareMode && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700 transition-all"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                처음 상태로
              </button>
            )}
          </div>

          {/* Drag & Drop File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
              dragActive ? "border-orange-500 bg-orange-500/5" : "border-zinc-800 bg-zinc-950/40"
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center py-4">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                <p className="text-sm font-medium text-white">CATIA 제품 트리 가공 및 속성 추출 중...</p>
                <p className="text-xs text-zinc-500 mt-1">Pandas DataFrame 구조로 자동 변환 중입니다.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-10 h-10 text-zinc-500 mb-3" />
                <p className="text-sm font-medium text-zinc-300">
                  <span className="text-orange-500 font-semibold cursor-pointer">여기를 눌러 업로드</span>하거나 CATIA 파일 드래그 앤 드롭
                </p>
                <p className="text-xs text-zinc-500 mt-1.5">
                  지원 규격: .CATProduct, .CATPart, .xlsx, .csv (자동 파싱 엔진 동작)
                </p>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="bom-file-input"
                  accept=".CATProduct,.CATPart,.xlsx,.csv"
                />
                <label
                  htmlFor="bom-file-input"
                  className="mt-4 px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-semibold rounded-lg border border-zinc-700 cursor-pointer transition-all"
                >
                  BOM 파일 선택
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Extracted BOM Data Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 bg-zinc-800/40 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">BOM 데이터 속성 추출 리스트</h4>
            <div className="flex gap-2">
              <button
                onClick={downloadERPBOM}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs py-1.5 px-3 rounded flex items-center gap-1.5 transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                한화 ERP용 BOM (CSV) 다운로드
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono">
                  <th className="p-3">부품 코드</th>
                  <th className="p-3">부품명</th>
                  <th className="p-3 text-right">3D 수량</th>
                  <th className="p-3 text-right">2D 도면 수량</th>
                  <th className="p-3">재질</th>
                  <th className="p-3 text-right">중량 (kg)</th>
                  <th className="p-3">열처리 규격</th>
                  <th className="p-3 text-center">정합성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                {bomItems.map((item) => {
                  const check = integrityCheck.find((c) => c.partNumber === item.partNumber);
                  const isMatched = check?.isMatched ?? true;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-all">
                      <td className="p-3 text-white font-bold">{item.partNumber}</td>
                      <td className="p-3">{item.partName}</td>
                      <td className="p-3 text-right font-semibold">{item.quantity} EA</td>
                      <td className="p-3 text-right text-zinc-400">
                        {drawingQuantityMap[item.partNumber] ?? item.quantity} EA
                      </td>
                      <td className="p-3">{item.material}</td>
                      <td className="p-3 text-right">{item.weight}</td>
                      <td className="p-3">{item.treatment}</td>
                      <td className="p-3 text-center">
                        {isMatched ? (
                          <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/20">
                            일치
                          </span>
                        ) : (
                          <span className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-500/20 animate-pulse font-bold">
                            불일치
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side Integrity & Version Change Tracker */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        {/* Integrity Warning Block */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            3D-2D 수량 정합성 실시간 검토
          </h4>

          {integrityCheck.some((c) => !c.isMatched) ? (
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs leading-relaxed">
                <strong>경고:</strong> 도면 표기 수량과 CATIA 3D 모델 상의 수량이 일치하지 않는 규격 부품이 발견되었습니다. 정합성 불일치는 오발주 및 현장 조립 차질의 주요 원인이 됩니다.
              </div>

              <div className="space-y-2 mt-3">
                {integrityCheck
                  .filter((c) => !c.isMatched)
                  .map((c) => (
                    <div
                      key={c.partNumber}
                      className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-white font-semibold">{c.partNumber}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-sky-400 font-bold">{c.bomQty} EA (3D)</span>
                        <ArrowRight className="w-3 h-3 text-zinc-500" />
                        <span className="text-red-400 font-bold">{c.drawQty} EA (도면)</span>
                      </div>
                    </div>
                  ))}
              </div>

              <button
                onClick={runAIBOMAnalysis}
                disabled={aiLoading}
                className="w-full mt-4 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-400 text-xs font-semibold py-2.5 px-4 rounded-lg border border-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading ? "Gemini 분석 중..." : "AI 정합성 원인 분석 및 가이드 요청"}
              </button>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg p-4 text-center">
              수량 불일치 오류가 검출되지 않았습니다. 3D 모델 및 도면 기재 수량이 완벽하게 정합합니다 (100% 무결성).
            </div>
          )}
        </div>

        {/* Change Log (이전 버전과의 비교 트래커) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex-1 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              이전 버전과 비교 변경 이력 (Change Log)
            </h4>
            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              최신 CATIA 설계 업데이트가 진행되었습니다. 이전 BOM (BOM_v1.0.xlsx)과 자동 분석 비교하여 변경 리스트를 추출했습니다.
            </p>

            {changeLog.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-lg p-8 text-center text-zinc-500 text-xs">
                업그레이드된 신규 설계 모델을 로드하여 이전 사양과의 변경 이력을 확인해 보세요.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {changeLog.map((log, i) => (
                  <div
                    key={i}
                    className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white font-bold">{log.partNumber}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          log.action === "ADDED"
                            ? "bg-green-500/10 text-green-400"
                            : log.action === "REMOVED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {log.action}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-medium">부품명: {log.partName}</div>
                    {log.field && (
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-mono mt-0.5">
                        <span className="text-zinc-400">{log.field}:</span>
                        <span className="line-through text-red-400">{log.oldValue}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-zinc-600" />
                        <span className="text-green-400 font-bold">{log.newValue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {compareMode && changeLog.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
              이전 BOM 대비 볼트 수량이 <strong>4 EA 추가</strong>되었으며, 고온 환경용 리벳 리스트가 <strong>새로 생성</strong>되었습니다.
            </div>
          )}
        </div>
      </div>

      {/* AI Troubleshooting Report Panel */}
      {aiAnalysis && (
        <div className="col-span-full bg-zinc-900 border border-orange-500/20 rounded-xl p-5 shadow-lg shadow-orange-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
            <h4 className="text-sm font-semibold text-white">Hanwha Aerospace ADIS AI 스마트 정합성 분석 보고서</h4>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-4 text-xs leading-relaxed text-zinc-300 font-sans whitespace-pre-wrap">
            {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
}
