import os

css_file = r"c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\css\main.css"

css_rules = """
/* ══════════════════════════════════════════
   CHROME MAXIMALISM OVERRIDES
   ══════════════════════════════════════════ */
[data-chrome-accents="true"] {
  --chrome-gradient: linear-gradient(135deg, #404040 0%, #b8b8b8 20%, #ffffff 40%, #707070 60%, #e0e0e0 80%, #ffffff 100%);
  --chrome-hover: linear-gradient(135deg, #606060 0%, #d8d8d8 20%, #ffffff 40%, #909090 60%, #f0f0f0 80%, #ffffff 100%);
  --chrome-border-glow: 0 0 10px rgba(255, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

[data-chrome-accents="true"] .btn-primary,
[data-chrome-accents="true"] .btn-complete,
[data-chrome-accents="true"] #fab,
[data-chrome-accents="true"] .workout-finish-btn {
  background: var(--chrome-gradient) !important;
  background-size: 200% 200% !important;
  color: #000 !important;
  font-weight: 700 !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6), var(--chrome-border-glow) !important;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8) !important;
  animation: chromePan 4s linear infinite !important;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

[data-chrome-accents="true"] .btn-primary:hover,
[data-chrome-accents="true"] .btn-complete:hover,
[data-chrome-accents="true"] #fab:hover,
[data-chrome-accents="true"] .workout-finish-btn:hover {
  background: var(--chrome-hover) !important;
  background-size: 200% 200% !important;
  transform: translateY(-2px) scale(1.02) !important;
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2), var(--chrome-border-glow) !important;
}

[data-chrome-accents="true"] .btn-primary:active,
[data-chrome-accents="true"] .btn-complete:active,
[data-chrome-accents="true"] #fab:active,
[data-chrome-accents="true"] .workout-finish-btn:active {
  transform: translateY(2px) scale(0.96) !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(0, 0, 0, 0.5) !important;
}

[data-chrome-accents="true"] .xp-bar-fill,
[data-chrome-accents="true"] .pi-bar-fill,
[data-chrome-accents="true"] .skill-card-bar-fill,
[data-chrome-accents="true"] .skill-hub-xp-bar-fill,
[data-chrome-accents="true"] .timer-bar-fill {
  background: var(--chrome-gradient) !important;
  background-size: 200% 200% !important;
  animation: chromePan 4s linear infinite !important;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
}

[data-chrome-accents="true"] .nav-active,
[data-chrome-accents="true"] .chip-active,
[data-chrome-accents="true"] .type-tab.active,
[data-chrome-accents="true"] .wo-set-done {
  background: var(--chrome-gradient) !important;
  background-size: 200% 200% !important;
  color: #000 !important;
  border-color: rgba(255, 255, 255, 0.8) !important;
  animation: chromePan 5s linear infinite !important;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  font-weight: 700 !important;
}

[data-chrome-accents="true"] .text-primary {
  background: var(--chrome-gradient) !important;
  background-size: 200% 200% !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  animation: chromePan 6s linear infinite !important;
}

[data-chrome-accents="true"] .border-primary {
  border-color: #c8c8c8 !important;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.1), inset 0 0 5px rgba(255, 255, 255, 0.1) !important;
}

@keyframes chromePan {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

/* ── Upgraded Chrome Metallic Class ── */
.chrome-metallic {
  background: linear-gradient(135deg, #404040 0%, #b8b8b8 20%, #ffffff 40%, #707070 60%, #e0e0e0 80%, #ffffff 100%) !important;
  background-size: 200% 200% !important;
  color: #000 !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(0, 0, 0, 0.3) !important;
  animation: chromePan 4s linear infinite !important;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.chrome-metallic:hover {
  transform: translateY(-2px) scale(1.02) !important;
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 1) !important;
}

.chrome-metallic:active {
  transform: translateY(2px) scale(0.96) !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(0, 0, 0, 0.5) !important;
}

/* Chrome Card Enhancements */
.chrome-card, .section-block, .quest-card, .skill-card {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s, border-color 0.3s !important;
}

.chrome-card:hover, .section-block:hover, .quest-card:hover, .skill-card:hover {
  border-color: rgba(255, 255, 255, 0.3) !important;
}

.chrome-card::before, .section-block::before, .quest-card::before, .skill-card::before {
  content: '';
  position: absolute;
  top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: skewX(-20deg);
  pointer-events: none;
  transition: none;
}

.chrome-card:hover::before, .section-block:hover::before, .quest-card:hover::before, .skill-card:hover::before {
  animation: cardSheen 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes cardSheen {
  0% { left: -100%; opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { left: 200%; opacity: 0; }
}
"""

with open(css_file, "a", encoding="utf-8") as f:
    f.write(css_rules)

print("CSS appended successfully.")
