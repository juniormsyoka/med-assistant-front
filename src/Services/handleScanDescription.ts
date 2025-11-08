import * as ImagePicker from "expo-image-picker";

const API_BASE_URL = "https://med-assistant-backend.onrender.com";

export const handleScanDescription = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return { success: false, error: "Camera permission denied" };
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: false,
      quality: 0.6,
    });

    if (result.canceled) {
      return { success: false, error: "User cancelled scan" };
    }

    const formData = new FormData();
    formData.append("file", {
      uri: result.assets[0].uri,
      type: "image/jpeg",
      name: "prescription.jpg",
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/scan`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return { success: false, error: "Backend error scanning image" };
    }

    const data = await response.json();
    return { success: true, text: data.text };
  } catch (err: any) {
    console.error("Scan error:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
};
