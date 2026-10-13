/**
 * Language Detection Utility
 * Detects language from text (English, Telugu, Hindi)
 */

import { SupportedLanguage, LanguageDetectionResult } from '../types';

export class LanguageDetector {
  // Unicode ranges for different scripts
  private static readonly TELUGU_RANGE = /[\u0C00-\u0C7F]/;
  private static readonly DEVANAGARI_RANGE = /[\u0900-\u097F]/; // Hindi uses Devanagari script
  private static readonly LATIN_RANGE = /[A-Za-z]/;

  /**
   * Detect language from text
   */
  static detect(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      return {
        language: SupportedLanguage.ENGLISH,
        confidence: 0.5,
      };
    }

    const cleanText = text.trim();

    // Count characters in each script
    const teluguCount = (cleanText.match(this.TELUGU_RANGE) || []).length;
    const devanagariCount = (
      cleanText.match(this.DEVANAGARI_RANGE) || []
    ).length;
    const latinCount = (cleanText.match(this.LATIN_RANGE) || []).length;

    const totalChars = teluguCount + devanagariCount + latinCount;

    if (totalChars === 0) {
      // No recognizable characters (maybe only numbers/punctuation)
      return {
        language: SupportedLanguage.ENGLISH,
        confidence: 0.3,
      };
    }

    // Calculate percentages
    const teluguPercent = teluguCount / totalChars;
    const devanagariPercent = devanagariCount / totalChars;
    const latinPercent = latinCount / totalChars;

    // Determine language based on highest percentage
    if (teluguPercent > 0.3) {
      return {
        language: SupportedLanguage.TELUGU,
        confidence: Math.min(teluguPercent * 1.2, 1.0),
      };
    }

    if (devanagariPercent > 0.3) {
      return {
        language: SupportedLanguage.HINDI,
        confidence: Math.min(devanagariPercent * 1.2, 1.0),
      };
    }

    if (latinPercent > 0.5) {
      return {
        language: SupportedLanguage.ENGLISH,
        confidence: Math.min(latinPercent * 1.1, 1.0),
      };
    }

    // Mixed script - check for common Hindi/Telugu words in Latin script
    const lowerText = cleanText.toLowerCase();

    // Telugu romanized common words
    const teluguWords = ['meeru', 'nenu', 'ela', 'unnaru', 'cheppu'];
    const hasTeluguWords = teluguWords.some((word) =>
      lowerText.includes(word)
    );

    if (hasTeluguWords) {
      return {
        language: SupportedLanguage.TELUGU,
        confidence: 0.6,
      };
    }

    // Hindi romanized common words
    const hindiWords = ['aap', 'main', 'kaise', 'hain', 'kya'];
    const hasHindiWords = hindiWords.some((word) =>
      lowerText.includes(word)
    );

    if (hasHindiWords) {
      return {
        language: SupportedLanguage.HINDI,
        confidence: 0.6,
      };
    }

    // Default to English with low confidence
    return {
      language: SupportedLanguage.ENGLISH,
      confidence: 0.5,
    };
  }

  /**
   * Get language name in English
   */
  static getLanguageName(language: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      [SupportedLanguage.ENGLISH]: 'English',
      [SupportedLanguage.TELUGU]: 'Telugu',
      [SupportedLanguage.HINDI]: 'Hindi',
    };

    return names[language];
  }

  /**
   * Get language name in native script
   */
  static getNativeLanguageName(language: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      [SupportedLanguage.ENGLISH]: 'English',
      [SupportedLanguage.TELUGU]: 'తెలుగు',
      [SupportedLanguage.HINDI]: 'हिन्दी',
    };

    return names[language];
  }
}
