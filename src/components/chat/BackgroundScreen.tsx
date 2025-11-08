// BackgroundScreen.tsx
import React from "react";
import { ImageBackground, StyleSheet } from "react-native";

//const bgImage = require("../../assets/background.png"); // ✅ static require
const bgImage = require("../../../assets/cross.png");


export default function BackgroundScreen({ children }: { children: React.ReactNode }) {
  return (
    <ImageBackground
      source={bgImage}
      style={styles.background}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",   // ✅ ensure it fills width
    height: "100%",  // ✅ ensure it fills height
  },
});
