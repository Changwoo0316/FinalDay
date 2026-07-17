export interface BOMItem {
  id: string;
  partNumber: string;
  partName: string;
  quantity: number;
  material: string;
  weight: number; // in kg
  treatment: string; // 열처리 등
  type: "Part" | "Assembly";
}

export interface DrawingError {
  id: string;
  type: "dimension" | "annotation" | "standard";
  severity: "error" | "warning";
  title: string;
  description: string;
  x: number; // 캔버스 좌표 X%
  y: number; // 캔버스 좌표 Y%
  resolved: boolean;
}

export interface StandardPartParams {
  category: "Bolt" | "Nut" | "Rivet" | "Bearing";
  size: string; // M3, M4, M5, M6, M8, M10, M12
  pitch: number; // in mm
  length: number; // in mm
  outerDiameter?: number; // bearing용
  innerDiameter?: number; // bearing용
  width?: number; // bearing용
  material: string;
}

export interface ChangeLogItem {
  partNumber: string;
  partName: string;
  action: "ADDED" | "REMOVED" | "MODIFIED";
  field?: string;
  oldValue?: string;
  newValue?: string;
}
