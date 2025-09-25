//const API_BASE_URL = "http://10.18.9.72:5000"; // physical device IP
//const API_BASE_URL = "http://192.168.1.104:5000";
/*const API_BASE_URL = __DEV__
  ? "http://192.168.1.104:5000"   // for local dev on Wi-Fi
  : "https://med-assistant-backend.onrender.com"; // for production
*/

const API_BASE_URL = "https://med-assistant-backend.onrender.com";


export const sendChatMessageStream = async (
  userText: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    console.log("Sending request to server...");
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Accept": "text/plain",
      },
      body: JSON.stringify({ message: userText }),
      signal: controller.signal
    });

    console.log("Response status:", response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Stream completed");
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        console.log("Received chunk:", chunk);
        
        if (chunk.trim()) {
          onChunk(chunk);
        }
      }
    } catch (readError) {
      console.error("Error reading stream:", readError);
      throw readError;
    } finally {
      reader.releaseLock();
    }
  } catch (error: any) {
    console.error("Fetch error:", error);
    if (error.name === 'AbortError') {
      throw new Error("Request timeout - AI is taking too long to respond");
    }
    if (error.message?.includes('Network request failed')) {
      throw new Error("Network error - cannot connect to server");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const sendChatMessageStreamXHR = (
  userText: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_BASE_URL}/api/chat`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  let receivedLength = 0;
  let responseText = '';

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 3) { // Loading state (receiving data)
      const newText = xhr.responseText.substr(receivedLength);
      if (newText) {
        receivedLength = xhr.responseText.length;
        onChunk(newText);
      }
    } else if (xhr.readyState === 4) { // Done
      if (xhr.status === 200) {
        onComplete();
      } else {
        onError(new Error(`Request failed with status ${xhr.status}`));
      }
    }
  };

  xhr.onerror = function() {
    onError(new Error('Network error'));
  };

  xhr.timeout = 45000;
  xhr.ontimeout = function() {
    onError(new Error('Request timeout'));
  };

  xhr.send(JSON.stringify({ message: userText }));
};