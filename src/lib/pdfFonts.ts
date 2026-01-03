import jsPDF from "jspdf";

// Noto Sans Kannada font URL from Google Fonts CDN
const NOTO_SANS_KANNADA_URL = "https://fonts.gstatic.com/s/notosanskannada/v27/8vIs7xs32H97qzQKnzfeXycxXZyUmySvZWJ9DfD9.ttf";

let fontLoaded = false;
let fontBase64: string | null = null;

// Check if text contains Indic scripts (Kannada or Devanagari)
export const containsIndicScript = (text: string): boolean => {
  // Kannada: \u0C80-\u0CFF, Devanagari: \u0900-\u097F
  return /[\u0C80-\u0CFF\u0900-\u097F]/.test(text);
};

// Load and cache the Noto Sans Kannada font
export const loadIndicFont = async (): Promise<string | null> => {
  if (fontBase64) return fontBase64;
  
  try {
    const response = await fetch(NOTO_SANS_KANNADA_URL);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    fontBase64 = base64;
    return base64;
  } catch (error) {
    console.error("Failed to load Indic font:", error);
    return null;
  }
};

// Register the Noto Sans Kannada font with jsPDF
export const registerIndicFont = async (doc: jsPDF): Promise<boolean> => {
  try {
    const base64Font = await loadIndicFont();
    if (!base64Font) return false;
    
    doc.addFileToVFS("NotoSansKannada-Regular.ttf", base64Font);
    doc.addFont("NotoSansKannada-Regular.ttf", "NotoSansKannada", "normal");
    fontLoaded = true;
    return true;
  } catch (error) {
    console.error("Failed to register Indic font:", error);
    return false;
  }
};

// Helper to safely add text with proper font based on content
export const addTextWithFont = (
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  options?: { align?: "left" | "center" | "right" }
) => {
  if (containsIndicScript(text)) {
    doc.setFont("NotoSansKannada", "normal");
  } else {
    doc.setFont("helvetica", "normal");
  }
  doc.text(text, x, y, options);
};

// Get font name based on text content
export const getFontForText = (text: string): string => {
  return containsIndicScript(text) ? "NotoSansKannada" : "helvetica";
};
