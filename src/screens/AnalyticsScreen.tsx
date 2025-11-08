// screens/AnalyticsScreen.tsx
import React, { useEffect } from "react";
import { View, ScrollView, StyleSheet, Button, Alert, TouchableOpacity, Text } from "react-native";
import { useTheme } from "@react-navigation/native";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import AppHeader from "../components/AppHeader";
import { useAnalytics } from "../hooks/useAnalytics";
import StatsSection from "../components/homescreen/StatsSection";
import AdherenceCard from "../components/analytics/AdherenceCard";
import InsightsSection from "../components/analytics/InsightsSection";
import MissedDosePredictor from "../components/analytics/MissedDosePredictor";
import RecentActivityList from "../components/analytics/RecentActivityList";

const AnalyticsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { logs, stats, insight, missRisk, refresh, lastUpdate } = useAnalytics(navigation);

  // Debug: Log when analytics data updates
  useEffect(() => {
    console.log('📊 AnalyticsScreen: Data updated at', new Date(lastUpdate).toLocaleTimeString());
    console.log('📊 AnalyticsScreen: Logs count:', logs.length);
    console.log('📊 AnalyticsScreen: Adherence:', stats.adherence);
  }, [logs, stats, lastUpdate]);

  /** Helper: Convert Uint8Array to Base64 */
  const convertToBase64 = (bytes: Uint8Array) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

  /** Generate PDF bytes */
  const generatePdfBytes = async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 750]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 50;
    page.drawText("Analysis Report", { x: 50, y, size: 24, font });

    // Overview
    y -= 40;
    page.drawText("Overview", { x: 50, y, size: 18, font });
    y -= 25;
    page.drawText(`Adherence: ${stats?.adherence ?? 0}%`, { x: 60, y, size: 12, font });
    y -= 18;
    page.drawText(`Missed Dose Risk: ${missRisk ?? "N/A"}%`, { x: 60, y, size: 12, font });
    y -= 30;

    // Insights
    page.drawText("Insights", { x: 50, y, size: 18, font });
    y -= 25;
    page.drawText(insight || "No insights available.", { x: 60, y, size: 12, font });
    y -= 30;

    // Recent Logs
    page.drawText("Recent Logs", { x: 50, y, size: 18, font });
    y -= 25;

    if (logs && logs.length > 0) {
      logs.forEach((l: any) => {
        const date = l.createdAt || l.date || l.timestamp;
        const formattedDate = date ? new Date(date).toLocaleDateString() : 'Unknown date';
        const details = l.note || l.event || `${l.medicationName} - ${l.status}` || "No details";
        const logLine = `${formattedDate}: ${details}`;
        
        page.drawText(`- ${logLine}`, { x: 60, y, size: 12, font });
        y -= 16;
        if (y < 50) {
          y = height - 50;
          pdfDoc.addPage([600, 750]);
        }
      });
    } else {
      page.drawText("- No logs available.", { x: 60, y, size: 12, font });
    }

    return await pdfDoc.save();
  };

  /** Share PDF */
  const handlePdfShare = async () => {
    try {
      const pdfBytes = await generatePdfBytes();
      const base64String = convertToBase64(pdfBytes);
      const tempPath = `${FileSystem.cacheDirectory}Analysis_report.pdf`;
      await FileSystem.writeAsStringAsync(tempPath, base64String, { encoding: "base64" });
      await Sharing.shareAsync(tempPath, { mimeType: "application/pdf", dialogTitle: "Share Analysis Report" });
    } catch (error) {
      console.error("Error sharing PDF:", error);
      Alert.alert("Error", "Failed to share PDF.");
    }
  };

  /** Share JSON */
  const handleJsonShare = async () => {
    try {
      const exportData = { 
        date: new Date().toISOString(), 
        stats, 
        insight, 
        missRisk, 
        logs,
        lastUpdate: new Date(lastUpdate).toISOString()
      };
      const tempPath = `${FileSystem.cacheDirectory}analysis_data.json`;
      await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(exportData, null, 2));
      await Sharing.shareAsync(tempPath, { mimeType: "application/json", dialogTitle: "Share Analysis Data" });
    } catch (error) {
      console.error("Error sharing JSON:", error);
      Alert.alert("Error", "Failed to share JSON.");
    }
  };

  /** Manual refresh for debugging */
  const handleManualRefresh = () => {
    console.log('🔄 AnalyticsScreen: Manual refresh requested');
    refresh();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Debug Refresh Button - You can remove this after testing 
        <TouchableOpacity 
          style={[styles.debugButton, { backgroundColor: colors.primary }]} 
          onPress={handleManualRefresh}
        >
          <Text style={styles.debugButtonText}>Refresh Analytics Data</Text>
        </TouchableOpacity>  */}

        <StatsSection stats={stats} />
        <AdherenceCard adherence={stats.adherence} colors={colors} />
        <InsightsSection insight={insight} colors={colors} />
        <MissedDosePredictor missRisk={missRisk} logs={logs} colors={colors} />
        <RecentActivityList logs={logs} colors={colors} />

        <View style={styles.exportContainer}>
          <Button title="Share PDF" color={colors.primary} onPress={handlePdfShare} />
          <View style={{ height: 16 }} />
          <Button title="Share JSON" color={colors.primary} onPress={handleJsonShare} />
        </View>

        {/* Last updated timestamp for debugging */}
        <View style={styles.debugInfo}>
          <Text style={[styles.debugText, { color: colors.text }]}>
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </Text>
          <Text style={[styles.debugText, { color: colors.text }]}>
            Logs count: {logs.length}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30 },
  content: { flex: 1, padding: 16 },
  exportContainer: { marginTop: 30, marginBottom: 40 },
  debugButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  debugButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
  },
});

export default AnalyticsScreen;