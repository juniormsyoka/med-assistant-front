// Updated useAnalytics.ts
import { useState, useEffect, useCallback, useContext } from "react";
import { getLogs } from "../Services/storage";
import { LogEntry } from "../models/LogEntry";
import { predictMissProbability } from "../utils/analyticsUtils";
import { AnalyticsContext } from "../contexts/AnalyticsContext";
import { ComplianceTracker } from "../Services/ComplianceTracker";

export const useAnalytics = (navigation: any) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ 
    total: 0, 
    taken: 0, 
    missed: 0, 
    snoozed: 0, 
    skipped: 0, 
    late: 0, 
    rescheduled: 0, 
    adherence: 0 
  });
  const [insight, setInsight] = useState<string>("");
  const [patterns, setPatterns] = useState<string[]>([]);
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [missRisk, setMissRisk] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Get refresh trigger from context
  const { lastUpdate: contextLastUpdate } = useContext(AnalyticsContext);

  // Fallback function for basic insights
  const fetchBasicInsights = useCallback(async (stats: any, logs: any[]) => {
    try {
      const response = await fetch("https://med-assistant-backend.onrender.com/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, logs }),
      });
      const data = await response.json();
      setInsight(data.insight || "No insights available.");
      setPatterns([]);
      setRiskFactors([]);
    } catch {
      setInsight("AI insights unavailable at the moment.");
    }
  }, []);

  const loadLogs = useCallback(async () => {
    console.log('📊 Loading analytics data...');
    setLoading(true);
    
    try {
      const logEntries = await getLogs(50);
      setLogs(logEntries);

      // Calculate basic stats
      const taken = logEntries.filter(l => l.status === "taken").length;
      const missed = logEntries.filter(l => l.status === "missed").length;
      const snoozed = logEntries.filter(l => l.status === "snoozed").length;
      const skipped = logEntries.filter(l => l.status === "skipped").length;
      const late = logEntries.filter(l => l.status === "late").length;
      const rescheduled = logEntries.filter(l => l.status === "rescheduled").length;

      const total = logEntries.length;
      const adherenceScore = taken + late * 0.5;
      const adherence = total > 0 ? Math.round((adherenceScore / total) * 100) : 0;

      const updatedStats = { 
        total, taken, missed, snoozed, skipped, late, rescheduled, adherence 
      };
      setStats(updatedStats);

      if (logEntries.length > 0) {
        setMissRisk(Math.round(predictMissProbability(logEntries[0]) * 100));
      }

      // NEW: Get compliance records for enhanced insights
      const complianceRecords = await ComplianceTracker.getComplianceRecords();
      
      // Only try enhanced insights if we have compliance data
      if (complianceRecords.length > 0) {
        try {
          console.log(`📊 Sending ${complianceRecords.length} compliance records for analysis`);
          
          const response = await fetch("https://med-assistant-backend.onrender.com/api/enhanced-insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              compliance_records: complianceRecords.slice(-100), // Last 100 records
              stats: updatedStats,
              user_profile: {
                name: "User", // Replace with actual user name if available
                experience: complianceRecords.length > 50 ? "experienced" : "new"
              }
            }),
          });
          
          const data = await response.json();
          
          if (data.success) {
            setInsight(data.insight || "No insights generated.");
            setPatterns(data.patterns || []);
            setRiskFactors(data.risk_factors || []);
            console.log('✅ Enhanced insights loaded:', {
              patterns: data.patterns?.length || 0,
              riskFactors: data.risk_factors?.length || 0
            });
          } else {
            // Fallback to basic insights
            console.log('⚠️ Enhanced insights failed, falling back to basic');
            await fetchBasicInsights(updatedStats, logEntries);
          }
        } catch (error) {
          console.error('Enhanced insights failed:', error);
          // Fallback to basic insights
          await fetchBasicInsights(updatedStats, logEntries);
        }
      } else {
        // No compliance data, use basic insights
        console.log('⚠️ No compliance data available, using basic insights');
        await fetchBasicInsights(updatedStats, logEntries);
      }

      console.log('✅ Analytics data loaded:', { 
        total, 
        adherence,
        complianceRecords: complianceRecords.length 
      });
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      setInsight("Error loading analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fetchBasicInsights]);

  // Watch for context updates
  useEffect(() => {
    console.log('🔄 Context update detected, refreshing analytics...');
    loadLogs();
  }, [contextLastUpdate, loadLogs]);

  // Original focus listener
  useEffect(() => {
    loadLogs();
    const unsubscribe = navigation.addListener("focus", loadLogs);
    return unsubscribe;
  }, [navigation, loadLogs]);

 // Updated return in useAnalytics.ts
// Make sure this is exactly what's at the end of your useAnalytics.ts:
return { 
  logs, 
  stats, 
  insights: {  // This is what EnhancedInsightsSection expects
    narrative: insight,
    patterns: patterns,
    risk_factors: riskFactors,
    data_quality: {
      has_enough_data: logs.length >= 10,
      recommendations: logs.length >= 10 ? 
        "Based on sufficient historical data" : 
        "More data needed for personalized insights"
    },
    generated_at: new Date().toISOString(),
    confidence: logs.length >= 20 ? "high" : "medium"
  },
  missRisk, 
  loading,
  reload: loadLogs,
  refresh: loadLogs,
  lastUpdate: contextLastUpdate
};
};