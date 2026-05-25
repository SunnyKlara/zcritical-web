# PWA Icons

Required icons referenced by `src/app/manifest.ts`:

- `icon-192.png` — 192×192 PNG (any purpose)
- `icon-512.png` — 512×512 PNG (any purpose)
- `icon-maskable-512.png` — 512×512 PNG (maskable, with safe-zone padding)

## Generating from a source image

1. Take a 1024×1024 master image (`logo-master.png`)
2. Use [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or similar:

```bash
npx pwa-asset-generator logo-master.png ./public/icons \
  --background "#0A0A0A" \
  --padding "10%" \
  --opaque false
```

3. For maskable icons, ensure the central 80% is the safe zone (logo only). The outer 10% padding may be cropped by some Android launchers.

## Quick-and-dirty placeholder

Until real icons are produced, the manifest will 404 on these paths. To suppress browser warnings, drop in any 192/512px PNG with the brand color.

## Apple touch icon

Also recommended at the root: `apple-touch-icon.png` (180×180). Next.js auto-detects it from `app/apple-icon.png`.
