// src/screens/superadmin/InviteAdminScreen.tsx
import React from 'react';
import InviteUserScreen from '../admin/InviteDoctorScreen'; // Import the updated component

export default function InviteAdminScreen() {
  return (
    <InviteUserScreen 
      role="admin"
      title="Invite Administrator"
      subtitle="Send an invitation to an administrator to manage your hospital"
      userType="admin"
    />
  );
}