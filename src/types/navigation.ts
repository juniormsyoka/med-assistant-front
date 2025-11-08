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
