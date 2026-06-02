import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

interface SimpleRankEntry {
  name: string;
  score: number;
  stage: number;
  date: string;
}

const app = express();
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
        console.log("Supabase client initialized successfully.");
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
      }
    } else {
      console.log("Supabase parameters not fully configured. [Fallback Mode]");
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
    // Vercel serverless functions have standard read-only file systems.
    // Catch errors gracefully here so they don't break execution flow.
    console.warn("Local storage write failed (expected on modern serverless hosts e.g. Vercel):", err.message || err);
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
  let savedToCloud = false;
  let supabaseList: SimpleRankEntry[] | null = null;

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
        savedToCloud = true;
      }

      // Fetch the latest top 10 from Supabase to send back
      const { data, error: selectError } = await supabase
        .from("rankings")
        .select("name, score, stage, date")
        .order("score", { ascending: false })
        .limit(10);

      if (!selectError && data && data.length > 0) {
        supabaseList = data.map((item: any) => ({
          name: String(item.name || "Unknown Pilot"),
          score: Number(item.score || 0),
          stage: Number(item.stage || 1),
          date: String(item.date || new Date().toISOString())
        }));
      }
    } catch (e: any) {
      console.error("Failed to perform Supabase operations:", e.message || e);
    }
  }

  // Respond with the most up-to-date dataset (Prefer database records if successful)
  const resultList = supabaseList || sortedLocal.slice(0, 10);
  res.json({ success: true, rankings: resultList });
});

export default app;
