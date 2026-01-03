import jsPDF from "jspdf";

// Check if text contains Indic scripts (Kannada or Devanagari)
export const containsIndicScript = (text: string): boolean => {
  // Kannada: \u0C80-\u0CFF, Devanagari: \u0900-\u097F
  return /[\u0C80-\u0CFF\u0900-\u097F]/.test(text);
};

// Register the Indic font with jsPDF - returns false since CDN fonts don't work with jsPDF
// jsPDF requires specific TTF format with unicode cmap which Google Fonts CDN doesn't provide
export const registerIndicFont = async (doc: jsPDF): Promise<boolean> => {
  // Font registration disabled - CDN fonts incompatible with jsPDF
  // Return false to trigger English fallback
  console.warn("Indic font not available - using English text fallback for PDF");
  return false;
};

// Get font name - always returns helvetica since Indic fonts aren't available
export const getFontForText = (text: string, indicFontAvailable: boolean = false): string => {
  if (indicFontAvailable && containsIndicScript(text)) {
    return "NotoSansKannada";
  }
  return "helvetica";
};
