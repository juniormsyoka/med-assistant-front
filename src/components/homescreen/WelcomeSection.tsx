// components/homescreen/WelcomeSection.tsx
import { View, Text, Image, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '@/contexts/AuthContext'; 
interface Props {
  theme: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
  onProfilePress?: () => void;
}

export const WelcomeSection: React.FC<Props> = ({  
  theme,
  onProfilePress 
    }) => {
    const { user } = useAuth(); 
      const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const userName = user?.full_name || user?.email;
  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              marginBottom: 4,
              color: theme.text,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {userName ? `Welcome, ${userName}! 👋` : "Welcome! 👋"}
          </Text>
          <Text
            style={{
              fontSize: 16,
              opacity: 0.7,
              color: theme.text,
            }}
          >
            Manage your medications easily
          </Text>
        </View>

        <TouchableOpacity 
          onPress={onProfilePress}
          activeOpacity={onProfilePress ? 0.7 : 1}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
           backgroundColor: profilePicture ? 'transparent' : "#F0F4FF",
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: theme.primary,
            overflow: 'hidden',
            marginLeft: 12,
          }}
        >
          {profilePicture ? (
            <Image 
              source={{ uri: profilePicture }} 
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 28,
              }}
              resizeMode="cover"
       
            />
          ) : (
            <Ionicons name="person" size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};