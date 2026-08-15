# Vendored: GSAP + ScrollTrigger

Self-hosted (vendored) copies of GSAP core and the ScrollTrigger plugin.
Vendored instead of CDN so the dashboard stays self-contained / offline-safe
and gains no third-party runtime dependency at load time.

| File | Version | Bytes |
|------|---------|-------|
| `gsap.min.js` | 3.15.0 | 72,927 |
| `ScrollTrigger.min.js` | 3.15.0 | 44,575 |

- **Source:** https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/
- **Vendored on:** 2026-06-26
- **Runtime dependencies:** none (GSAP ships zero deps)

## License — free, incl. commercial use

Since GSAP 3.13.0 (2025-04-30), the entire toolset is free under Webflow's
**Standard "No Charge" License**: https://gsap.com/community/standard-license/

> "GSAP is now 100% free for all users, thanks to Webflow's support."

Note: this is a custom no-charge license (NOT OSI/MIT). It is free for this
use; the only prohibited use is building a no-code visual animation builder
that competes with Webflow — irrelevant here. Pin the version (done) to stay
insulated from any future term changes on newer versions.

## Updating

```sh
V=3.15.0   # or newer; check https://github.com/greensock/GSAP/releases
curl -fsSL -o gsap.min.js          "https://cdn.jsdelivr.net/npm/gsap@$V/dist/gsap.min.js"
curl -fsSL -o ScrollTrigger.min.js "https://cdn.jsdelivr.net/npm/gsap@$V/dist/ScrollTrigger.min.js"
```

## Usage (no build step)

```html
<script src="./vendor/gsap/gsap.min.js"></script>
<script src="./vendor/gsap/ScrollTrigger.min.js"></script>
<script>
  gsap.registerPlugin(ScrollTrigger);
  // Always guard motion for accessibility:
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.reveal', { opacity: 0, y: 40, duration: 0.7,
      scrollTrigger: { trigger: '.reveal', start: 'top 80%',
        toggleActions: 'play none none reverse' } });
  });
</script>
```

See `../scrolltrigger-demo.html` for a working, themed demo.
