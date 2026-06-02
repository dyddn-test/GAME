import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

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

// Lazy-initialized Supabase Client
let supabaseClient: any = null;
let attemptedInitialization = false;

function getSupabase() {
  if (!attemptedInitialization) {
    attemptedInitialization = true;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        supabaseClient = createClient(url, key);
        console.log("Supabase client initialized successfully. [Cloud Mode Active]");
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
      }
    } else {
      console.log("Supabase parameters not fully configured. [Local JSON Fallback Mode Active]");
    }
  }
  return supabaseClient;
}

// Load ranking helper (Local fallback)
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

// Save ranking helper (Local backup)
function saveRankingsList(rankings: SimpleRankEntry[]) {
  try {
    fs.writeFileSync(RANKINGS_FILE, JSON.stringify(rankings, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write rankings file:", err);
  }
}

// API Routes
app.get("/api/db-status", (req, res) => {
  const supabase = getSupabase();
  res.json({
    status: supabase ? "active" : "fallback",
    provider: supabase ? "supabase" : "local_file"
  });
});

app.get("/api/ranking", async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      // Fetch rankings from Supabase
      const { data, error } = await supabase
        .from("rankings")
        .select("name, score, stage, date")
        .order("score", { ascending: false })
        .limit(10);

      if (error) {
        console.warn("Supabase select error, using local fallback list:", error.message);
      } else if (data && data.length > 0) {
        const mappedData: SimpleRankEntry[] = data.map((item: any) => ({
          name: String(item.name || "Unknown Pilot"),
          score: Number(item.score || 0),
          stage: Number(item.stage || 1),
          date: String(item.date || new Date().toISOString())
        }));
        res.json(mappedData);
        return;
      }
    } catch (e: any) {
      console.error("Supabase API request failed, using local backup list:", e.message || e);
    }
  }

  // Fallback to local rankings list
  const rankings = getRankingsList();
  const sorted = rankings.sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(sorted);
});

app.post("/api/ranking", async (req, res) => {
  const { name, score, stage } = req.body;
  if (!name || score === undefined || stage === undefined) {
    res.status(400).json({ error: "Missing required fields: name, score, stage" });
    return;
  }

  const cleanName = typeof name === "string" ? name.trim().slice(0, 15) : "Unknown Pilot";
  const finalName = cleanName || "Unknown Pilot";
  const numScore = Number(score) || 0;
  const numStage = Number(stage) || 1;
  const isoDate = new Date().toISOString();

  // Save to local file rankings list as a robust fallback/cache
  const localRankings = getRankingsList();
  const newEntry: SimpleRankEntry = {
    name: finalName,
    score: numScore,
    stage: numStage,
    date: isoDate
  };
  localRankings.push(newEntry);
  const sortedLocal = localRankings.sort((a, b) => b.score - a.score).slice(0, 30); // Keep top 30 cache
  saveRankingsList(sortedLocal);

  // Attempt to save to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("rankings")
        .insert([
          {
            name: finalName,
            score: numScore,
            stage: numStage,
            date: isoDate
          }
        ]);

      if (error) {
        console.error("Failed to insert record into Supabase:", error.message || error);
      } else {
        console.log("Ranking saved in Supabase cloud database.");
      }
    } catch (e: any) {
      console.error("Failed to perform Supabase insertion:", e.message || e);
    }
  }

  res.json({ success: true, rankings: sortedLocal.slice(0, 10) });
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
