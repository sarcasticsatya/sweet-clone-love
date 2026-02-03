// Utility functions for determining UI language based on subject

export interface SubjectInfo {
  name: string;
  name_kannada: string;
  medium: string;
}

/**
 * Determines if the Study Tools UI should display in Kannada
 * Returns true for:
 * - Kannada subject in any medium (e.g., "KANNADA II LAUNGAUGE" in English Medium)
 * - Non-English/Hindi subjects in Kannada Medium (e.g., ಗಣಿತ, ವಿಜ್ಞಾನ)
 */
export const isKannadaUIRequired = (subjectName: string, medium: string): boolean => {
  const normalizedSubject = subjectName.toLowerCase();
  
  // Kannada subject in any medium
  if (normalizedSubject.includes("kannada") || subjectName.includes("ಕನ್ನಡ")) {
    return true;
  }
  
  // Hindi subject - uses Hindi UI, not Kannada
  if (normalizedSubject.includes("hindi") || subjectName.includes("ಹಿಂದಿ")) {
    return false;
  }
  
  // English subject - uses English UI even in Kannada medium
  if (normalizedSubject.includes("english") || subjectName.includes("ಇಂಗ್ಲೀಷ")) {
    return false;
  }
  
  // Kannada medium (for subjects like ಗಣಿತ, ವಿಜ್ಞಾನ, ಸಮಾಜ ವಿಜ್ಞಾನ)
  if (medium === "Kannada") {
    return true;
  }
  
  return false;
};

// Flashcards UI text translations
export const flashcardsText = {
  en: {
    loading: "Loading flashcards...",
    generating: "Generating flashcards...",
    noCards: "No flashcards available yet",
    generate: "Generate Flashcards",
    cardOf: (current: number, total: number) => `Card ${current} of ${total}`,
    question: "Question",
    answer: "Answer",
    tapToReveal: "Tap to reveal",
    new: "New",
    cached: "(cached)",
  },
  kn: {
    loading: "ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    generating: "ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ...",
    noCards: "ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳು ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ",
    generate: "ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳನ್ನು ರಚಿಸಿ",
    cardOf: (current: number, total: number) => `ಕಾರ್ಡ್ ${current} ರಲ್ಲಿ ${total}`,
    question: "ಪ್ರಶ್ನೆ",
    answer: "ಉತ್ತರ",
    tapToReveal: "ತೋರಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ",
    new: "ಹೊಸ",
    cached: "(ಸಂಗ್ರಹಿತ)",
  }
};

// Quiz UI text translations
export const quizText = {
  en: {
    generatingQuiz: "Generating Quiz",
    creatingQuestions: "Creating questions...",
    testKnowledge: "Test your knowledge with a quiz",
    startNewQuiz: "Start New Quiz",
    bestScore: "Best Score",
    recentAttempts: "Recent Attempts",
    progress: "Progress",
    submit: "Submit",
    previous: "Previous",
    next: "Next",
    solutions: "Solutions",
    newQuiz: "New Quiz",
    correct: "correct",
    excellent: "🎉 Excellent!",
    goodEffort: "👍 Good effort!",
    keepPracticing: "📚 Keep practicing!",
    score: "Score",
    back: "Back",
  },
  kn: {
    generatingQuiz: "ಕ್ವಿಜ್ ರಚಿಸಲಾಗುತ್ತಿದೆ",
    creatingQuestions: "ಪ್ರಶ್ನೆಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ...",
    testKnowledge: "ಕ್ವಿಜ್ ಮೂಲಕ ನಿಮ್ಮ ಜ್ಞಾನವನ್ನು ಪರೀಕ್ಷಿಸಿ",
    startNewQuiz: "ಹೊಸ ಕ್ವಿಜ್ ಪ್ರಾರಂಭಿಸಿ",
    bestScore: "ಅತ್ಯುತ್ತಮ ಅಂಕ",
    recentAttempts: "ಇತ್ತೀಚಿನ ಪ್ರಯತ್ನಗಳು",
    progress: "ಪ್ರಗತಿ",
    submit: "ಸಲ್ಲಿಸಿ",
    previous: "ಹಿಂದಿನ",
    next: "ಮುಂದಿನ",
    solutions: "ಪರಿಹಾರಗಳು",
    newQuiz: "ಹೊಸ ಕ್ವಿಜ್",
    correct: "ಸರಿ",
    excellent: "🎉 ಅದ್ಭುತ!",
    goodEffort: "👍 ಉತ್ತಮ ಪ್ರಯತ್ನ!",
    keepPracticing: "📚 ಅಭ್ಯಾಸ ಮುಂದುವರಿಸಿ!",
    score: "ಅಂಕ",
    back: "ಹಿಂದೆ",
  }
};

// Mindmap UI text translations
export const mindmapText = {
  en: {
    title: "Mind Map",
    subtitle: "Chapter concept map",
    generating: "Generating Mind Map...",
    generatingEn: "Generating Mind Map",
    create: "Generate Mind Map",
    createMindmap: "Create a concept map of the chapter",
  },
  kn: {
    title: "ಮೈಂಡ್ ಮ್ಯಾಪ್",
    subtitle: "ಅಧ್ಯಾಯದ ಮೈಂಡ್ ಮ್ಯಾಪ್",
    generating: "ಮೈಂಡ್ ಮ್ಯಾಪ್ ರಚಿಸಲಾಗುತ್ತಿದೆ...",
    generatingEn: "Generating Mind Map",
    create: "ಮೈಂಡ್ ಮ್ಯಾಪ್ ರಚಿಸಿ",
    createMindmap: "ಅಧ್ಯಾಯದ ಪರಿಕಲ್ಪನಾ ನಕ್ಷೆಯನ್ನು ರಚಿಸಿ",
  }
};

// Infographic UI text translations
export const infographicText = {
  en: {
    title: "Infographic",
    subtitle: "Visual summary of the chapter",
    generating: "Extracting key points...",
    create: "Generate Infographic",
    createDesc: "Create visual summary of the chapter",
    keyPoints: "Key Points:",
    page: (current: number, total: number) => `Page ${current} / ${total}`,
    generatingImages: (ready: number, total: number) => `Generating images... (${ready}/${total})`,
    generatingImage: "Generating image...",
    imagesReady: "Images ready!",
    complete: "Infographic complete!",
    keyPointsReady: "Key points ready!",
  },
  kn: {
    title: "ಇನ್ಫೋಗ್ರಾಫಿಕ್",
    subtitle: "ಅಧ್ಯಾಯದ ದೃಶ್ಯ ಸಾರಾಂಶ",
    generating: "ಪ್ರಮುಖ ಅಂಶಗಳನ್ನು ಹೊರತೆಗೆಯಲಾಗುತ್ತಿದೆ...",
    create: "ಇನ್ಫೋಗ್ರಾಫಿಕ್ ರಚಿಸಿ",
    createDesc: "ಅಧ್ಯಾಯದ ದೃಶ್ಯ ಸಾರಾಂಶವನ್ನು ರಚಿಸಿ",
    keyPoints: "ಪ್ರಮುಖ ಅಂಶಗಳು:",
    page: (current: number, total: number) => `ಪುಟ ${current} / ${total}`,
    generatingImages: (ready: number, total: number) => `ಚಿತ್ರಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ... (${ready}/${total})`,
    generatingImage: "ಚಿತ್ರ ರಚಿಸಲಾಗುತ್ತಿದೆ / Generating image...",
    imagesReady: "ಚಿತ್ರಗಳು ಸಿದ್ಧವಾಗಿವೆ! / Images ready!",
    complete: "ಇನ್ಫೋಗ್ರಾಫಿಕ್ ಸಂಪೂರ್ಣ! / Infographic complete!",
    keyPointsReady: "ಪ್ರಮುಖ ಅಂಶಗಳು ಸಿದ್ಧ! / Key points ready!",
  }
};
