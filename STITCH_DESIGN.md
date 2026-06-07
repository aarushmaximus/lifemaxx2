This is a premium life RPG tracker called LIFEMAXX. The entire aesthetic is a high end chrome metallic sports car dashboard — think Bugatti interior meets sci-fi HUD. Cold, precise, and expensive looking. Chrome is the single hero element of the entire design language.

COLORS:
Background: #08080c
Surface 1 (cards, panels): #111116
Surface 2 (elevated elements, modals): #1c1c22
Surface 3 (hover states): #252530
Border: rgba(255,255,255,0.07) at 0.5px thickness everywhere
Primary chrome accent gradient: linear-gradient(135deg, #6e6e6e 0%, #c8c8c8 35%, #ffffff 50%, #c0c0c0 65%, #707070 100%)
Subtle highlight: rgba(255,255,255,0.6)
Negative/error color: #ff3b3b
Positive/success color: #a8ff78
All macro skill accent colors remain but desaturated by 40% — muted versions only, never vibrant.

TYPOGRAPHY:
All UI text, headings, labels, buttons, section headers: Geist from Google Fonts (weights 300, 400, 500, 600, 700, 800, 900)
All numbers, XP values, stats, timestamps, monospace elements: IBM Plex Mono from Google Fonts
Section headers style: bold uppercase Geist, letter spacing 0.15em, font size 11px, color rgba(255,255,255,0.4) — engraved metal label feeling
Primary content: Geist white full opacity
Secondary text: rgba(255,255,255,0.5)
Disabled/locked text: rgba(255,255,255,0.15)

SHAPE:
Cards and panels: 10px border radius
Buttons and chips: 6px border radius
Pills and tags: 999px border radius

The chrome effect is a multi-stop gradient: dark silver → light silver → white hotspot → silver → dark silver. This creates the illusion of a physically reflective metal surface catching light. This gradient must appear on: all progress bar fills, all primary buttons, all accent text, all active state indicators, and all interactive element borders on hover.
Progress bars are exactly 3px tall, never thicker. Chrome gradient fill. A very subtle white glow underneath: box-shadow 0 0 6px rgba(255,255,255,0.15). This makes them look like illuminated chrome rails.
Cards never have heavy borders. Only razor thin 0.5px lines at rgba(255,255,255,0.07). On hover a chrome sheen animation sweeps across the card surface — a CSS pseudo-element with a white gradient moving left to right over 400ms. This makes the card feel like light reflecting off metal when you touch it.
Interactive buttons: dark Surface 1 background, 0.5px chrome gradient border, chrome gradient text. On hover: very subtle Surface 2 background lift. On press: scale(0.98) transform. No glows, no neon, no shadows — purely metallic surface interactions.
Icons must be thin line style at 1.5px stroke weight, never filled. They should look engraved into the surface, not floating on top of it.
Spacing is generous throughout. Minimum 16px padding inside all cards. Minimum 24px vertical gap between major sections. Nothing feels cramped. Content breathes like a luxury product interface.
Transitions are exactly 200ms ease. No bounce, no spring, no overshoot, no elastic effects. Everything moves with the smooth precision of a mechanical instrument.
The overall mood: you are looking at a precision instrument built for performance. Not a game, not a productivity app, not a health tracker — a personal command system built from chrome and carbon.

Make sure to make the accents very metallic and chrome coloured also make the app dark and minimalistic besdies the chrome accents, also the general colour accents the one that we can go into settings and change that, make sure theres a toggle called 'turn on coloured accents' thatll let us change the colour of accents like we can do now and not make everything very metalic and chrome.
