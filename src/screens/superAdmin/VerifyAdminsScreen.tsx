// src/screens/superadmin/VerifyAdminsScreen.tsx
import React from 'react';
import VerifyUsersScreen from '../admin/VerifyDoctorScreen'; // Import the updated component    

export default function VerifyAdminsScreen() {
  return (
    <VerifyUsersScreen 
      role="admin"
      title="Verify Administrators"
      subtitle="administrators awaiting verification"
      emptyTitle="No Pending Admin Verifications"
      emptyMessage="All administrators have been verified. There are no pending verification requests at the moment."
      userType="administrator"
    />
  );
}