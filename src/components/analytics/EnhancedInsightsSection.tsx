// components/analytics/EnhancedInsightsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EnhancedInsightsSectionProps {
  insights: any;
  loading: boolean;
  colors: any;
  onRefresh?: () => void;
}

const EnhancedInsightsSection: React.FC<EnhancedInsightsSectionProps> = ({
  insights,
  loading,
  colors,
  onRefresh
}) => {
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          AI is analyzing your adherence patterns...
        </Text>
      </View>
    );
  }
  
  // Handle case where insights might be empty or null
  if (!insights || (!insights.narrative && !insights.patterns && !insights.risk_factors)) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="analytics" size={20} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              AI-Powered Insights
            </Text>
          </View>
          
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={[styles.narrative, { color: colors.text }]}>
          {insights?.narrative || "Start tracking your medications to get personalized insights and patterns."}
        </Text>
        
        <View style={[styles.qualityIndicator, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
          <Ionicons name="information-circle" size={16} color="#FF9500" />
          <Text style={[styles.qualityText, { color: colors.text }]}>
            Track a few medications to unlock AI-powered insights
          </Text>
        </View>
        
        {insights?.generated_at && (
          <Text style={[styles.timestamp, { color: colors.text }]}>
            Generated: {new Date(insights.generated_at).toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  }
  
  const { 
    narrative = "No insights available", 
    patterns = [], 
    risk_factors = [], 
    predictions = [], 
    data_quality,
    generated_at 
  } = insights;
  
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="analytics" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            AI-Powered Insights
          </Text>
        </View>
        
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Data Quality Indicator */}
      {data_quality && (
        <View style={[styles.qualityIndicator, { 
          backgroundColor: data_quality.has_enough_data ? 
            'rgba(76, 217, 100, 0.1)' : 'rgba(255, 149, 0, 0.1)' 
        }]}>
          <Ionicons 
            name={data_quality.has_enough_data ? "checkmark-circle" : "information-circle"} 
            size={16} 
            color={data_quality.has_enough_data ? "#4CD964" : "#FF9500"} 
          />
          <Text style={[styles.qualityText, { color: colors.text }]}>
            {data_quality.recommendations || 
              (data_quality.has_enough_data ? 
                "Based on sufficient historical data" : 
                "More data needed for personalized insights")}
          </Text>
        </View>
      )}
      
      {/* Main Narrative */}
      <Text style={[styles.narrative, { color: colors.text }]}>
        {narrative}
      </Text>
      
      {/* Detected Patterns */}
      {patterns.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📊 Detected Patterns
          </Text>
          {patterns.slice(0, 3).map((pattern: string, index: number) => (
            <View key={index} style={styles.patternItem}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.patternText, { color: colors.text }]}>
                {pattern}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Risk Factors */}
      {risk_factors.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⚠️ Risk Factors
          </Text>
          {risk_factors.slice(0, 3).map((factor: string, index: number) => (
            <View key={index} style={styles.riskItem}>
              <Ionicons name="warning" size={16} color="#FF3B30" />
              <Text style={[styles.riskText, { color: colors.text }]}>
                {factor}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Predictions - Optional section (if your backend provides predictions) */}
      {predictions && predictions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🔮 Upcoming Predictions
          </Text>
          {predictions.slice(0, 2).map((pred: any, index: number) => (
            <View key={index} style={styles.predictionItem}>
              <Text style={[styles.medName, { color: colors.text }]}>
                {pred.medication_name || pred.medicationName || "Medication"}
              </Text>
              <View style={styles.predictionRow}>
                <Text style={[
                  styles.riskLevel, 
                  { color: (pred.miss_risk_percent || 0) > 50 ? '#FF3B30' : '#4CD964' }
                ]}>
                  {(pred.miss_risk_percent || 0)}% miss risk
                </Text>
                {pred.confidence && (
                  <Text style={[styles.confidence, { color: colors.text }]}>
                    ({pred.confidence}% confidence)
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      
      {/* Generated Info */}
      {generated_at && (
        <Text style={[styles.timestamp, { color: colors.text }]}>
          Generated: {new Date(generated_at).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  qualityText: {
    fontSize: 12,
    flex: 1,
  },
  narrative: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 8,
  },
  patternText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  riskText: {
    fontSize: 13,
    flex: 1,
  },
  predictionItem: {
    marginBottom: 10,
  },
  medName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  confidence: {
    fontSize: 11,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: 'right',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default EnhancedInsightsSection;