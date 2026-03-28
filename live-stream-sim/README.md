# Sherlock's Life — YouTube Live Simulation

A production-quality YouTube Live stream simulation built with pure HTML, CSS, and vanilla JavaScript. No frameworks, no build tools, no backend. Embeds a local video file disguised as a real-time live stream with dynamic chat, viewer counts, and all the polish of the real thing.

## Features

- **Native `<video>` playback** — H.264 MP4, autoplay muted, looped, no iframes
- **Loading overlay** — 2.5s "Connecting to stream..." with animated spinner
- **LIVE badge** — red pill with CSS pulse-dot animation
- **Viewer count engine** — 3-phase growth (rapid → steady → fluctuation), never below 50
- **Live chat simulation** — colored usernames, MOD/Member badges, join events, superchats
- **Chat burst on spikes** — 3–5 rapid messages during viewer surges
- **DOM cap** — chat capped at 100 nodes, oldest purged automatically
- **Stream duration timer** — counts up from page load
- **Real-time clock** — HH:MM:SS overlay on video
- **Like count** — slowly incrementing
- **Silent auto-unmute** — starts muted (browser policy), unmutes after 3s automatically
- **Responsive** — desktop 70/30 split, mobile stacked layout
- **Zero console errors** — clean on first load
- **Memory safe** — all intervals/timeouts cleaned on unload

## Run Locally

1. Clone or download this repo
2. Place your compressed video as `assets/video.mp4` (H.264, ~300–500MB)
3. Open `index.html` in any modern browser
4. No installs, no servers, no build step needed

> For local file:// playback, Chrome works best. Some browsers may block autoplay on file:// — use a simple local server: `python -m http.server 8000`

## Deploy on Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import → select your repo
3. Deploy — zero config needed for static sites

**Live URL:** [YOUR_VERCEL_URL_HERE]

## Video Setup

Add your compressed video file as:

```
assets/video.mp4
```

Recommended specs:
- Codec: H.264 (best browser compatibility)
- Resolution: 1080p or 720p
- Size: 300–500MB for ~1 hour
- Compress with: `ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k assets/video.mp4`

## File Structure

```
live-stream-sim/
├── index.html      ← Main page
├── style.css       ← YouTube dark theme
├── script.js       ← All simulation logic
├── assets/
│   └── video.mp4   ← Your video (user-provided)
└── README.md
```

## Stack

HTML5 · CSS3 · Vanilla JS · Zero dependencies
