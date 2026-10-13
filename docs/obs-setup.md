# OBS Studio Setup Guide

## Overview

The Log Out League Auction overlay is designed to be used as a **Browser Source** in OBS Studio. It displays real-time auction information (current player, bids, sold/unsold status) with a transparent background, allowing it to be composited over your broadcast.

## Generating the Overlay URL

1. Sign in to the auction dashboard
2. Navigate to your auction → Settings
3. Under "Overlay Credentials", generate a new credential
4. **Copy the overlay URL immediately** — the raw token is shown only once
5. The URL format is: `https://your-domain.com/overlay/UNIQUE_TOKEN`

## Adding to OBS

### Step 1: Open OBS Studio

Launch OBS Studio and select or create the scene you want to use for the auction broadcast.

### Step 2: Add a Browser Source

1. In the **Sources** panel, click the **+** button
2. Select **Browser**
3. Name it **"Auction Overlay"**
4. Click **OK**

### Step 3: Configure the Browser Source

| Setting | Value |
|---------|-------|
| **URL** | Your overlay URL (e.g., `https://your-app.vercel.app/overlay/abc123...`) |
| **Width** | `1920` |
| **Height** | `1080` |
| **FPS** | `30` |
| **CSS** | Leave empty (the overlay handles its own styling) |
| **Shutdown source when not visible** | ☐ Unchecked |
| **Refresh browser when scene becomes active** | ☑ Checked (recommended) |

### Step 4: Position the Overlay

- The overlay panel appears in the **bottom-right** by default
- The rest of the 1920×1080 canvas is **transparent**
- Position and scale the Browser Source as needed
- The overlay should be **above** your desktop capture source

### Step 5: Recommended Scene Layout

```
OBS Scene: "AUCTION LIVE"

Sources (top to bottom):
1. Auction Overlay (Browser Source) — top layer
2. Desktop Capture — showing the auction screen or any content
3. Webcam (optional) — commentator camera
4. Tournament Branding (optional) — background graphics
```

## Overlay States

The overlay automatically displays the correct content based on the auction phase:

| Phase | Display |
|-------|---------|
| **Standby** | Tournament branding, "Waiting to begin..." |
| **Player Introduction** | Player photo, name, role, base price |
| **Live Bidding** | Current bid amount, leading team name & logo |
| **SOLD** | Blue "SOLD!" banner, final price, winning team |
| **UNSOLD** | Red "UNSOLD" banner, player name |
| **Paused** | "BREAK" indicator |
| **Completed** | "AUCTION COMPLETE" message |

## Testing

### Before Going Live

1. **Test bid updates**: Place a test bid and verify the overlay updates within 1-2 seconds
2. **Test SOLD animation**: Sell a test player and verify the sold state appears
3. **Test UNSOLD**: Mark a player unsold and verify
4. **Test reconnection**: Disconnect your internet briefly, then reconnect — the overlay should recover
5. **Test transparency**: The overlay background should be transparent in OBS (not black or white)
6. **Test from separate network**: Open the overlay URL on your phone (different network) to confirm remote access works

### Transparency Verification

If the overlay background appears **black** instead of transparent:
- Make sure you're using **Browser Source**, not **Window Capture** or **Display Capture**
- Check that the OBS Browser Source CSS field is empty
- The overlay HTML body background is set to `transparent`

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Overlay not updating | Check internet connection. The overlay polls every 2 seconds. |
| Black background | Use Browser Source, not Window/Display Capture |
| "Invalid overlay credential" | Regenerate the overlay credential in Settings |
| Stale data indicator (red dot) | The overlay hasn't received updates in >30 seconds. Check connectivity. |
| Overlay shows wrong auction state | Refresh the Browser Source in OBS (right-click → Refresh) |

## Security Notes

- The overlay URL grants **read-only** access to public auction data only
- It cannot modify auction data or access admin functions
- No login is required for the overlay (it uses a credential token)
- Credentials can be revoked from the admin dashboard
- Never share the overlay URL publicly if you don't want others to see bid data

## Network Requirements

- The auctioneer and OBS operator can be on **different networks**
- Both need internet access to the deployed application
- Recommended: stable internet connection with <500ms latency
- The overlay is designed to handle brief disconnections gracefully
