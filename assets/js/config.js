/**
 * ================================================================
 *  RESTAURANT TEMPLATE — CONFIGURATION
 *  ================================================================
 *  This is the ONE file you edit to set up a new restaurant.
 *
 *  After editing here, also update the CSS variables in
 *  assets/css/style.css (search for ":root {") to match your
 *  brand colors.
 * ================================================================
 */

/* ── BRAND ──────────────────────────────────────────────────── */
const BRAND = {

  name:        'Restaurant Naam',
  tagline:     'Uw tagline hier',
  description: 'Een korte omschrijving van uw restaurant voor de footer en meta description.',

  /* Logo: leave logo_img empty to use initials text instead */
  logo_initials: 'RN',
  logo_img:      '',   // e.g. 'assets/img/logo.svg'

  /* Contact */
  phone:     '+31 6 00 00 00 00',
  whatsapp:  '31600000000',  // digits only, include country code, no +
  email:     'info@uwrestaurant.nl',

  /* Address */
  address: {
    street:   'Straatnaam 1',
    postal:   '1063 BG',
    city:     'Amsterdam',
    maps_url: '',  // Google Maps URL — used for "Routebeschrijving" link
  },

  /* Opening hours — each row appears in the hours table */
  hours: [
    { days: 'Ma – Do', time: '12:00 – 23:00' },
    { days: 'Vr – Za', time: '12:00 – 00:00' },
    { days: 'Zo',      time: '12:00 – 23:00' },
  ],

  /* Social media */
  social: {
    instagram: '',  // full URL or empty string to hide
    facebook:  '',
  },

  /* Review summary shown in trust bar and stats */
  reviews: {
    score:    '4.8',
    platform: 'Google',
    count:    '500+',
  },

  /* Three trust badges shown in hero bar */
  trust_badges: [
    { icon: '<iconify-icon icon="ph:flame" width="22" height="22" aria-hidden="true" style="color:var(--primary)"></iconify-icon>', label: 'Kenmerk Één' },
    { icon: '<iconify-icon icon="ph:shield-check" width="22" height="22" aria-hidden="true" style="color:#4ade80"></iconify-icon>', label: 'Kenmerk Twee' },
    { icon: '<iconify-icon icon="ph:star-fill" width="22" height="22" aria-hidden="true" style="color:var(--secondary)"></iconify-icon>', label: '4.8 Google (500+)' },
  ],

  /* Order / delivery settings */
  currency:  '€',
  min_order: 15.00,   // minimum cart total to enable checkout
  delivery_radius_km: 5,  // maximum delivery radius; 0 = no limit

  /* Pickup option — set available: false for delivery-only restaurants */
  pickup: {
    available: true,
    note: 'Klaar binnen 20–30 minuten na bevestiging',
  },

  /* Coupon codes — all-caps code: discount as a fraction (0.09 = 9%) */
  coupons: {},   // add entries to enable: e.g. 'KORTING10': 0.10

/* Scheduling — how far ahead (in minutes) the earliest time slot appears.
     Pickup needs prep time; delivery needs prep + travel time.
     slot_interval_min controls the granularity of the time picker (e.g. 15 = 12:00, 12:15 …) */
  scheduling: {
    pickup_prep_min:   15,   // earliest pickup slot = store opens + this
    delivery_prep_min: 25,   // earliest delivery slot = store opens + this
    slot_interval_min: 15,   // slot granularity in minutes
    max_days_ahead:     7,   // how many days in advance a customer can schedule (0 = today only)
  },

  /* Reservations */
  reservations: {
    enabled:           true,
    slot_interval_min: 30,   // reservation time slot granularity in minutes
    min_duration_min:  45,   // last bookable slot = closing time − this value
    max_party_size:    15,   // 1–N shown individually; above this shows "16 of meer"
    max_days_ahead:    30,   // how many days ahead a reservation can be booked
  },

  /* Opening hours — machine-readable schedule used by the time-check.
     days: JS weekday index  0=Sun  1=Mon  2=Tue  3=Wed  4=Thu  5=Fri  6=Sat
     close '00:00' means midnight (end of that calendar day, not start of next).
     Keep in sync with the human-readable hours[] above.              */
  schedule: [
    { days: [1, 2, 3, 4], open: '12:00', close: '23:00' },  // Ma–Do
    { days: [5, 6],       open: '12:00', close: '00:00' },  // Vr–Za  (midnight)
    { days: [0],          open: '12:00', close: '23:00' },  // Zo
  ],
};

/* ── HOMEPAGE CONTENT ────────────────────────────────────────── */
/**
 * This drives the dynamically-generated sections on index.html.
 * Static copy (hero title, about body, etc.) is also in the HTML —
 * search for <!-- EDIT --> comments there for quick text changes.
 */
const CONTENT = {

  hero: {
    /* Background image. Falls back to CSS gradient if file is missing. */
    img:      'assets/img/hero.jpg',
    cta_1:    { label: 'Bestel Nu',      href: 'order.html' },
    cta_2:    { label: 'Ons Verhaal',    href: '#about' },
  },

  about: {
    img:  'assets/img/about.jpg',
    /* Floating stat card overlaid on the photo */
    stat: { number: '2015', label: 'Opgericht' },
    /* Bullet points below the about text */
    features: [
      { icon: '<iconify-icon icon="ph:flame" width="18" height="18" aria-hidden="true" style="color:var(--primary)"></iconify-icon>', label: 'Verse ingrediënten, elke dag' },
      { icon: '<iconify-icon icon="ph:book-open-text" width="18" height="18" aria-hidden="true" style="color:var(--primary)"></iconify-icon>', label: 'Traditionele recepten' },
      { icon: '<iconify-icon icon="ph:heart" width="18" height="18" aria-hidden="true" style="color:var(--primary)"></iconify-icon>', label: 'Vakmanschap in elke hap' },
    ],
  },

  /* Three USP / feature cards below the featured dishes */
  features: [
    { icon: '<iconify-icon icon="ph:flame" width="40" height="40" aria-hidden="true" style="color:var(--primary)"></iconify-icon>', title: 'Kenmerk Één',   body: 'Korte beschrijving van dit onderscheidend punt.' },
    { icon: '<iconify-icon icon="ph:shield-check" width="40" height="40" aria-hidden="true" style="color:#22c55e"></iconify-icon>', title: 'Kenmerk Twee',  body: 'Korte beschrijving van dit onderscheidend punt.' },
    { icon: '<iconify-icon icon="ph:star-fill" width="40" height="40" aria-hidden="true" style="color:var(--secondary)"></iconify-icon>', title: 'Kenmerk Drie', body: 'Korte beschrijving van dit onderscheidend punt.' },
  ],

  /* Testimonial cards — rendered dynamically in index.html */
  testimonials: [
    { name: 'Jan de Vries',     score: 5, text: 'Echt heerlijk eten en snelle bezorging! Zeker een aanrader.', date: '2 weken geleden' },
    { name: 'Fatima Al-Hassan', score: 5, text: 'De beste tent in de buurt. Altijd vers en vriendelijk personeel.', date: '1 maand geleden' },
    { name: 'Peter Bakker',     score: 4, text: 'Uitstekende kwaliteit en goede porties. Wij komen zeker terug!', date: '3 weken geleden' },
  ],
};

/* ── MENU ────────────────────────────────────────────────────── */
/**
 * Each category: { id, label, emoji, items[] }
 *
 * Each item:
 *   id           — unique slug, also used to look up image file
 *   name         — display name
 *   desc         — one-line Dutch description
 *   price        — number (0.00 for free items)
 *   emoji        — shown when no image is present
 *   image        — optional: 'assets/img/item-slug.jpg'
 *   recommended  — optional: true → shows badge + appears in Featured section
 */
const MENU = [
  /* vat_rate: Dutch BTW — 9% food & non-alcoholic drinks, 21% alcoholic drinks */
  {
    id: 'starters', label: 'Starters', emoji: '🥗', icon: 'ph:leaf', vat_rate: 9,
    items: [
      { id: 'starter-1', name: 'Starter Naam',      desc: 'Korte beschrijving van dit gerecht.',            price: 5.50,  emoji: '🥗' },
      { id: 'starter-2', name: 'Tweede Starter',    desc: 'Korte beschrijving van dit gerecht.',            price: 7.00,  emoji: '🌿' },
      { id: 'starter-3', name: 'Derde Starter',     desc: 'Korte beschrijving van dit gerecht.',            price: 6.50,  emoji: '🫘' },
    ],
  },
  {
    id: 'mains', label: 'Hoofdgerechten', emoji: '🔥', icon: 'ph:flame', vat_rate: 9,
    items: [
      { id: 'main-1', name: 'Signature Gerecht',    desc: 'Beschrijving van uw beste gerecht.',             price: 14.50, emoji: '🥩', recommended: true },
      { id: 'main-2', name: 'Tweede Gerecht',       desc: 'Korte beschrijving van dit gerecht.',            price: 12.00, emoji: '🔥' },
      { id: 'main-3', name: 'Derde Gerecht',        desc: 'Korte beschrijving van dit gerecht.',            price: 15.00, emoji: '🍖' },
      { id: 'main-4', name: 'Vegetarische Optie',   desc: 'Korte beschrijving van dit gerecht.',            price: 11.00, emoji: '🫘' },
      { id: 'main-5', name: 'Mix Schotel',          desc: 'Assortiment van onze beste gerechten.',          price: 22.00, emoji: '🌟', recommended: true },
    ],
  },
  {
    id: 'sides', label: 'Bijgerechten', emoji: '🍚', icon: 'ph:bowl-food', vat_rate: 9,
    items: [
      { id: 'side-1', name: 'Bijgerecht Één',       desc: 'Korte beschrijving.',                            price: 3.50,  emoji: '🌾' },
      { id: 'side-2', name: 'Brood',                desc: 'Vers gebakken.',                                 price: 2.00,  emoji: '🫓' },
      { id: 'side-3', name: 'Salade',               desc: 'Kleine portie verse salade.',                    price: 3.00,  emoji: '🥬' },
    ],
  },
  {
    id: 'desserts', label: 'Desserts', emoji: '🍯', icon: 'ph:cake', vat_rate: 9,
    items: [
      { id: 'dessert-1', name: 'Dessert Naam',      desc: 'Korte beschrijving.',                            price: 5.00,  emoji: '🍯' },
      { id: 'dessert-2', name: 'Tweede Dessert',    desc: 'Korte beschrijving.',                            price: 7.50,  emoji: '🧀' },
    ],
  },
  {
    id: 'drinks', label: 'Dranken', emoji: '🥤', icon: 'ph:coffee', vat_rate: 9,  /* change to 21 for alcoholic drinks */
    items: [
      { id: 'drink-1', name: 'Huisdrank',           desc: 'Omschrijving van uw huisdrank.',                 price: 2.50,  emoji: '🥛' },
      { id: 'drink-2', name: 'Thee / Koffie',       desc: 'Vers gezet.',                                    price: 0.00,  emoji: '☕' },
      { id: 'drink-3', name: 'Frisdrank',           desc: 'Cola / Fanta / Spa',                             price: 2.50,  emoji: '🥤' },
      { id: 'drink-4', name: 'Mineraalwater',       desc: 'Spa Rood of Blauw',                              price: 2.00,  emoji: '💧' },
    ],
  },
];
