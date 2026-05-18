# Review Cards — Recreation Guide

A horizontally scrolling testimonial section with edge-fade masks on desktop that collapses to a responsive grid on tablet/mobile. Each card has a circular avatar, name with optional social links, role text, and an italic quote.

---

## 1. Design Tokens

Define these CSS custom properties on `:root`. Swap the values to match your brand.

```css
:root {
  /* Surfaces */
  --paper: #ffffff;

  /* Ink */
  --ink: oklch(0.18 0.008 165);          /* near-black body text */
  --muted: oklch(0.52 0.006 165);        /* secondary text */

  /* Borders */
  --rule: oklch(0.92 0.005 165);         /* light gray card border */

  /* Accents */
  --accent: oklch(0.56 0.14 150);        /* focus ring color */
  --avatar-fallback: #f56c0a;            /* orange tint for no-photo avatars */

  /* Type — serif display + sans body */
  --ff-display: "Literata", ui-serif, Georgia, "Times New Roman", serif;
  --ff-body: "Hanken Grotesk", ui-sans-serif, system-ui, -apple-system, sans-serif;

  /* Layout */
  --container: 1080px;
  --gutter: clamp(1.25rem, 4vw, 2.5rem);

  /* Radii */
  --radius-md: 14px;

  /* Shadows — two-layer composites for natural depth */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 6px 18px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04);

  /* Easing */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

## 2. HTML Structure

The section sits inside a centered container (max-width `var(--container)`, horizontal padding `var(--gutter)`). The scroll track intentionally breaks out of that container — more on that in the CSS section.

```html
<section class="section reviews-section reveal">
  <h2 class="reviews-heading">What others say</h2>

  <div class="reviews-grid">

    <!-- Repeat one .review-card per testimonial -->
    <div class="review-card">
      <div class="review-card__top">
        <!-- WITH photo -->
        <div
          class="review-card__photo review-card__photo--image"
          role="img"
          aria-label="Jacob"
          style="background-image: url(/photos/jacob.jpg);"
        ></div>
        <!-- WITHOUT photo (shows colored circle) -->
        <!-- <div class="review-card__photo" aria-hidden="true"></div> -->

        <div class="review-card__identity">
          <div class="review-card__name">
            Jacob
            <!-- Optional LinkedIn icon -->
            <a
              class="review-card__social"
              href="https://linkedin.com/in/..."
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Jacob on LinkedIn"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.95v5.66H9.34V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z"/>
              </svg>
            </a>
            <!-- Optional Instagram icon -->
            <a
              class="review-card__social review-card__social--ig"
              href="https://instagram.com/..."
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Jacob on Instagram"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.85 5.85 0 0 0-2.12 1.38A5.85 5.85 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.73 1.48 1.38 2.12.64.65 1.32 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.85 5.85 0 0 0 2.12-1.38 5.85 5.85 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.85 5.85 0 0 0-1.38-2.12A5.85 5.85 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/>
              </svg>
            </a>
          </div>
          <div class="review-card__role">Ecom branding, non-technical founder</div>
        </div>
      </div>
      <p class="review-card__text">"The testimonial quote goes here in italics."</p>
    </div>

    <!-- ... more .review-card elements ... -->
  </div>
</section>
```

---

## 3. CSS — Full Breakdown

### 3a. Section Container

The parent `.section` is a standard centered container:

```css
.section {
  padding: 6rem var(--gutter);
  max-width: var(--container);   /* 1080px */
  margin: 0 auto;
}
```

### 3b. Section Heading

Serif display font, fluid size, tight letter-spacing, centered:

```css
.reviews-heading {
  font-family: var(--ff-display);
  font-size: clamp(1.71rem, 2.85vw, 2.09rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  text-align: center;
  margin-bottom: 3.5rem;
}
```

### 3c. Scroll Track (The Key Layout Trick)

The `.reviews-grid` is a horizontal flex row that **breaks out of the 1080px container** to span the full viewport (up to 1320px). This is achieved with negative viewport-calc margins. Cards fade at the edges via a CSS `mask-image` gradient.

```css
.reviews-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 1.25rem;

  /* Horizontal scroll, allow hover lift to overflow vertically */
  overflow-x: auto;
  overflow-y: visible;

  /* Break out of the 1080px .section container to span wider */
  width: min(100vw, 1320px);
  max-width: min(100vw, 1320px);
  margin-left: calc(50% - min(50vw, 660px));
  margin-right: calc(50% - min(50vw, 660px));

  /* Horizontal padding that matches the fade zone */
  padding: 0.75rem clamp(6vw, 10vw, 12vw) 1.5rem;

  /* Snap scroll — "proximity" so it snaps gently, not rigidly */
  scroll-padding-inline: clamp(6vw, 10vw, 12vw);
  scroll-snap-type: x proximity;

  /* Smooth momentum on iOS */
  -webkit-overflow-scrolling: touch;

  /* Hide scrollbar */
  scrollbar-width: none;

  /* Edge fade — cards dissolve into the background at both sides.
     The gradient stops match the horizontal padding so visible cards
     start exactly where the mask reaches full opacity. */
  mask-image: linear-gradient(
    90deg,
    transparent 0,
    black clamp(6vw, 10vw, 12vw),
    black calc(100% - clamp(6vw, 10vw, 12vw)),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0,
    black clamp(6vw, 10vw, 12vw),
    black calc(100% - clamp(6vw, 10vw, 12vw)),
    transparent 100%
  );
}

.reviews-grid::-webkit-scrollbar {
  display: none;
}
```

**How the breakout works:**

The `.section` parent is 1080px wide and centered. The grid forces itself to `min(100vw, 1320px)` and then pulls itself left/right with `calc(50% - min(50vw, 660px))`. This centers the wider element relative to the viewport while still being a child of the narrower container. The 1320px cap prevents it from getting too wide on ultrawide monitors.

**How the edge fade works:**

`mask-image` with a horizontal linear gradient goes: transparent → black → black → transparent. The transition zones are `clamp(6vw, 10vw, 12vw)` wide, matching the horizontal padding. Cards that are scrolled into these zones fade out smoothly. The visible area in the middle is fully opaque.

### 3d. Card Sizing Inside the Track

Each card is a fixed-but-fluid width, and snaps to the start edge on scroll:

```css
.reviews-grid > .review-card {
  flex: 0 0 clamp(280px, 30vw, 360px);
  scroll-snap-align: start;
}
```

- Minimum width: 280px (small screens)
- Preferred: 30vw (scales with viewport)
- Maximum: 360px (large screens)

### 3e. Card Styling

White card with subtle border, rounded corners, light shadow, and a hover lift:

```css
.review-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);      /* 14px */
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: box-shadow 0.3s var(--ease-out),
              transform 0.3s var(--ease-out);
}

.review-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);          /* subtle lift */
}
```

### 3f. Card Header — Avatar + Identity

Horizontal flex row with a 40px circular avatar:

```css
.review-card__top {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

/* Fallback avatar (no photo) — soft orange-tinted circle */
.review-card__photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: color-mix(in oklch, var(--avatar-fallback) 22%, white);
  flex-shrink: 0;
}

/* Actual photo avatar — applied via inline background-image */
.review-card__photo--image {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.review-card__identity {
  min-width: 0;     /* prevent flex overflow */
}
```

### 3g. Name + Social Icons

Name is semibold body text. Social icons sit inline after the name at 14px, colored muted by default with brand-color hover states:

```css
.review-card__name {
  font-family: var(--ff-body);
  font-size: 0.88rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.review-card__social {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  transition: color 0.2s var(--ease-out);
}

/* LinkedIn hover — brand blue */
.review-card__social:hover,
.review-card__social:focus-visible {
  color: #0a66c2;
}

/* Instagram hover — brand pink */
.review-card__social--ig:hover,
.review-card__social--ig:focus-visible {
  color: #e1306c;
}

/* Focus ring for keyboard navigation */
.review-card__social:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}
```

### 3h. Role + Quote Text

```css
.review-card__role {
  font-family: var(--ff-body);
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.3;
  margin-top: 2px;
}

.review-card__text {
  font-family: var(--ff-body);
  font-size: 0.88rem;
  font-style: italic;
  line-height: 1.65;
  color: var(--muted);
}
```

---

## 4. Responsive Behavior

### Tablet (max-width: 900px)

Switches from horizontal scroll to a 2-column grid. Removes the breakout margins, edge fades, and overflow:

```css
@media (max-width: 900px) {
  .reviews-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    max-width: 720px;
    width: auto;
    margin-left: auto;
    margin-right: auto;
    padding: 0;
    overflow: visible;
    mask-image: none;
    -webkit-mask-image: none;
  }

  .reviews-grid > .review-card {
    flex: initial;
  }
}
```

### Mobile (max-width: 640px)

Single column stack:

```css
@media (max-width: 640px) {
  .reviews-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. Scroll-Reveal Animation

The section fades up into view when it enters the viewport. This requires a `.js` class on `<html>` (added by a script so non-JS users see content immediately) and an IntersectionObserver.

### CSS

```css
.js .reveal {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.7s var(--ease-out),
    transform 0.7s var(--ease-out);
}

.js .reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .js .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

### JavaScript

```js
document.documentElement.classList.add("js");

const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);     // fire once, then stop watching
      }
    }
  },
  { rootMargin: "-8% 0px -8% 0px", threshold: 0.05 },
);

document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
```

The `-8%` root margin means the element needs to clear 8% of the viewport height before it triggers — this prevents the animation from firing when the section is barely peeking in.

---

## 6. Typography Notes

The design uses two Google Fonts:

- **Literata** (serif) — for the section heading. Gives an editorial, premium feel.
- **Hanken Grotesk** (sans-serif) — for everything else (name, role, quote text). Clean and modern.

Load them from Google Fonts or self-host:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Literata:wght@400;500&display=swap" rel="stylesheet">
```

---

## 7. Summary of Visual Characteristics

| Property | Value |
|---|---|
| Card background | White (`#ffffff`) |
| Card border | 1px, very light gray (`oklch(0.92 0.005 165)`) |
| Card radius | 14px |
| Card padding | 1.5rem (24px) |
| Card shadow (rest) | Two-layer, nearly invisible |
| Card shadow (hover) | Two-layer, soft medium elevation |
| Hover lift | translateY(-2px) |
| Avatar | 40x40px circle, cover-fit image or tinted fallback |
| Name | 0.88rem, weight 600 |
| Role | 0.78rem, muted gray |
| Quote | 0.88rem, italic, muted gray, 1.65 line-height |
| Card width | clamp(280px, 30vw, 360px) |
| Gap between cards | 1.25rem (20px) |
| Edge fade zone | clamp(6vw, 10vw, 12vw) on each side |
| Scroll snap | x proximity, snap-align start |
| Heading | Serif, clamp(1.71rem, 2.85vw, 2.09rem), weight 500, -0.02em tracking |
| Easing curve | cubic-bezier(0.22, 1, 0.36, 1) — fast start, gentle settle |
