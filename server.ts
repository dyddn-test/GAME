import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface SimpleRankEntry {
  name: string;
  score: number;
  stage: number;
  date: string;
}

const app = express();
const PORT = 3000;
const RANKINGS_FILE = path.join(process.cwd(), "rankings.json");

app.use(express.json());

// Load ranking helper
function getRankingsList(): SimpleRankEntry[] {
  try {
    if (fs.existsSync(RANKINGS_FILE)) {
      const parsedData = JSON.parse(fs.readFileSync(RANKINGS_FILE, "utf-8"));
      if (Array.isArray(parsedData)) {
        return parsedData;
      }
    }
  } catch (error) {
    console.error("Failed to load rankings, falling back to empty. Error:", error);
  }
  return [
    { name: "Sky Captain", score: 50000, stage: 3, date: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
    { name: "Star Foxy", score: 38500, stage: 3, date: new Date(Date.now() - 3600000 * 24).toISOString() },
    { name: "Sonic Jet", score: 25000, stage: 2, date: new Date(Date.now() - 3600000 * 5).toISOString() },
    { name: "Aero Recruit", score: 10000, stage: 1, date: new Date().toISOString() }
  ];
}

// Save ranking helper
function saveRankingsList(rankings: SimpleRankEntry[]) {
  try {
    fs.writeFileSync(RANKINGS_FILE, JSON.stringify(rankings, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write rankings file:", err);
  }
}

// API Routes
app.get("/api/ranking", (req, res) => {
  const rankings = getRankingsList();
  // Sort descending by score
  const sorted = rankings.sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(sorted);
});

app.post("/api/ranking", (req, res) => {
  const { name, score, stage } = req.body;
  if (!name || score === undefined || stage === undefined) {
    res.status(400).json({ error: "Missing required fields: name, score, stage" });
    return;
  }

  const cleanName = typeof name === "string" ? name.trim().slice(0, 15) : "Unknown Pilot";
  const finalName = cleanName || "Unknown Pilot";
  const numScore = Number(score) || 0;
  const numStage = Number(stage) || 1;

  const rankings = getRankingsList();
  const newEntry: SimpleRankEntry = {
    name: finalName,
    score: numScore,
    stage: numStage,
    date: new Date().toISOString()
  };

  rankings.push(newEntry);
  const sorted = rankings.sort((a, b) => b.score - a.score).slice(0, 30); // keep top 30
  saveRankingsList(sorted);

  res.json({ success: true, rankings: sorted.slice(0, 10) });
});

// Setup dev server vs static assets serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Express custom server listening on port ${PORT}`);
  });
}

start();
