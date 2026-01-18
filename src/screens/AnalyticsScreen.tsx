// Updated AnalyticsScreen.tsx - SIMPLIFIED VERSION
import React, { useState } from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useTheme } from "@react-navigation/native";

import AppHeader from "../components/AppHeader";
import EnhancedInsightsSection from "../components/analytics/EnhancedInsightsSection"; // This is actually EnhancedInsightsSection
import AdherenceCard from "../components/analytics/AdherenceCard";
import MissedDosePredictor from "../components/analytics/MissedDosePredictor";
import RecentActivityList from "../components/analytics/RecentActivityList";
import { useAnalytics } from "../hooks/useAnalytics";

const AnalyticsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { 
    logs, 
    stats, 
    insights,  // Get insights from useAnalytics
    missRisk, 
    loading, 
    refresh,  // This is loadLogs
    lastUpdate 
  } = useAnalytics(navigation);
  
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await refresh(); // Just call refresh from useAnalytics
    setRefreshing(false);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <AppHeader 
          title="Analytics Dashboard"
          subtitle="AI-powered insights"
        />
        
        <View style={styles.insightsContainer}>
          {/* Always use EnhancedInsightsSection with data from useAnalytics */}
          <EnhancedInsightsSection 
            insights={insights}
            loading={loading}
            colors={colors}
            onRefresh={refresh}
          />
          
          <AdherenceCard 
            adherence={stats.adherence} 
            colors={colors} 
          />
          
          {logs.length > 0 && missRisk !== undefined && (
            <MissedDosePredictor 
             // missRisk={missRisk}  // Uncommented this
              logs={logs}
              colors={colors}
            />
          )}
          
          <RecentActivityList 
            logs={logs.slice(0, 10)} 
            colors={colors} 
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30 },
  content: { flex: 1 },
  insightsContainer: { padding: 16 },
});

export default AnalyticsScreen;