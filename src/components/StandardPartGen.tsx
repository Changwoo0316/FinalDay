import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Play, Download, Settings, RefreshCw, Layers, ShieldCheck } from "lucide-react";
import { StandardPartParams } from "../types";

export default function StandardPartGen() {
  const [params, setParams] = useState<StandardPartParams>({
    category: "Bolt",
    size: "M8",
    pitch: 1.25,
    length: 40,
    material: "Ti-6Al-4V (Titanium Alloy)",
  });

  const [partNumber, setPartNumber] = useState("");
  const [createdParts, setCreatedParts] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Group | null>(null);

  // 사내 명명 규칙 적용
  // 규칙: HW-[CATEGORY_CODE]-[SIZE_CODE]-[LENGTH_CODE]-[MATERIAL_CODE]
  useEffect(() => {
    const catCode = params.category.substring(0, 2).toUpperCase();
    const sizeCode = params.size.replace("M", "D");
    const lenCode = params.length.toString().padStart(3, "0");
    const matCode = params.material.includes("Titanium")
      ? "TI"
      : params.material.includes("Inconel")
      ? "IN"
      : "SS";
    setPartNumber(`HW-${catCode}-${sizeCode}-L${lenCode}-${matCode}`);
  }, [params]);

  // Three.js Scene 생성 및 관리
  useEffect(() => {
    if (!containerRef.current) return;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x18181b); // dark zinc-900 background
    sceneRef.current = scene;

    // CAMERA
    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(40, 40, 60);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(20, 40, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffaa44, 0.4); // Warm accent light
    dirLight2.position.set(-20, -20, -20);
    scene.add(dirLight2);

    // GRID HELPER & AXIS
    const gridHelper = new THREE.GridHelper(50, 50, 0xf97316, 0x3f3f46); // Orange primary, zinc grid
    gridHelper.position.y = -15;
    scene.add(gridHelper);

    // PART GROUP
    const partGroup = new THREE.Group();
    scene.add(partGroup);
    meshRef.current = partGroup;

    // ANIMATION LOOP
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();

    // RESIZE HANDLING
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        // Clear children
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      }
    };
  }, []);

  // 파라미터 변경 시 3D 모델 실시간 업데이트
  useEffect(() => {
    const scene = sceneRef.current;
    const group = meshRef.current;
    if (!scene || !group) return;

    // Clear previous geometries
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const materialColor = params.material.includes("Titanium")
      ? 0xa1a1aa // Titanium Zinc
      : params.material.includes("Inconel")
      ? 0x71717a // Dark Titanium
      : 0xe4e4e7; // Stainless Steel Zinc

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: materialColor,
      metalness: 0.85,
      roughness: 0.2,
    });

    const axisMaterial = new THREE.LineBasicMaterial({ color: 0x38bdf8 }); // Cyan for Constraint Axis
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xf43f5e }); // Rose for Constraint Point

    // CATEGORY SPECIFIC GEOMETRY CREATION
    if (params.category === "Bolt") {
      // Bolt Head
      const headRadius = parseFloat(params.size.replace("M", "")) * 0.9;
      const headHeight = headRadius * 0.85;
      const headGeo = new THREE.CylinderGeometry(headRadius, headRadius, headHeight, 6); // Hex Head
      const headMesh = new THREE.Mesh(headGeo, metalMaterial);
      headMesh.position.y = headHeight / 2;
      group.add(headMesh);

      // Bolt Shank (Thread & Unthreaded length)
      const shankRadius = parseFloat(params.size.replace("M", "")) / 2;
      const shankLength = params.length;
      const shankGeo = new THREE.CylinderGeometry(shankRadius, shankRadius, shankLength, 32);
      const shankMesh = new THREE.Mesh(shankGeo, metalMaterial);
      shankMesh.position.y = -shankLength / 2;
      group.add(shankMesh);

      // Thread Detail Simulator (Toruses around shank)
      const threadCount = Math.floor(shankLength / params.pitch);
      for (let i = 0; i < threadCount; i++) {
        if (i > threadCount * 0.3) {
          // Unthreaded part remains smooth
          const threadGeo = new THREE.TorusGeometry(shankRadius, 0.2, 8, 24);
          const threadMesh = new THREE.Mesh(threadGeo, metalMaterial);
          threadMesh.rotation.x = Math.PI / 2;
          threadMesh.position.y = -i * params.pitch;
          group.add(threadMesh);
        }
      }

      // Constraint Line (축 정렬 가이드라인)
      const axisGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, headHeight + 5, 0),
        new THREE.Vector3(0, -shankLength - 5, 0),
      ]);
      const axisLine = new THREE.Line(axisGeo, axisMaterial);
      group.add(axisLine);

      // Constraint Mate Point (메이트 평면 및 포인트)
      const matePointGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const matePointMesh = new THREE.Mesh(matePointGeo, pointMaterial);
      matePointMesh.position.set(0, 0, 0); // Head-shank transition point
      group.add(matePointMesh);
    } else if (params.category === "Nut") {
      const sizeNum = parseFloat(params.size.replace("M", ""));
      const outerRadius = sizeNum * 0.9;
      const nutHeight = sizeNum * 0.8;

      // Extrude hex shape with hole
      const hexShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * outerRadius;
        const y = Math.sin(angle) * outerRadius;
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
      }

      // Hole inside
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, sizeNum / 2, 0, Math.PI * 2, true);
      hexShape.holes.push(holePath);

      const extrudeSettings = {
        depth: nutHeight,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.2,
        bevelThickness: 0.2,
      };

      const nutGeo = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
      const nutMesh = new THREE.Mesh(nutGeo, metalMaterial);
      nutMesh.rotation.x = Math.PI / 2;
      nutMesh.position.y = -nutHeight / 2;
      group.add(nutMesh);

      // Constraint Axis
      const axisGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, nutHeight, 0),
        new THREE.Vector3(0, -nutHeight, 0),
      ]);
      const axisLine = new THREE.Line(axisGeo, axisMaterial);
      group.add(axisLine);
    } else if (params.category === "Rivet") {
      const shankRadius = parseFloat(params.size.replace("M", "")) / 2;
      const shankLength = params.length;
      const headRadius = shankRadius * 1.8;

      // Dome Head
      const headGeo = new THREE.SphereGeometry(headRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const headMesh = new THREE.Mesh(headGeo, metalMaterial);
      headMesh.rotation.x = Math.PI;
      group.add(headMesh);

      // Rivet Shank
      const shankGeo = new THREE.CylinderGeometry(shankRadius, shankRadius, shankLength, 32);
      const shankMesh = new THREE.Mesh(shankGeo, metalMaterial);
      shankMesh.position.y = -shankLength / 2;
      group.add(shankMesh);

      // Constraint Point
      const matePointGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const matePointMesh = new THREE.Mesh(matePointGeo, pointMaterial);
      matePointMesh.position.set(0, 0, 0);
      group.add(matePointMesh);
    } else if (params.category === "Bearing") {
      const sizeNum = parseFloat(params.size.replace("M", ""));
      const innerR = sizeNum / 2;
      const outerR = sizeNum * 1.8;
      const bWidth = sizeNum * 0.7;

      // Outer Ring
      const outerRingShape = new THREE.Shape();
      outerRingShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
      const outerHole = new THREE.Path();
      outerHole.absarc(0, 0, outerR - 1.5, 0, Math.PI * 2, true);
      outerRingShape.holes.push(outerHole);

      const outerRingGeo = new THREE.ExtrudeGeometry(outerRingShape, { depth: bWidth, bevelEnabled: false });
      const outerRingMesh = new THREE.Mesh(outerRingGeo, metalMaterial);
      outerRingMesh.position.z = -bWidth / 2;
      group.add(outerRingMesh);

      // Inner Ring
      const innerRingShape = new THREE.Shape();
      innerRingShape.absarc(0, 0, innerR + 1.5, 0, Math.PI * 2, false);
      const innerHole = new THREE.Path();
      innerHole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
      innerRingShape.holes.push(innerHole);

      const innerRingGeo = new THREE.ExtrudeGeometry(innerRingShape, { depth: bWidth, bevelEnabled: false });
      const innerRingMesh = new THREE.Mesh(innerRingGeo, metalMaterial);
      innerRingMesh.position.z = -bWidth / 2;
      group.add(innerRingMesh);

      // Bearing Balls (Spheres)
      const ballRadius = (outerR - 1.5 - (innerR + 1.5)) / 2;
      const midRadius = innerR + 1.5 + ballRadius;
      const ballCount = 8;
      const brassMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // gold/brass for cage & balls contrast
        metalness: 0.9,
        roughness: 0.1,
      });

      for (let i = 0; i < ballCount; i++) {
        const angle = (i * Math.PI * 2) / ballCount;
        const ballGeo = new THREE.SphereGeometry(ballRadius * 0.9, 16, 16);
        const ballMesh = new THREE.Mesh(ballGeo, brassMaterial);
        ballMesh.position.set(Math.cos(angle) * midRadius, Math.sin(angle) * midRadius, 0);
        group.add(ballMesh);
      }

      // Alignment Guide Center Line
      const axisGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -bWidth),
        new THREE.Vector3(0, 0, bWidth),
      ]);
      const axisLine = new THREE.Line(axisGeo, axisMaterial);
      group.add(axisLine);
    }
  }, [params]);

  // 부품 생성 처리
  const handleGenerate = () => {
    const newPart = {
      id: Date.now().toString(),
      partNumber,
      category: params.category,
      specs: `${params.size} x ${params.length}mm (Pitch: ${params.pitch})`,
      material: params.material,
      timestamp: new Date().toLocaleTimeString(),
    };
    setCreatedParts((prev) => [newPart, ...prev]);
  };

  return (
    <div id="standard-part-generator" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Parameters Input & Library UI */}
      <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-500" />
              규격 및 설계 변수 설정
            </h3>
            <span className="bg-orange-500/10 text-orange-400 text-xs px-2.5 py-1 rounded-full border border-orange-500/20 font-medium">
              pycatia v2.4 API
            </span>
          </div>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                부품 카테고리
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["Bolt", "Nut", "Rivet", "Bearing"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setParams((p) => ({ ...p, category: cat }))}
                    className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                      params.category === cat
                        ? "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20"
                        : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {cat === "Bolt" ? "볼트" : cat === "Nut" ? "너트" : cat === "Rivet" ? "리벳" : "베어링"}
                  </button>
                ))}
              </div>
            </div>

            {/* M-Size */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                사내 표준 규격 (Size)
              </label>
              <select
                value={params.size}
                onChange={(e) => setParams((p) => ({ ...p, size: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {["M3", "M4", "M5", "M6", "M8", "M10", "M12"].map((size) => (
                  <option key={size} value={size}>
                    {size} ({size === "M8" ? "M8 항공 표준 고온 고강도" : size})
                  </option>
                ))}
              </select>
            </div>

            {/* Length & Pitch Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  길이 (Length, mm)
                </label>
                <input
                  type="number"
                  value={params.length}
                  min={5}
                  max={200}
                  step={5}
                  onChange={(e) => setParams((p) => ({ ...p, length: parseInt(e.target.value) || 10 }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  나사산 피치 (Pitch, mm)
                </label>
                <input
                  type="number"
                  value={params.pitch}
                  min={0.5}
                  max={3.0}
                  step={0.25}
                  onChange={(e) => setParams((p) => ({ ...p, pitch: parseFloat(e.target.value) || 1.0 }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={params.category === "Nut" || params.category === "Bearing"}
                />
              </div>
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                재질 (Material / Aerospace-grade)
              </label>
              <select
                value={params.material}
                onChange={(e) => setParams((p) => ({ ...p, material: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Ti-6Al-4V (Titanium Alloy)">Ti-6Al-4V (Titanium Alloy) - 초경량/고강도</option>
                <option value="Inconel 718 (Superalloy)">Inconel 718 (Superalloy) - 가스터빈 고온부</option>
                <option value="Stainless Steel 316">Stainless Steel 316 - 내식강 표준</option>
              </select>
            </div>

            {/* Standard Auto-Naming Result */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 mt-2">
              <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest block mb-1">
                사내 표준 파트 넘버링 자동 적용
              </span>
              <div className="text-lg font-mono text-orange-400 font-bold tracking-wider">
                {partNumber}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={handleGenerate}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/10"
          >
            <Play className="w-4 h-4 fill-white" />
            CATIA 3D 표준 모델 생성 실행
          </button>
          <p className="text-[10px] text-zinc-500 text-center">
            실행 시 pycatia COM 인터페이스를 통하여 CAD 도큐먼트에 표준 부품이 자동 삽입됩니다.
          </p>
        </div>
      </div>

      {/* 3D Render Canvas & Assembly Constraint Guide */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Realtime 3D Previewer */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[350px] relative">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 bg-zinc-950/80 backdrop-blur border border-zinc-800 p-2.5 rounded-lg">
            <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              CAD 3D Real-time Preview
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              {params.category} [{params.size} x {params.length}mm]
            </div>
            <div className="text-[10px] text-sky-400 font-mono mt-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></div>
              Constraint Axis / Plane Auto-Apply
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button className="p-2 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div ref={containerRef} className="w-full h-full min-h-[300px] flex-1 bg-zinc-950"></div>

          {/* Color Guides Legend */}
          <div className="bg-zinc-950/80 border-t border-zinc-800 p-3 flex gap-4 text-xs font-mono justify-center text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-sky-500 rounded"></span> 조립 구속 축 (Alignment Axis)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> 정합성 메이트 포인트 (Mate Point)
            </span>
          </div>
        </div>

        {/* Dynamic Part Library Log */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              최근 생성된 사내 표준 라이브러리 목록
            </h4>
            <span className="text-[10px] text-zinc-400">Total: {createdParts.length}</span>
          </div>

          {createdParts.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-lg p-6 text-center text-zinc-500 text-xs">
              생성된 표준 부품이 없습니다. 규격 설정 후 생성 실행 버튼을 누르세요.
            </div>
          ) : (
            <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
              {createdParts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-zinc-800 text-[10px] text-orange-400 font-bold px-2 py-1 rounded border border-zinc-700">
                      {item.category}
                    </span>
                    <div>
                      <div className="text-xs font-mono text-white font-semibold">{item.partNumber}</div>
                      <div className="text-[10px] text-zinc-500">
                        {item.specs} | {item.material}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">{item.timestamp}</span>
                    <button className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 rounded transition-all">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
