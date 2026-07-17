import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

// Initialize Google Gen AI lazily and safely
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return ai;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoints
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { type, payload } = req.body;
      const client = getGeminiClient();

      if (!client) {
        return res.status(503).json({
          error: "Gemini API key is missing. Please add GEMINI_API_KEY to your secrets / env.",
        });
      }

      let prompt = "";
      if (type === "bom-mismatch") {
        prompt = `
          You are an expert aerospace manufacturing engineer at Hanwha Aerospace.
          Analyze the following BOM mismatch between 3D CATIA Assembly and 2D Drawings, and suggest concrete troubleshooting steps based on standard aerospace engineering workflows.
          
          Mismatch Details:
          ${JSON.stringify(payload, null, 2)}
          
          Provide a highly professional and structured analysis (in Korean) including:
          1. 원인 분석 (Potential Causes)
          2. 정합성 해결 절차 (Resolution Steps)
          3. ERP BOM 업로드 시 유의사항 (ERP BOM Tips)
        `;
      } else if (type === "drawing-annotations") {
        prompt = `
          You are a Senior Aerospace Drawing Inspector at Hanwha Aerospace.
          Audit the following drawing annotation list against aerospace standards (such as ASME Y14.5 or Hanwha Standard Quality Directives).
          
          Annotation / Notes in drawing:
          ${JSON.stringify(payload, null, 2)}
          
          Check for:
          1. 필수 기입 사항 누락 (Material, Weight, Treatment, Standards, General Notes, etc.)
          2. 한글/영어 오탈자 및 부적절한 단어 사용
          3. 규격 일치성 (예: 열처리 주기, 표면 처리 등 표준 명칭)
          
          Provide a clear, detailed inspection report (in Korean) detailing what is missing, spelling issues, and actionable correction suggestions.
        `;
      } else {
        prompt = `
          You are a virtual assistant for Hanwha Aerospace Aero-Design Intelligence Suite (ADIS).
          Provide general engineering advice for: ${payload}
        `;
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ result: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Serve static / Vite app
  if (!isProd) {
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
    console.log(`[ADIS Server] Running on http://localhost:${PORT} (Production: ${isProd})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start ADIS server:", err);
});
