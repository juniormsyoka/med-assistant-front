import { useState, useEffect, useCallback } from "react";
import { getLogs } from "../Services/storage";
import { LogEntry } from "../models/LogEntry";
import { predictMissProbability } from "../utils/analyticsUtils";

export const useAnalytics = (navigation: any) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, taken: 0, missed: 0, snoozed: 0, skipped: 0, late: 0, rescheduled: 0, adherence: 0 });
  const [insight, setInsight] = useState<string>("");
  const [missRisk, setMissRisk] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now()); // Add this line

  const loadLogs = useCallback(async () => {
    const logEntries = await getLogs(50);
    setLogs(logEntries);

    // stats aggregation
    const taken = logEntries.filter(l => l.status === "taken").length;
    const missed = logEntries.filter(l => l.status === "missed").length;
    const snoozed = logEntries.filter(l => l.status === "snoozed").length;
    const skipped = logEntries.filter(l => l.status === "skipped").length;
    const late = logEntries.filter(l => l.status === "late").length;
    const rescheduled = logEntries.filter(l => l.status === "rescheduled").length;

    const total = logEntries.length;
    const adherenceScore = taken + late * 0.5;
    const adherence = total > 0 ? Math.round((adherenceScore / total) * 100) : 0;

    const updatedStats = { total, taken, missed, snoozed, skipped, late, rescheduled, adherence };
    setStats(updatedStats);

    if (logEntries.length > 0) {
      setMissRisk(Math.round(predictMissProbability(logEntries[0]) * 100));
    }

    // fetch insights from backend
    try {
      const response = await fetch("https://med-assistant-backend.onrender.com/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats: updatedStats, logs: logEntries }),
      });
      const data = await response.json();
      setInsight(data.insight || "No insights generated yet.");
    } catch {
      setInsight("AI insights unavailable at the moment.");
    }

    setLastUpdate(Date.now()); // Update timestamp after loading
  }, []);

  const refresh = useCallback(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadLogs();
    const unsubscribe = navigation.addListener("focus", loadLogs);
    return unsubscribe;
  }, [navigation, loadLogs]);

  return { 
    logs, 
    stats, 
    insight, 
    missRisk, 
    reload: loadLogs,
    refresh,
    lastUpdate // Add this to the return object
  };
};