import jsPDF from "jspdf";

// Check if text contains Indic scripts (Kannada or Devanagari)
export const containsIndicScript = (text: string): boolean => {
  // Kannada: \u0C80-\u0CFF, Devanagari: \u0900-\u097F
  return /[\u0C80-\u0CFF\u0900-\u097F]/.test(text);
};

// Load the Noto Sans Kannada font and convert to base64
const loadFontAsBase64 = async (): Promise<string | null> => {
  try {
    // Import the font file from assets
    const fontUrl = new URL('../assets/fonts/NotoSansKannada.ttf', import.meta.url).href;
    const response = await fetch(fontUrl);
    
    if (!response.ok) {
      console.error("Failed to fetch font file:", response.status);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("Error loading font:", error);
    return null;
  }
};

// Register the Indic font with jsPDF
export const registerIndicFont = async (doc: jsPDF): Promise<boolean> => {
  try {
    const base64Font = await loadFontAsBase64();
    
    if (!base64Font) {
      console.warn("Could not load Indic font - using fallback");
      return false;
    }
    
    // Add font to jsPDF virtual file system
    doc.addFileToVFS("NotoSansKannada.ttf", base64Font);
    doc.addFont("NotoSansKannada.ttf", "NotoSansKannada", "normal");
    
    console.log("Indic font registered successfully");
    return true;
  } catch (error) {
    console.error("Failed to register Indic font:", error);
    return false;
  }
};

// Get font name based on text content and font availability
export const getFontForText = (text: string, indicFontAvailable: boolean = false): string => {
  if (indicFontAvailable && containsIndicScript(text)) {
    return "NotoSansKannada";
  }
  return "helvetica";
};
