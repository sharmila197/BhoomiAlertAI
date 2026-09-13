/**
 * BhoomiAlert AI — Centralized Semantic Color Configuration
 * 
 * Semantic rules:
 * - Delay Risk Categories: High (#DC2626), Medium (#D97706), Low (#059669)
 * - District Distribution: Professional Blue / Indigo / Teal / Slate analytics palette
 */

export const RISK_COLORS = {
  HIGH: '#DC2626',
  MEDIUM: '#D97706',
  LOW: '#059669',
} as const;

export const DISTRICT_PALETTE = [
  '#2563eb', // Vivid Blue
  '#4f46e5', // Royal Indigo
  '#0284c7', // Slate Blue
  '#0d9488', // Deep Teal
  '#1d4ed8', // Dark Blue
  '#4338ca', // Deep Indigo
  '#0891b2', // Cyan Blue
  '#6366f1', // Soft Indigo
  '#0e7490', // Deep Cyan
  '#3b82f6', // Sky Blue
] as const;
