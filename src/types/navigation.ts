// src/types/navigation.ts
export type AdminStackParamList = {
  AdminDashboard: undefined;
  DoctorManagement: undefined;
  PatientAssignments: undefined;
  DoctorInvitations: undefined;        
  VerifyDoctors: undefined;            
  InviteDoctor: undefined;             
  AppointmentManagement: undefined;
  EditDoctor: { doctorId: string };
  AddDoctor: undefined;
};

// src/types/navigation.ts

export type ChatStackParamList = {
  ChatLauncher: undefined; // 👈 your entry point for chat
  ChatRoom: {
    conversationId: string;
    userId: string;
    userRole: 'doctor' | 'patient';
    mode: 'doctor' | 'ai';
  };
  DoctorDashboard: undefined; // 👈 used inside your Chat stack
};


export type AuthStackParamList = {
  PatientAuth: undefined;
  DoctorInviteSignup: {
    invitationToken: string;
    hospitalId: string;
    hospitalName: string;
  };
};


export type DoctorStackParamList = {
  DoctorDashboard: undefined;
  PatientDetail: { patientId: string };
  ChatRoom: {
    mode: 'doctor';
    adapter: string;
    conversationId: string;
    userRole: string;
    userId: string;
    patientId: string;
    patientName: string;
    assignedDoctorId?: string;
  };
  AppointmentSchedule: undefined;
  DoctorChatList: undefined;
  AddAppointment: undefined;

  // ✅ New route for verifying patients
  VerifyPatients: undefined;
};


 export type SuperAdminStackParamList = {
  SuperAdminDashboard: undefined;
  HospitalManagement: undefined;
  VerifyAdmins: undefined;
  AdminManagement: undefined;
  PlatformAnalytics: undefined;
  SystemSettings: undefined;
};
