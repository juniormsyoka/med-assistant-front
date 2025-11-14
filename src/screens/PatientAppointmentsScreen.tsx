// In PatientAppointmentsScreen.tsx - Update the component
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SectionList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/Services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { dataService } from '../Services/dataService';

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes: string;
  doctor_name?: string;
  type: 'personal' | 'medical';
  source: 'local' | 'supabase';
  title?: string;
    created_by?: 'patient' | 'doctor'; // Add this field
  doctor_id?: string; // Add doctor_id for tracking
}

interface AppointmentSection {
  title: string;
  data: Appointment[];
}

export default function PatientAppointmentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    loadAppointments();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadAppointments();
    });

    return unsubscribe;
  }, [user?.id]);

  const loadAppointments = async () => {
    if (!user?.id) return;

    try {
      // Load appointments from both sources
      const [localAppointments, supabaseAppointments] = await Promise.all([
        loadLocalAppointments(),
        loadSupabaseAppointments()
      ]);

      const allAppointments = [
        ...localAppointments,
        ...supabaseAppointments
      ].sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

      setAppointments(allAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadLocalAppointments = async (): Promise<Appointment[]> => {
    try {
      const localAppts = await dataService.getAppointments();
      return localAppts.map(apt => ({
        id: apt.id?.toString() || `local-${Date.now()}`,
        appointment_date: `${apt.date}T${apt.time}:00`,
        status: apt.isCompleted ? 'completed' : 'scheduled',
        notes: `Title: ${apt.title}
Type: ${apt.type}
Location: ${apt.location || 'Not specified'}
Doctor: ${apt.doctorName || 'Not specified'}
Additional Notes: ${apt.notes || 'None'}`,
        title: apt.title,
        type: 'personal' as const,
        source: 'local' as const
      }));
    } catch (error) {
      console.error('Error loading local appointments:', error);
      return [];
    }
  };

  // In PatientAppointmentsScreen.tsx - Update loadSupabaseAppointments
const loadSupabaseAppointments = async (): Promise<Appointment[]> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user?.id)
      .order('appointment_date', { ascending: true });

    if (error) throw error;

    return data?.map(apt => {
      // Extract creation info from notes or metadata
      const notes = apt.notes || '';
      const createdBy = notes.includes('CreatedBy:') 
        ? notes.split('CreatedBy:')[1]?.split('\n')[0]?.trim() as 'patient' | 'doctor'
        : 'patient'; // Default to patient for backward compatibility
      
      const isDoctorCreated = createdBy === 'doctor';
      
      return {
        id: apt.id,
        appointment_date: apt.appointment_date,
        status: apt.status,
        notes: notes,
        title: notes.split('Title:')[1]?.split('\n')[0]?.trim() || 'Appointment',
        doctor_name: notes.includes('Doctor:') 
          ? notes.split('Doctor:')[1]?.split('\n')[0]?.trim()
          : 'Not specified',
        type: 'medical' as const,
        source: 'supabase' as const,
        created_by: createdBy,
        doctor_id: apt.doctor_id,
        is_doctor_created: isDoctorCreated // Helper field
      };
    }) || [];
  } catch (error) {
    console.error('Error loading Supabase appointments:', error);
    return [];
  }
};

  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      fullDate: date
    };
  };

  const getAppointmentTitle = (appointment: Appointment) => {
    return appointment.title || appointment.notes.split('Title:')[1]?.split('\n')[0]?.trim() || 'Appointment';
  };

  const getTypeIcon = (type: 'personal' | 'medical') => {
    return type === 'medical' ? 'medical' : 'calendar-outline';
  };

  const getTypeColor = (type: 'personal' | 'medical') => {
    return type === 'medical' ? '#4361EE' : '#666';
  };

  // Filter and categorize appointments
  const getFilteredAppointments = () => {
    const now = new Date();
    
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.appointment_date);
      
      if (filter === 'upcoming') {
        return appointmentDate >= now && apt.status !== 'completed';
      } else if (filter === 'past') {
        return appointmentDate < now || apt.status === 'completed';
      }
      return true; // 'all' filter
    });
  };

  // Group appointments by date for section list
  const getAppointmentSections = (): AppointmentSection[] => {
    const filteredAppointments = getFilteredAppointments();
    
    const grouped = filteredAppointments.reduce((groups, appointment) => {
      const date = new Date(appointment.appointment_date);
      const dateString = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(appointment);
      return groups;
    }, {} as { [key: string]: Appointment[] });

    return Object.entries(grouped)
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
      }))
      .sort((a, b) => new Date(a.data[0].appointment_date).getTime() - new Date(b.data[0].appointment_date).getTime());
  };

  // In PatientAppointmentsScreen.tsx - Update the renderAppointmentItem function
const renderAppointmentItem = ({ item }: { item: Appointment }) => {
  const { date, time, fullDate } = formatAppointmentDate(item.appointment_date);
  const isPast = fullDate < new Date() || item.status === 'completed';
  const isDoctorCreated = item.created_by === 'doctor';
  
  return (
    <TouchableOpacity style={[
      styles.appointmentCard, 
      { 
        backgroundColor: colors.card,
        borderLeftWidth: 4,
        borderLeftColor: getTypeColor(item.type),
        opacity: isPast ? 0.7 : 1
      }
    ]}>
      <View style={styles.appointmentHeader}>
        <View style={styles.titleContainer}>
          <View style={styles.typeIndicator}>
            <Ionicons 
              name={getTypeIcon(item.type)} 
              size={16} 
              color={getTypeColor(item.type)} 
            />
            <Text style={[
              styles.typeText, 
              { color: getTypeColor(item.type) }
            ]}>
              {item.type === 'medical' ? 'Medical' : 'Personal'}
            </Text>
            
            {/* Doctor Created Badge */}
            {item.type === 'medical' && isDoctorCreated && (
              <View style={[styles.creatorBadge, { backgroundColor: '#FF6B6B20' }]}>
                <Ionicons name="medical" size={12} color="#FF6B6B" />
                <Text style={[styles.creatorText, { color: '#FF6B6B' }]}>
                  Doctor Scheduled
                </Text>
              </View>
            )}
            
            {/* Patient Created Badge */}
            {item.type === 'medical' && !isDoctorCreated && (
              <View style={[styles.creatorBadge, { backgroundColor: '#4361EE20' }]}>
                <Ionicons name="person" size={12} color="#4361EE" />
                <Text style={[styles.creatorText, { color: '#4361EE' }]}>
                  You Requested
                </Text>
              </View>
            )}
            
            {isPast && (
              <View style={[styles.statusBadge, { backgroundColor: '#4CAF5020' }]}>
                <Text style={[styles.statusText, { color: '#4CAF50' }]}>
                  Completed
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.appointmentTitle, { color: colors.text }]}>
            {getAppointmentTitle(item)}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: 
            item.status === 'scheduled' ? '#4361EE20' : 
            item.status === 'completed' ? '#4CAF5020' : '#FF6B6B20'
          }
        ]}>
          <Text style={[
            styles.statusText,
            { color: 
              item.status === 'scheduled' ? '#4361EE' : 
              item.status === 'completed' ? '#4CAF50' : '#FF6B6B'
            }
          ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={[styles.detailText, { color: colors.text }]}>{date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={[styles.detailText, { color: colors.text }]}>{time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={[styles.detailText, { color: colors.text }]}>
            {item.type === 'medical' ? `Doctor: ${item.doctor_name}` : 'Personal Reminder'}
          </Text>
        </View>
        
        {/* Enhanced source information */}
        {item.type === 'medical' && (
          <View style={styles.detailRow}>
            <Ionicons 
              name={isDoctorCreated ? "medical" : "person-circle"} 
              size={16} 
              color={isDoctorCreated ? "#FF6B6B" : "#4361EE"} 
            />
            <Text style={[styles.detailText, { color: isDoctorCreated ? "#FF6B6B" : "#4361EE" }]}>
              {isDoctorCreated ? 'Scheduled by your doctor' : 'Requested by you'}
            </Text>
          </View>
        )}
        
        {item.type === 'personal' && (
          <View style={styles.detailRow}>
            <Ionicons name="phone-portrait" size={16} color="#666" />
            <Text style={[styles.detailText, { color: '#666' }]}>
              Personal reminder • Only visible to you
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

  const renderSectionHeader = ({ section }: { section: AppointmentSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.text }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.text }]}>
        {section.data.length} appointment{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const appointmentSections = getAppointmentSections();
  const filteredAppointments = getFilteredAppointments();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Appointments</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AddAppointment')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {appointments.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#4361EE' }]}>
            {appointments.filter(apt => apt.type === 'medical').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Medical</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#666' }]}>
            {appointments.filter(apt => apt.type === 'personal').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Personal</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'past'] as const).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterTab,
              filter === filterType && [styles.activeFilterTab, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[
              styles.filterText,
              filter === filterType && styles.activeFilterText
            ]}>
              {filterType === 'all' ? 'All' : filterType === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Appointments List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text }}>Loading appointments...</Text>
        </View>
      ) : filteredAppointments.length > 0 ? (
        <SectionList
          sections={appointmentSections}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {filter === 'all' 
              ? 'No appointments scheduled' 
              : `No ${filter} appointments`
            }
          </Text>
          <TouchableOpacity 
            style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddAppointment')}
          >
            <Text style={styles.addFirstText}>
              {filter === 'past' ? 'Schedule New Appointment' : 'Create New Appointment'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  activeFilterTab: {
    backgroundColor: '#4361EE',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  appointmentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  appointmentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    opacity: 0.7,
  },
  addFirstButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addFirstText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Add to your styles
creatorBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 8,
  gap: 4,
},
creatorText: {
  fontSize: 10,
  fontWeight: '500',
},
});