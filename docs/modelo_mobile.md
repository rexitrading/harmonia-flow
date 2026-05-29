<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Session Execution - The Midnight Lodge</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&amp;family=EB+Garamond:wght@400;500;600;700&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "on-tertiary-fixed-variant": "#55442e",
                      "muted-slate": "#2a3452",
                      "tertiary": "#ddc4a7",
                      "on-primary-fixed-variant": "#3f4756",
                      "surface-container": "#1f1f21",
                      "on-secondary": "#23304e",
                      "lodge-surface": "#202844",
                      "tertiary-fixed-dim": "#dbc3a6",
                      "primary": "#c0c8db",
                      "secondary-fixed-dim": "#bac6ec",
                      "deep-lodge": "#1b203b",
                      "primary-fixed-dim": "#bfc7d9",
                      "on-error": "#690005",
                      "surface-container-highest": "#353536",
                      "on-secondary-fixed": "#0d1a38",
                      "inverse-on-surface": "#303031",
                      "compass-blue": "#5b7aa6",
                      "on-primary-container": "#394150",
                      "surface-container-lowest": "#0e0e0f",
                      "on-tertiary-fixed": "#261907",
                      "outline-variant": "#45474c",
                      "surface-container-high": "#2a2a2b",
                      "secondary-fixed": "#dae2ff",
                      "surface-bright": "#39393a",
                      "on-primary": "#29313f",
                      "inverse-surface": "#e4e2e3",
                      "on-primary-fixed": "#141c29",
                      "error-container": "#93000a",
                      "on-surface-variant": "#c5c6cc",
                      "primary-fixed": "#dbe2f6",
                      "outline": "#8f9096",
                      "tertiary-container": "#c0a98d",
                      "on-surface": "#e4e2e3",
                      "on-error-container": "#ffdad6",
                      "background": "#131314",
                      "error": "#ffb4ab",
                      "tertiary-fixed": "#f8dec0",
                      "secondary-container": "#3a4666",
                      "silver-ink": "#f0f1f6",
                      "surface-dim": "#131314",
                      "on-secondary-container": "#a8b4da",
                      "muted-text": "#9ea6b9",
                      "surface-variant": "#353536",
                      "ritual-red": "#d4493b",
                      "secondary": "#bac6ec",
                      "on-background": "#e4e2e3",
                      "on-tertiary": "#3d2e19",
                      "primary-container": "#a5adbf",
                      "border-subtle": "#3a496a",
                      "on-tertiary-container": "#4e3e28",
                      "surface-tint": "#bfc7d9",
                      "surface-container-low": "#1b1b1d",
                      "inverse-primary": "#575f6f",
                      "surface": "#131314",
                      "on-secondary-fixed-variant": "#3a4666"
              },
              "borderRadius": {
                      "DEFAULT": "0.25rem",
                      "lg": "0.5rem",
                      "xl": "0.75rem",
                      "full": "9999px"
              },
              "spacing": {
                      "xs": "4px",
                      "xl": "40px",
                      "md": "16px",
                      "lg": "24px",
                      "sm": "8px"
              },
              "fontFamily": {
                      "headline": [
                              "EB Garamond"
                      ],
                      "display": [
                              "Cormorant Garamond, Georgia, serif"
                      ],
                      "title": [
                              "EB Garamond"
                      ],
                      "body": [
                              "Inter, system-ui, sans-serif"
                      ],
                      "label": [
                              "Inter, system-ui, sans-serif"
                      ]
              },
              "fontSize": {
                      "headline": [
                              "2.25rem",
                              {
                                      "lineHeight": "1.2",
                                      "fontWeight": "500"
                              }
                      ],
                      "display": [
                              "clamp(2rem, 5vw, 4.5rem)",
                              {
                                      "lineHeight": "1.1",
                                      "letterSpacing": "-0.01em",
                                      "fontWeight": "400"
                              }
                      ],
                      "title": [
                              "1.25rem",
                              {
                                      "lineHeight": "1.3",
                                      "fontWeight": "600"
                              }
                      ],
                      "body": [
                              "0.875rem",
                              {
                                      "lineHeight": "1.5",
                                      "letterSpacing": "normal",
                                      "fontWeight": "400"
                              }
                      ],
                      "label": [
                              "0.625rem",
                              {
                                      "lineHeight": "1",
                                      "letterSpacing": "0.3em",
                                      "fontWeight": "500"
                              }
                      ]
              }
      },
          },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .bg-twilight-gradient {
            background: linear-gradient(180deg, rgba(27,32,59,1) 0%, rgba(20,24,44,1) 100%);
        }
        /* Custom scrollbar for webkit */
        ::-webkit-scrollbar {
            width: 4px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: #3a496a;
            border-radius: 4px;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-deep-lodge text-silver-ink font-body h-screen w-screen overflow-hidden flex flex-col bg-twilight-gradient">
<!-- TopAppBar Component (Header) -->
<header class="fixed top-0 w-full h-16 bg-background/40 backdrop-blur-md flex justify-between items-center px-lg z-50">
<div class="flex items-center gap-sm">
<span class="material-symbols-outlined text-compass-blue" data-weight="fill" style="font-variation-settings: 'FILL' 1;">diamond</span>
<span class="font-display text-title text-silver-ink tracking-tight">Midnight Lodge</span>
</div>
<div class="flex items-center gap-sm">
<span class="bg-compass-blue/20 text-compass-blue font-label text-label px-2 py-1 rounded-full uppercase tracking-wider">Active Session</span>
<button class="text-muted-text hover:text-compass-blue transition-colors w-11 h-11 flex items-center justify-center">
<span class="material-symbols-outlined">settings</span>
</button>
</div>
</header>
<!-- Main Content Area (Scrollable below header, above bottom nav) -->
<main class="flex-1 overflow-y-auto pt-20 pb-24 px-md flex flex-col gap-lg">
<!-- Active Moment Hero & Player -->
<section class="flex flex-col items-center justify-center pt-lg pb-md gap-md">
<div class="text-center w-full max-w-sm">
<p class="font-label text-label text-compass-blue uppercase tracking-widest mb-2">Current Moment</p>
<h1 class="font-display text-display text-silver-ink leading-tight mb-xs">Entrance of the Master</h1>
<p class="font-body text-body text-muted-text">Track: Ceremonial Prelude No. 4</p>
</div>
<!-- Progress Bar -->
<div class="w-full max-w-sm mt-md">
<div class="flex justify-between font-label text-label text-muted-text mb-2">
<span>01:24</span>
<span>04:30</span>
</div>
<div class="h-2 w-full bg-lodge-surface rounded-full overflow-hidden border border-border-subtle relative">
<div class="absolute top-0 left-0 h-full bg-compass-blue w-1/3 rounded-full"></div>
</div>
</div>
<!-- Player Controls -->
<div class="flex items-center justify-center gap-lg mt-sm">
<button class="w-12 h-12 flex items-center justify-center rounded-full bg-transparent border border-border-subtle text-silver-ink hover:border-compass-blue transition-colors">
<span class="material-symbols-outlined text-2xl">skip_previous</span>
</button>
<button class="w-16 h-16 flex items-center justify-center rounded-full bg-silver-ink text-deep-lodge shadow-[0_0_15px_rgba(91,122,166,0.5)] active:scale-95 transition-transform">
<span class="material-symbols-outlined text-3xl" data-weight="fill" style="font-variation-settings: 'FILL' 1;">pause</span>
</button>
<button class="w-12 h-12 flex items-center justify-center rounded-full bg-transparent border border-border-subtle text-silver-ink hover:border-compass-blue transition-colors">
<span class="material-symbols-outlined text-2xl">stop</span>
</button>
</div>
<!-- Next Moment CTA -->
<button class="mt-md w-full max-w-sm py-4 rounded-lg bg-silver-ink text-deep-lodge font-title text-title flex items-center justify-center gap-sm active:scale-95 transition-transform">
<span>Next Moment</span>
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</section>
<!-- Ritual Sequence List -->
<section class="flex flex-col gap-sm pb-md">
<h2 class="font-label text-label text-muted-text uppercase tracking-widest pl-sm mb-xs">Sequence</h2>
<!-- Completed Item -->
<div class="bg-lodge-surface border border-border-subtle rounded-lg p-md flex items-center gap-md opacity-60">
<div class="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border-subtle">
<span class="material-symbols-outlined text-compass-blue text-sm">check</span>
</div>
<div class="flex-1">
<h3 class="font-title text-title text-muted-text text-sm">Opening Declaration</h3>
<p class="font-body text-body text-muted-text text-xs">Completed</p>
</div>
</div>
<!-- Active Item -->
<div class="bg-lodge-surface border border-compass-blue rounded-lg p-md flex items-center gap-md relative overflow-hidden">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-compass-blue"></div>
<div class="w-8 h-8 rounded-full bg-compass-blue/20 flex items-center justify-center border border-compass-blue">
<div class="w-2 h-2 bg-compass-blue rounded-full animate-pulse"></div>
</div>
<div class="flex-1 pl-2">
<h3 class="font-title text-title text-silver-ink text-sm">Entrance of the Master</h3>
<p class="font-body text-body text-compass-blue text-xs">Playing • Ceremonial Prelude No. 4</p>
</div>
<button class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent text-muted-text hover:text-silver-ink">
<span class="material-symbols-outlined">more_vert</span>
</button>
</div>
<!-- Upcoming Item -->
<div class="bg-lodge-surface border border-border-subtle rounded-lg p-md flex items-center gap-md hover:border-compass-blue transition-colors">
<div class="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border-subtle text-muted-text font-body text-xs">
                    3
                </div>
<div class="flex-1">
<h3 class="font-title text-title text-silver-ink text-sm">Lighting of the Pillars</h3>
<p class="font-body text-body text-muted-text text-xs">Track: Ambient drone beta</p>
</div>
<button class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent text-muted-text hover:text-silver-ink">
<span class="material-symbols-outlined">play_arrow</span>
</button>
</div>
<!-- Upcoming Item -->
<div class="bg-lodge-surface border border-border-subtle rounded-lg p-md flex items-center gap-md hover:border-compass-blue transition-colors">
<div class="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border-subtle text-muted-text font-body text-xs">
                    4
                </div>
<div class="flex-1">
<h3 class="font-title text-title text-silver-ink text-sm">The Reading</h3>
<p class="font-body text-body text-muted-text text-xs">Track: Silence</p>
</div>
<button class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent text-muted-text hover:text-silver-ink">
<span class="material-symbols-outlined">play_arrow</span>
</button>
</div>
</section>
<!-- Emergency Stop (Floating above bottom nav area) -->
<div class="mt-auto pt-md flex justify-center">
<button class="w-full max-w-sm py-3 rounded-lg bg-transparent border border-ritual-red text-ritual-red font-label text-label uppercase tracking-widest flex items-center justify-center gap-sm hover:bg-ritual-red/10 transition-colors">
<span class="material-symbols-outlined text-sm">warning</span>
                Emergency Stop
            </button>
</div>
</main>
<!-- BottomNavBar Component -->
<nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-sm py-xs bg-deep-lodge/95 backdrop-blur-lg border-t border-border-subtle rounded-t-xl">
<button class="flex flex-col items-center justify-center text-muted-text p-2 hover:text-compass-blue active:scale-95 transition-transform">
<span class="material-symbols-outlined">home</span>
<span class="font-label text-label mt-1">Home</span>
</button>
<button class="flex flex-col items-center justify-center text-silver-ink bg-secondary-container rounded-xl p-2 active:scale-95 transition-transform">
<span class="material-symbols-outlined">reorder</span>
<span class="font-label text-label mt-1">Sessions</span>
</button>
<button class="flex flex-col items-center justify-center text-muted-text p-2 hover:text-compass-blue active:scale-95 transition-transform">
<span class="material-symbols-outlined">subscriptions</span>
<span class="font-label text-label mt-1">Library</span>
</button>
<button class="flex flex-col items-center justify-center text-muted-text p-2 hover:text-compass-blue active:scale-95 transition-transform">
<span class="material-symbols-outlined">settings</span>
<span class="font-label text-label mt-1">Settings</span>
</button>
</nav>
</body></html>