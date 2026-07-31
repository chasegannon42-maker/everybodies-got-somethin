/* =============================================================
   EVERYBODIES GOT SOMETHIN — icons.js
   Hand-drawn monochrome icon set + emoji translation layer.
   The ward confiscated the crayons: every pictograph in the UI
   routes through here — HTML gets inked SVG symbols, canvas text
   gets clean typographic glyphs (or nothing). One choke point,
   zero phone-emoji anywhere.
   ============================================================= */
'use strict';

const Icons = (() => {

  /* ---- the symbol set ----
     24×24 boxes, stroke = currentColor, width 2, round caps.
     Coordinates are deliberately a hair off-grid — these are
     marker doodles on an intake form, not a design system. */
  const W = '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  const F = '<g fill="currentColor" stroke="none">';
  const S = {
    clipboard: W + '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M8.5 11h7.2M8.5 15h5.4"/></g>',
    pill: W + '<rect x="4.2" y="8.8" width="15.6" height="6.6" rx="3.3" transform="rotate(-18 12 12)"/><path d="M9.8 14.9 14.2 9.1" transform="rotate(0 12 12)"/></g>',
    mop: W + '<path d="M6.5 3 14 13.5M12 15.5q-1.5 3.5-4 5M14.5 16q.2 3.2-.8 5.2M16.6 15.2q1.8 3 4.4 4.3"/><path d="M11 13.2q3-2 6 .4"/></g>',
    skull: W + '<circle cx="12" cy="10.4" r="6.6"/><path d="M9.3 16.6v3.2M12 17v3.4M14.7 16.6v3.2"/></g>' + F + '<circle cx="9.7" cy="10.2" r="1.6"/><circle cx="14.3" cy="10.2" r="1.6"/><path d="M12 12.6l1.1 2h-2.2z"/></g>',
    moon: W + '<path d="M13.8 3.6a8.6 8.6 0 1 0 6.2 14.6A10.2 10.2 0 0 1 13.8 3.6z"/></g>',
    boxing: W + '<path d="M6.5 12.5V9.2a5.2 5.2 0 0 1 10.4 0v3.3a4.6 4.6 0 0 1-2.4 4l-.4.2H9.3l-.4-.2a4.6 4.6 0 0 1-2.4-4z"/><path d="M9.5 17v3h5v-3M6.6 10.5h4"/></g>',
    phone: W + '<path d="M6.8 3.6l2.9 3.8-1.9 2.4a12.5 12.5 0 0 0 5.4 5.6l2.4-1.9 3.9 2.8q-1.2 3.4-4.8 3C9 18.8 5.1 14.5 4 8.5q-.6-3.4 2.8-4.9z"/></g>',
    paper: W + '<path d="M6.2 3.5h8.3l3.3 3.4v13.6H6.2z"/><path d="M14.2 3.7V7h3.4M9 11.2h6M9 15h4.6"/></g>',
    trophy: W + '<path d="M8.2 4h7.6v5a3.8 3.8 0 0 1-7.6 0z"/><path d="M8.2 5.2H5.4a2.8 2.8 0 0 0 2.9 3M15.8 5.2h2.8a2.8 2.8 0 0 1-2.9 3M12 13v3M8.8 19.6q3.2-1.4 6.4 0z"/></g>',
    door: W + '<rect x="6.6" y="3.6" width="10.8" height="16.8" rx="1"/><path d="M4.5 20.6h15"/></g>' + F + '<circle cx="14.6" cy="12.4" r="1.3"/></g>',
    bolt: W + '<path d="M13.4 3.2 7.2 13.4h4L10.6 20.8 16.8 10.6h-4z"/></g>',
    clock: W + '<circle cx="12" cy="12.4" r="7.6"/><path d="M12 8.2v4.4l3 2M9.5 3.2h5"/></g>',
    walrus: W + '<ellipse cx="12" cy="10.8" rx="8" ry="6.4"/><path d="M9.4 15.6v4.2M14.6 15.6v4.2M6.2 11.8q-1.8.4-2.6 1.6M17.8 11.8q1.8.4 2.6 1.6"/></g>' + F + '<circle cx="9.2" cy="9" r="1.1"/><circle cx="14.8" cy="9" r="1.1"/><circle cx="12" cy="12.6" r="1.4"/></g>',
    checkon: W + '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8 12.4l2.8 3L16.2 9"/></g>',
    checkoff: W + '<rect x="4" y="4" width="16" height="16" rx="3.5"/></g>',
    hospital: W + '<rect x="5" y="5.6" width="14" height="14.8" rx="1.5"/><path d="M12 9v6M9 12h6M9.8 20.4v-2.6h4.4v2.6"/></g>',
    flag: W + '<path d="M6.4 21V3.6"/><path d="M6.4 4.4h10.8l-2.6 3.4 2.6 3.4H6.4"/></g>',
    coffee: W + '<path d="M5.4 8.6h10.8v7.6a3.4 3.4 0 0 1-3.4 3.4H8.8a3.4 3.4 0 0 1-3.4-3.4z"/><path d="M16.2 10h1.4a2.6 2.6 0 0 1 0 5.2h-1.4M8.4 5.8q-.6-1 .4-2M11.6 5.8q-.6-1 .4-2"/></g>',
    flame: W + '<path d="M12 3.4q4.2 4.6 4.2 8.6a4.7 4.7 0 0 1-9.4 0q0-2 1.6-4.6.5 2 2 3.2-.5-3.6 1.6-7.2z"/></g>',
    lock: W + '<rect x="6" y="10.6" width="12" height="9.8" rx="2"/><path d="M8.6 10.4V8a3.4 3.4 0 0 1 6.8 0v2.4"/></g>' + F + '<circle cx="12" cy="15.4" r="1.5"/></g>',
    unlock: W + '<rect x="6" y="10.6" width="12" height="9.8" rx="2"/><path d="M8.6 10.4V8a3.4 3.4 0 0 1 6.6-1.2"/></g>' + F + '<circle cx="12" cy="15.4" r="1.5"/></g>',
    key: W + '<circle cx="8.2" cy="8.4" r="4.2"/><path d="M11.4 11.6 19.6 19.8M16 16.4l2.2-2.2M18.4 18.8l2-2"/></g>',
    sparkle: W + '<path d="M12 4l1.7 6.3L20 12l-6.3 1.7L12 20l-1.7-6.3L4 12l6.3-1.7z"/></g>',
    calendar: W + '<rect x="4.4" y="5.2" width="15.2" height="14.8" rx="2"/><path d="M4.6 9.4h14.8M8.4 3.4v3.4M15.6 3.4v3.4"/></g>' + F + '<circle cx="8.6" cy="13" r="1.1"/><circle cx="12" cy="13" r="1.1"/><circle cx="15.4" cy="13" r="1.1"/><circle cx="8.6" cy="16.6" r="1.1"/><circle cx="12" cy="16.6" r="1.1"/></g>',
    pad: W + '<path d="M7.2 6.8h9.6a4.8 4.8 0 0 1 4.6 6L20.6 16a2.6 2.6 0 0 1-4.4 1.2L14.6 15H9.4l-1.6 2.2A2.6 2.6 0 0 1 3.4 16l-.8-3.2a4.8 4.8 0 0 1 4.6-6z"/><path d="M8 9.6v3.2M6.4 11.2h3.2"/></g>' + F + '<circle cx="15.4" cy="10" r="1.1"/><circle cx="17.6" cy="12" r="1.1"/></g>',
    people: W + '<circle cx="8.6" cy="8.6" r="3.2"/><path d="M3.8 19.6q1.4-5 4.8-5t4.8 5"/><circle cx="16.2" cy="8.2" r="2.7"/><path d="M15.4 13.9q3.6.1 4.8 4.7"/></g>',
    bird: W + '<path d="M5 18.6q7.6.8 10-4.2l4.4-1.6-3-1.4a5 5 0 0 0-9.6 1.8q0 3.6-1.8 5.4z"/><path d="M9.8 21h4.4"/></g>' + F + '<circle cx="12.6" cy="9.4" r="1"/></g>',
    wrench: W + '<path d="M19.8 6.8a5 5 0 0 1-6.6 5.6L8 17.6a2.3 2.3 0 0 1-3.2-3.2l5.2-5.2A5 5 0 0 1 15.6 2.6L13 5.4l3.4 3.4z"/></g>',
    warn: W + '<path d="M12 4 3.8 19h16.4z"/><path d="M12 9.6v4.2"/></g>' + F + '<circle cx="12" cy="16.4" r="1.2"/></g>',
    bingo: W + '<rect x="4.4" y="4.4" width="15.2" height="15.2" rx="2"/><path d="M9.4 4.6v14.8M14.6 4.6v14.8M4.6 9.4h14.8M4.6 14.6h14.8"/></g>' + F + '<circle cx="7" cy="7" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="17" cy="17" r="1"/></g>',
    gift: W + '<rect x="4.6" y="9" width="14.8" height="11" rx="1.5"/><path d="M4.6 13h14.8M12 9.2V20M12 8.8q-4.2.6-4.6-2.2Q7.2 4 9.6 4.4T12 8.8zq4.2.6 4.6-2.2.2-2.6-2.2-2.2T12 8.8z"/></g>',
    flask: W + '<path d="M10 3.6h4M10.8 3.8v4.8L5.6 18.8a1.9 1.9 0 0 0 1.7 2.8h9.4a1.9 1.9 0 0 0 1.7-2.8L13.2 8.6V3.8"/><path d="M8 14.6h8"/></g>' + F + '<circle cx="10.6" cy="17.6" r="1"/><circle cx="13.8" cy="18.8" r=".8"/></g>',
    ambulance: W + '<path d="M3.6 8h10.8v9.4H3.6zM14.4 10.4h3.2l2.6 3v4h-5.8"/><circle cx="7.4" cy="18.4" r="1.8"/><circle cx="16.6" cy="18.4" r="1.8"/><path d="M9 10.6v3.6M7.2 12.4h3.6"/></g>',
    files: W + '<path d="M4.6 8.4h5l1.6 2h8.2v9H4.6z"/><path d="M6.8 8.2V5.4h4.4l1.4 1.8h6.2v2.6"/></g>',
    target: W + '<circle cx="12" cy="12" r="7.8"/><circle cx="12" cy="12" r="4"/></g>' + F + '<circle cx="12" cy="12" r="1.3"/></g>',
    siren: W + '<path d="M7.2 14.2a4.8 4.8 0 0 1 9.6 0v3.2H7.2z"/><path d="M4.8 17.4h14.4M12 3.4v2.2M5.4 6.4l1.6 1.6M18.6 6.4 17 8"/></g>',
    badge: W + '<rect x="7" y="4.6" width="10" height="15" rx="1.6"/><path d="M9.4 15.4h5.2M10 2.6h4"/></g>' + F + '<circle cx="12" cy="9.6" r="2"/></g>',
    note: W + '<rect x="5" y="4" width="14" height="16.4" rx="1.6"/><path d="M8.4 8.6h7.2M8.4 12.2h7.2M8.4 15.8h4.6"/></g>',
    sun: W + '<circle cx="12" cy="12" r="4.4"/><path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.7 5.7l1.6 1.6M16.7 16.7l1.6 1.6M18.3 5.7l-1.6 1.6M7.3 16.7l-1.6 1.6"/></g>',
    snow: W + '<path d="M12 3.6v16.8M4.7 7.8l14.6 8.4M19.3 7.8 4.7 16.2M12 7l2-2M12 7l-2-2M12 17l2 2M12 17l-2 2"/></g>',
    drop: W + '<path d="M12 3.8q5.4 6.4 5.4 10.4a5.4 5.4 0 0 1-10.8 0Q6.6 10.2 12 3.8z"/></g>',
    dice: W + '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="3"/></g>' + F + '<circle cx="8.6" cy="8.6" r="1.3"/><circle cx="15.4" cy="8.6" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="8.6" cy="15.4" r="1.3"/><circle cx="15.4" cy="15.4" r="1.3"/></g>',
    book: W + '<path d="M12 5.6Q8.6 3.2 4 3.8v14.6q4.6-.6 8 1.8 3.4-2.4 8-1.8V3.8q-4.6-.6-8 1.8z"/><path d="M12 5.8v14"/></g>',
    save: W + '<path d="M4.6 4.6h11.8l3 3v11.8H4.6z"/><rect x="8" y="13" width="8" height="6.4"/><path d="M8.6 4.8v3.8h5.4V4.8"/></g>',
    coins: W + '<ellipse cx="12" cy="7.4" rx="6.8" ry="3"/><path d="M5.2 7.6v4.2c0 1.7 3 3 6.8 3s6.8-1.3 6.8-3V7.6M5.2 11.8V16c0 1.7 3 3 6.8 3s6.8-1.3 6.8-3v-4.2"/></g>',
    leaf: W + '<path d="M19.4 4.6Q8 4.6 6 13.2q-.8 3.6 1.6 6Q19.4 18 19.4 4.6z"/><path d="M8 18.8Q12.4 11 17 8"/></g>',
    sprout: W + '<path d="M12 20.6v-7.2"/><path d="M12 13.6Q11.6 8.4 6.4 8q.6 5.4 5.6 5.6zM12 11.2q.4-4.6 5.6-5-.6 5-5.6 5z"/></g>',
    stetho: W + '<path d="M7 3.8v4.6a4.6 4.6 0 0 0 9.2 0V3.8M11.6 13v2.2a4.2 4.2 0 0 0 8.4 0v-1.6"/><circle cx="20" cy="11.4" r="2.1"/></g>',
    brain: W + '<path d="M11.4 4.2a3.3 3.3 0 0 0-3.9 1.3A3.4 3.4 0 0 0 4.9 9a3.5 3.5 0 0 0-.3 5.7 3.6 3.6 0 0 0 2.8 4.6q1.7 2.4 4 1V4.2zM12.6 4.2a3.3 3.3 0 0 1 3.9 1.3A3.4 3.4 0 0 1 19.1 9a3.5 3.5 0 0 1 .3 5.7 3.6 3.6 0 0 1-2.8 4.6q-1.7 2.4-4 1V4.2z"/></g>',
    cabinet: W + '<rect x="5.4" y="3.6" width="13.2" height="16.8" rx="1.4"/><path d="M5.6 9.2h12.8M5.6 14.8h12.8M10.4 6.4h3.2M10.4 12h3.2M10.4 17.6h3.2"/></g>',
    candle: W + '<rect x="9.4" y="10.2" width="5.2" height="9.2"/><path d="M6.6 19.6h10.8M12 7.8q-1.8-2 0-4.2 1.8 2.2 0 4.2z"/></g>',
    exting: W + '<rect x="8.4" y="8" width="7.2" height="12.4" rx="3"/><path d="M10.6 8V6h2.8v2M12 5.8q3.8-1.8 6.4.6M9 3.4l2.6 1"/></g>',
    mic: W + '<rect x="9.4" y="3.4" width="5.2" height="10" rx="2.6"/><path d="M6.4 11.4a5.6 5.6 0 0 0 11.2 0M12 17.2v3.2M9 20.6h6"/></g>',
    radio: W + '<rect x="4" y="8.4" width="16" height="11.6" rx="2"/><path d="M6.4 8.2 16.6 3.6"/><circle cx="15.6" cy="14.2" r="2.6"/><path d="M6.8 12.4h4M6.8 15h4M6.8 17.6h4"/></g>',
    star: W + '<path d="M12 3.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.4l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z"/></g>',
    jar: W + '<path d="M8 6.8h8M7.2 6.8q-1.4 2.2-1.4 4.6v6.2a3 3 0 0 0 3 3h6.4a3 3 0 0 0 3-3v-6.2q0-2.4-1.4-4.6"/><rect x="8.6" y="3.6" width="6.8" height="3.2" rx="1"/><path d="M9.4 14.4h5.2"/></g>',
    gradcap: W + '<path d="M2.8 9.6 12 5.2l9.2 4.4L12 14z"/><path d="M7 11.8v4q5 3 10 0v-4M20 10v5"/></g>',
    ticket: W + '<path d="M4 8.4a2.4 2.4 0 0 0 0 7.2v3h16v-3a2.4 2.4 0 0 1 0-7.2v-3H4z"/><path d="M14.6 6.4v2M14.6 11v2M14.6 15.6v2"/></g>',
    box: W + '<path d="M4.4 8.2 12 4.4l7.6 3.8v8L12 20l-7.6-3.8z"/><path d="M4.6 8.4 12 12l7.4-3.6M12 12v7.8"/></g>',
    chart: W + '<path d="M4.6 4.6v14.8h14.8"/><path d="M8.4 16V11M12.2 16V7.6M16 16v-5.8"/></g>',
    chartdown: W + '<path d="M4.6 4.6v14.8h14.8"/><path d="M7.4 8.4l3.6 3.4 2.4-2 4.8 4.6M18.2 11.6v2.8h-2.8"/></g>',
    folder: W + '<path d="M4.4 6.2h5.4l1.8 2.2h8v10.2a1.4 1.4 0 0 1-1.4 1.4H5.8a1.4 1.4 0 0 1-1.4-1.4z"/></g>',
    gear: W + '<circle cx="12" cy="12" r="4.6"/><path d="M12 4.2v2.4M12 17.4v2.4M4.2 12h2.4M17.4 12h2.4M6.5 6.5l1.7 1.7M15.8 15.8l1.7 1.7M17.5 6.5l-1.7 1.7M8.2 15.8l-1.7 1.7"/></g>',
    speaker: W + '<path d="M4.6 9.6h3.6L13 5.4v13.2l-4.8-4.2H4.6z"/><path d="M15.8 9q2 3 0 6M18.4 7q3.2 5 0 10"/></g>',
    mute: W + '<path d="M4.6 9.6h3.6L13 5.4v13.2l-4.8-4.2H4.6z"/><path d="M16 9.8l4.4 4.4M20.4 9.8 16 14.2"/></g>',
    crown: W + '<path d="M5 18.4V9l3.9 3.4L12 6.2l3.1 6.2L19 9v9.4z"/><path d="M5.4 20.6h13.2"/></g>',
    bell: W + '<path d="M12 4.2a5.8 5.8 0 0 1 5.8 5.8c0 3.6 1 5 2 6H4.2c1-1 2-2.4 2-6A5.8 5.8 0 0 1 12 4.2z"/><path d="M10 19.4a2 2 0 0 0 4 0"/></g>',
    repeat: W + '<path d="M6.4 9.4a6.4 6.4 0 0 1 11.4 1.4M17.6 14.6A6.4 6.4 0 0 1 6.2 13.2"/><path d="M17.8 6.6v4.2h-4.2M6.2 17.4v-4.2h4.2"/></g>',
    joystick: W + '<path d="M12 13.4V7"/><circle cx="12" cy="5.6" r="2.4"/><path d="M5.4 17.4a6.6 3.4 0 0 1 13.2 0v1.8H5.4z"/></g>' + F + '<circle cx="16.4" cy="16" r="1.1"/></g>',
    ladder: W + '<path d="M8 3.4v17.2M16 3.4v17.2M8.2 7h7.6M8.2 11.4h7.6M8.2 15.8h7.6"/></g>',
    dog: W + '<circle cx="8.2" cy="8.8" r="3.6"/><path d="M5.6 6.4 4.4 3.8l3 .8M10.8 6.4l1.2-2.6-3 .8M11.6 10.4q6-1.4 8 2.2 1.2 2.4-.6 4.2M11 12.2q-.6 4.6 1.8 8M17.6 16.8q.6 2.2-.4 3.6M19.6 13.6q1.6 1.2 1 3"/></g>' + F + '<circle cx="7" cy="8.4" r=".9"/><circle cx="9.4" cy="8.4" r=".9"/></g>',
    medcross: W + '<path d="M9.6 3.8h4.8v5.8h5.8v4.8h-5.8v5.8H9.6v-5.8H3.8V9.6h5.8z"/></g>',
    paw: W + '<ellipse cx="12" cy="15.4" rx="4.6" ry="3.8"/></g>' + F + '<ellipse cx="6.6" cy="10.4" rx="1.7" ry="2.2"/><ellipse cx="12" cy="8.4" rx="1.7" ry="2.2"/><ellipse cx="17.4" cy="10.4" rx="1.7" ry="2.2"/></g>',
    tophat: W + '<path d="M8 15V5.4a8.6 8.6 0 0 1 8 0V15"/><path d="M3.6 16.2q8.4 2.8 16.8 0M8.2 11.4h7.6"/></g>',
    megaphone: W + '<path d="M4.2 10.2v4l10.6 4.4V5.8zM14.8 8.2q3-.4 3 3.8t-3 3.8M6.6 14.8l1.2 5h3"/></g>',
    runner: W + '<path d="M10.4 8.6 13.6 7l2.2 3.4 3.4.8M13.4 7.2l-1.2 5 3 2.6-.8 5.4M12.4 12l-3.4 1.2-2.6 4.2M9.6 15.6l-3.8 3.2"/></g>' + F + '<circle cx="15" cy="4.4" r="1.9"/></g>',
    cart: W + '<path d="M4 5h2.4l2 10.4h9.8l2-7.6H7.4"/><circle cx="9.6" cy="19" r="1.7"/><circle cx="16.6" cy="19" r="1.7"/></g>',
    tag: W + '<path d="M4.2 4.2h7l8.6 8.6a1.8 1.8 0 0 1 0 2.6l-4.4 4.4a1.8 1.8 0 0 1-2.6 0L4.2 11.2z"/></g>' + F + '<circle cx="8.6" cy="8.6" r="1.4"/></g>',
    briefcase: W + '<rect x="4" y="8" width="16" height="11.4" rx="2"/><path d="M9 7.8V5.6a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 5.6v2.2M4.4 13h15.2"/></g>',
    ghost: W + '<path d="M5.6 20.4V11a6.4 6.4 0 0 1 12.8 0v9.4l-2.2-1.8-2.1 1.8-2.1-1.8-2.2 1.8-2.1-1.8z"/></g>' + F + '<circle cx="9.6" cy="10.6" r="1.3"/><circle cx="14.4" cy="10.6" r="1.3"/></g>',
    mail: W + '<rect x="3.8" y="5.6" width="16.4" height="12.8" rx="1.8"/><path d="M4.4 6.8 12 13l7.6-6.2"/></g>',
    building: W + '<rect x="6" y="4" width="12" height="16.6"/><path d="M9.6 20.4v-3.6h4.8v3.6"/></g>' + F + '<circle cx="9.4" cy="7.6" r=".9"/><circle cx="14.6" cy="7.6" r=".9"/><circle cx="9.4" cy="12" r=".9"/><circle cx="14.6" cy="12" r=".9"/></g>',
    cat: W + '<circle cx="12" cy="13" r="6.2"/><path d="M7.6 8.6 6.2 4.4l4 1.6M16.4 8.6l1.4-4.2-4 1.6M3.6 12.4l4.2.8M3.8 15.6l4-.4M20.4 12.4l-4.2.8M20.2 15.6l-4-.4"/></g>' + F + '<circle cx="9.8" cy="12" r="1"/><circle cx="14.2" cy="12" r="1"/><path d="M12 14.2l1 1.4h-2z"/></g>',
    snake: W + '<path d="M5 19.6q7.4 2 7.4-2.4T7.6 12q-4-1.4-2.2-5.2Q7 3.4 11.4 3.6q4 .2 4.4 3.2"/><circle cx="17.2" cy="7.6" r="2.6"/><path d="M19.8 8.2q2 .4 2.6-.8M22 9.4l.4-2"/></g>',
    fish: W + '<path d="M4.2 12q4-5.4 9.4-5.4 3.8 0 6.2 5.4-2.4 5.4-6.2 5.4-5.4 0-9.4-5.4z"/><path d="M4.4 12 2.6 8.6M4.4 12l-1.8 3.4M13 6.8q1.4 5.2 0 10.4"/></g>' + F + '<circle cx="16.6" cy="10.6" r="1"/></g>',
    map: W + '<path d="M4 5.8 9.3 4l5.4 1.8L20 4v14.2L14.7 20l-5.4-1.8L4 20z"/><path d="M9.3 4.2v13.8M14.7 6v13.8"/></g>',
    tv: W + '<rect x="4" y="7.4" width="16" height="11.4" rx="2"/><path d="M8.6 3.6 12 7.2l3.4-3.6"/></g>',
    shield: W + '<path d="M12 3.6 19 6.2v6q0 5.6-7 8.2-7-2.6-7-8.2v-6z"/><path d="M12 4v16"/></g>',
    eye: W + '<path d="M3.6 12q3.8-5.8 8.4-5.8T20.4 12q-3.8 5.8-8.4 5.8T3.6 12z"/><circle cx="12" cy="12" r="2.4"/></g>',
    beads: W + '<path d="M12 4.4a7 7 0 0 0-4.6 12.2M12 4.4a7 7 0 0 1 4.6 12.2"/><path d="M12 17.4v3.2M10.4 19h3.2"/></g>' + F + '<circle cx="8.2" cy="15.2" r="1.1"/><circle cx="15.8" cy="15.2" r="1.1"/><circle cx="6.4" cy="11" r="1.1"/><circle cx="17.6" cy="11" r="1.1"/><circle cx="8.6" cy="6.8" r="1.1"/><circle cx="15.4" cy="6.8" r="1.1"/></g>',
    card: W + '<rect x="3.6" y="5.8" width="16.8" height="12.4" rx="2"/><path d="M3.8 9.6h16.4M6.6 14.6h4.6M14.6 14.6h2.6"/></g>',
    music: W + '<path d="M9 17.6V6.2l9-1.8v11.4"/><circle cx="6.8" cy="17.8" r="2.3"/><circle cx="15.8" cy="16" r="2.3"/></g>',
    trash: W + '<path d="M5.2 6.6h13.6M9 6.4V4.6h6v1.8M6.6 6.8l.8 13.6h9.2l.8-13.6M10 10v6.6M14 10v6.6"/></g>',
    syringe: W + '<path d="M6 18 15.4 8.6M13 6.2l4.8 4.8M14.6 4.6l4.8 4.8M17.6 3.4l3 3M6 18l-2.6 2.6M5.4 15.6 8.4 18.6M9.6 12.6l2 2M11.8 10.4l2 2"/></g>',
    keyboard: W + '<rect x="3.6" y="7" width="16.8" height="10.4" rx="1.8"/><path d="M7.4 13.8h9.2"/></g>' + F + '<circle cx="7" cy="10.4" r=".9"/><circle cx="10.4" cy="10.4" r=".9"/><circle cx="13.8" cy="10.4" r=".9"/><circle cx="17.2" cy="10.4" r=".9"/></g>',
    mobile: W + '<rect x="7.4" y="3.4" width="9.2" height="17.2" rx="2.2"/><path d="M10.6 5.8h2.8"/></g>' + F + '<circle cx="12" cy="17.6" r="1.1"/></g>',
    vibrate: W + '<rect x="8.4" y="4.4" width="7.2" height="15.2" rx="1.8"/><path d="M4.6 9q-1 3 0 6M19.4 9q1 3 0 6"/></g>',
    gym: W + '<path d="M8.4 12h7.2"/><rect x="4.2" y="8.2" width="3" height="7.6" rx="1"/><rect x="16.8" y="8.2" width="3" height="7.6" rx="1"/><path d="M2.6 10.4v3.2M21.4 10.4v3.2"/></g>',
    couch: W + '<path d="M5.4 12V8.6a2.6 2.6 0 0 1 2.6-2.6h8a2.6 2.6 0 0 1 2.6 2.6V12"/><path d="M3.4 12.6a2 2 0 0 1 2 2v2h13.2v-2a2 2 0 0 1 4 0q0 3.4-2 4.6H5.4q-2-1.2-2-4.6zM6.6 19.4v1.4M17.4 19.4v1.4"/></g>',
    annex: W + '<path d="M4.4 11 12 4.4 19.6 11v9H4.4z"/><path d="M4.8 19.8 19.2 8.6M9.8 20v-4.6h4.4V20"/></g>',
    toolbox: W + '<rect x="4" y="9.4" width="16" height="10" rx="1.8"/><path d="M9 9.2V7a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 7v2.2M4.4 14h15.2M10.8 12.6v2.8M13.2 12.6v2.8"/></g>',
    wind: W + '<path d="M3.6 8.4h9.8a2.6 2.6 0 1 0-2.4-3.8M3.6 12.6h13.8a2.8 2.8 0 1 1-2.6 4M3.6 16.8h6.4"/></g>',
    ban: W + '<circle cx="12" cy="12" r="8"/><path d="M6.4 6.4 17.6 17.6"/></g>',
    therm: W + '<path d="M10 4.6a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/></g>' + F + '<circle cx="12" cy="17" r="1.8"/><path d="M11.2 9h1.6v6h-1.6z"/></g>',
    watch: W + '<circle cx="12" cy="12" r="5.4"/><path d="M12 9.4V12l1.8 1.4M9 6.8 9.6 3h4.8L15 6.8M9 17.2l.6 3.8h4.8l.6-3.8"/></g>',
    glasses: W + '<circle cx="7.4" cy="13.6" r="3.6"/><circle cx="16.6" cy="13.6" r="3.6"/><path d="M11 13.2q1-.8 2 0M3.8 12.6 2.6 8.4M20.2 12.6l1.2-4.2"/></g>',
    torch: W + '<path d="M8.4 3.6h7.2l-1.6 4.4v12.4h-4V8z"/><path d="M10.2 8h3.6"/></g>' + F + '<circle cx="12" cy="13.4" r="1.1"/></g>',
    battery: W + '<rect x="3.6" y="8" width="15.2" height="8.6" rx="1.8"/><path d="M20.8 10.8v3M6.6 10.8v3M9.8 10.8v3"/></g>',
    heart: W + '<path d="M12 20q-8-5.4-8-10.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.6Q20 14.6 12 20z"/></g>',
    bandage: W + '<rect x="2.8" y="8.4" width="18.4" height="7.2" rx="3.6" transform="rotate(-30 12 12)"/></g>' + F + '<circle cx="10.6" cy="11" r=".8"/><circle cx="13.4" cy="13" r=".8"/><circle cx="10.9" cy="13.4" r=".8"/><circle cx="13.1" cy="10.6" r=".8"/></g>',
    cone: W + '<path d="M9.4 15.8 11 5.4a1 1 0 0 1 2 0l1.6 10.4"/><path d="M4.8 19.6q7.2-2.4 14.4 0M8.8 12.6h6.4"/></g>',
    crane: W + '<path d="M5.4 20.6V5.2L18.6 8l-13-.2M18.6 8v3M18.6 13.8v-1.4M17 12.6h3.2M3.6 20.6h4"/></g>',
    suit: W + '<circle cx="12" cy="5.8" r="2.4"/><path d="M6.2 20.4q.8-8.4 5.8-8.4t5.8 8.4zM12 12.2l-1.4 2.4 1.4 3.4 1.4-3.4z"/></g>',
    fist: W + '<path d="M7 12.4V7.6q0-1.4 1.4-1.4T9.8 7.6M9.8 10V5.6q0-1.4 1.4-1.4t1.4 1.4M12.6 9.8V5.8q0-1.4 1.4-1.4t1.4 1.4v4.4M15.4 10.4V7q1.8-.6 2.6 1v6.4q0 5.2-5 5.2-4.6 0-5.6-3.8L6 11.6q-.4-1.8 1-2.2z"/></g>',
    walker: W + '<path d="M11.8 8.8v5l3 2.4v4M11.8 12l-2.8 2.2-.8 4.8M11.9 8.9l3.3 1.3 2.2 2.4M11.8 9l-3 1.4-1.6 2.6"/></g>' + F + '<circle cx="12" cy="5" r="1.9"/></g>',
    receipt: W + '<path d="M6 3.8h12v15.4l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9 8.2h6M9 11.6h6M9 15h3.6"/></g>',
    teddy: W + '<circle cx="12" cy="8.8" r="4.4"/><circle cx="7" cy="5" r="1.8"/><circle cx="17" cy="5" r="1.8"/><path d="M8.2 12.8q-2.8 1.6-2.4 4.4.4 3 6.2 3t6.2-3q.4-2.8-2.4-4.4"/></g>' + F + '<circle cx="10.4" cy="8.4" r=".9"/><circle cx="13.6" cy="8.4" r=".9"/></g>',
    bed: W + '<path d="M3.6 18.6V7.2M3.8 15h16.6v3.6M3.8 12h16.6v3M7.6 12V9.6h4.6V12"/></g>',
    elevator: W + '<rect x="5.4" y="3.6" width="13.2" height="16.8" rx="1.4"/><path d="M12 4v16.4M8.6 10.4V13M8.6 10.4l-1.2 1.2M8.6 10.4l1.2 1.2M15.4 13.6v-2.6M15.4 13.6l-1.2-1.2M15.4 13.6l1.2-1.2"/></g>',
    xray: W + '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2"/><path d="M12 7v10M9 8.6h6M9.4 11h5.2M9.8 13.4h4.4M10.2 15.8h3.6"/></g>',
    umbrella: W + '<path d="M3.8 12a8.2 8.2 0 0 1 16.4 0q-2-1.6-4.1 0-2-1.6-4.1 0-2-1.6-4.1 0-2-1.6-4.1 0zM12 12.4v6a1.8 1.8 0 0 1-3.6 0"/></g>',
    link: W + '<path d="M10 14 14 10M8.6 11.4 6.2 13.8a3.4 3.4 0 0 0 4.8 4.8l2.4-2.4M15.4 12.6l2.4-2.4a3.4 3.4 0 0 0-4.8-4.8L10.6 7.8"/></g>',
    ribbon: W + '<circle cx="12" cy="8.2" r="4.2"/><path d="M9.4 11.8 7.4 20l3-1.8 1.6 2 1.6-2 3 1.8-2-8.2"/></g>',
    scroll: W + '<path d="M6.8 4.4h11.4a2 2 0 0 1 2 2q0 2-2 2H8.8M6.8 4.4a2 2 0 0 0-2 2q0 2 2 2v9.2a2 2 0 0 0 2 2h9.4q2 0 2-2t-2-2H8.8"/></g>',
    clover: W + '<path d="M12 12q-4.6-.4-4.8-3.8Q7 5.4 9.6 5.6q2.6.2 2.4 4.4.2-4.2 2.8-4.4t2.4 2.6Q17 11.6 12 12zq-4.6.4-4.8 3.8-.2 2.8 2.4 2.6t2.4-4.4q-.2 4.2 2.4 4.4t2.4-2.6Q17 12.4 12 12zM12 15.6q0 3.4 1.4 5"/></g>',
    germ: W + '<circle cx="12" cy="12" r="4.8"/><path d="M12 3.8v3M12 17.2v3M3.8 12h3M17.2 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1"/></g>' + F + '<circle cx="10.4" cy="11" r="1"/><circle cx="13.8" cy="13.4" r=".8"/></g>',
    balloon: W + '<ellipse cx="12" cy="8.6" rx="5" ry="5.8"/><path d="M12 14.6l-1 1.6h2zM12 16.4q-2 2.4 0 4.2"/></g>',
    salad: W + '<path d="M4.2 13.4h15.6a7.8 7.8 0 0 1-15.6 0z"/><path d="M8 13q-1.4-4.6 2-6.6M12.4 13q-.4-4.4 3.2-5.8M15.6 12.8q2.4-2.6 4.6-1.8"/></g>',
    nowater: W + '<path d="M12 4.2q5 6 5 9.8a5 5 0 0 1-8.2 3.9M7.3 16.6A5 5 0 0 1 7 14q0-2.4 2-5.6M4.6 4.6l14.8 14.8"/></g>',
    city: W + '<path d="M4 20.4V9.6h5.4v10.8M9.4 13h5.2v7.4M14.6 20.4V5.6H20v14.8M3 20.6h18"/></g>' + F + '<circle cx="6.6" cy="12" r=".7"/><circle cx="17.3" cy="8.6" r=".7"/><circle cx="17.3" cy="12.6" r=".7"/></g>',
    clapper: W + '<rect x="4" y="10.4" width="16" height="9.4" rx="1.4"/><path d="M4.2 10.2 19 6.2l-.8-2.8L4 7.4zM8 9.2 10 5.4M12.4 8 14.4 4.2"/></g>',
    shop: W + '<path d="M4.4 9.4V7l1.8-3h11.6l1.8 3v2.4M4.4 9.4a2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 .8 0M5.4 11.6v8.8h13.2v-8.8M9.6 20.2v-5h4.8v5"/></g>',
    pudding: W + '<path d="M7 14.6q-1-6.4 5-6.4t5 6.4z"/><path d="M4.4 15h15.2q-.6 3-2.6 3H7q-2 0-2.6-3z"/></g>' + F + '<circle cx="12" cy="6.4" r="1.3"/></g>',
    pen: W + '<path d="M5 19l1-4L16.6 4.4a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L9 18zM15.4 5.6l3 3"/></g>',
    clip: W + '<path d="M16.4 7.2 9.2 14.4a2.1 2.1 0 0 0 3 3l7.2-7.3a3.9 3.9 0 0 0-5.5-5.5L6.7 11.8a5.7 5.7 0 0 0 8 8l6-5.9"/></g>',
    chair: W + '<path d="M7.4 12V4.4h9.2V12M5.4 12.4h13.2v3H5.4zM7 15.8 6.2 20M17 15.8l.8 4.2"/></g>',
    dna: W + '<path d="M7.4 3.6q0 5 4.6 8.4t4.6 8.4M16.6 3.6q0 5-4.6 8.4T7.4 20.4M8 6.4h8M8.4 9h7.2M8.4 15h7.2M8 17.6h8"/></g>',
    bricks: W + '<path d="M4 8h16v4H4zM4 12h16v4H4zM10 8v4M16 8v4M7 12v4M13 12v4"/></g>',
    hole: W + '<ellipse cx="12" cy="14.4" rx="7.6" ry="3.8"/><path d="M7 12.2q5-2.4 10 0"/></g>',
    choc: W + '<rect x="6" y="3.8" width="12" height="16.4" rx="1.4"/><path d="M12 4v16M6.2 9.4h11.6M6.2 14.8h11.6"/></g>',
    medal: W + '<circle cx="12" cy="14.6" r="5"/><path d="M8.6 10.6 5.4 3.6h4.2L12 8.6l2.4-5h4.2l-3.2 7"/></g>',
    plant: W + '<path d="M8 14.4h8l-1 6H9zM12 14V9.4M12 9.6Q11.6 5 6.8 4.6q.6 5 5.2 5zM12 7.6q.4-3.8 4.8-4.2-.6 4.2-4.8 4.2z"/></g>',
    bucket: W + '<path d="M5 8.4h14l-1.6 11.4H6.6z"/><path d="M6.4 8.2a5.6 5.6 0 0 1 11.2 0"/></g>',
    web: W + '<path d="M12 3.6v16.8M4.7 7.8l14.6 8.4M19.3 7.8 4.7 16.2M12 8q3 1.2 3.6 2.2-.4 2-.2 3.6-1.6 1-3.4 1t-3.4-1q.2-1.6-.2-3.6Q9 9.2 12 8z"/></g>',
    tomato: W + '<circle cx="12" cy="13.2" r="6.8"/><path d="M12 6.6q-.6-2 .8-3.2M12 6.4l2.8-1.2-1 2.2 3 .2-2.2 1.8M12 6.4 9.2 5.2l1 2.2-3 .2 2.2 1.8"/></g>',
    sleep: W + '<path d="M5 8h5l-5 6h5M13.4 4.6h4l-4 5h4M14 14.6h3.2l-3.2 4h3.2"/></g>',
    flower: W + '<circle cx="12" cy="9" r="2.2"/><path d="M12 6.8q-2.8-3.2 0-4.4 2.8 1.2 0 4.4zM14.2 9q3.6-1.6 4.2 1-1 2.6-4.2-1zM9.8 9q-3.6-1.6-4.2 1 1 2.6 4.2-1zM12 11.2v9.2M12 16q-3 .4-4-2.4M12 17.6q3 .4 4-2.4"/></g>',
    intercom: W + '<rect x="5.4" y="5.4" width="13.2" height="13.2" rx="2.2"/><circle cx="12" cy="11" r="3"/><path d="M8.6 15.8h6.8"/></g>',
  };

  /* ---- emoji → [svg symbol | null, canvas glyph] ----
     Everything the game has ever typed. Unlisted 1F000+ chars are
     stripped outright, so nothing pictographic slips through. */
  const MAP = {
    '📋': ['clipboard', ''], '💊': ['pill', ''], '🧹': ['mop', ''], '☠': ['skull', ''], '💀': ['skull', ''],
    '🌙': ['moon', ''], '🌑': ['moon', ''], '☾': [null, '☾'], '🥊': ['boxing', ''], '📞': ['phone', ''],
    '📄': ['paper', ''], '🗎': ['paper', ''], '🧾': ['receipt', ''], '🏆': ['trophy', ''], '🚪': ['door', ''],
    '⚡': ['bolt', ''], '⏱': ['clock', ''], '⏰': ['clock', ''], '⌚': ['watch', ''], '🦭': ['walrus', ''],
    '✅': ['checkon', '✓'], '⬜': ['checkoff', '□'], '🏥': ['hospital', ''], '🏁': ['flag', ''], '🏳': ['flag', ''],
    '☕': ['coffee', ''], '🔥': ['flame', ''], '📤': ['paper', ''], '📥': ['folder', ''], '🔒': ['lock', ''],
    '🔓': ['unlock', ''], '🚧': ['cone', ''], '🔑': ['key', ''], '🗝': ['key', ''], '✨': ['sparkle', ''],
    '🗓': ['calendar', ''], '📅': ['calendar', ''], '🏗': ['crane', ''], '📉': ['chartdown', ''], '📈': ['chart', ''],
    '📊': ['chart', ''], '🎮': ['pad', ''], '🤝': ['people', ''], '👥': ['people', ''], '👪': ['people', ''],
    '🕊': ['bird', ''], '🔧': ['wrench', ''], '🕴': ['suit', ''], '⚠': ['warn', '!'], '🎱': ['bingo', ''],
    '🎁': ['gift', ''], '🎀': ['gift', ''], '🧪': ['flask', ''], '⚗': ['flask', ''], '🚑': ['ambulance', ''],
    '🗂': ['files', ''], '🗃': ['files', ''], '✊': ['fist', ''], '🚶': ['walker', ''], '🏃': ['runner', ''],
    '🎯': ['target', ''], '🚨': ['siren', ''], '🪪': ['badge', ''], '📝': ['note', ''], '🗒': ['note', ''],
    '☀': ['sun', ''], '🌤': ['sun', ''], '🌇': ['city', ''], '❄': ['snow', '*'], '🩸': ['drop', ''],
    '💧': ['drop', ''], '🎲': ['dice', ''], '📖': ['book', ''], '📔': ['book', ''], '📘': ['book', ''],
    '📚': ['book', ''], '💾': ['save', ''], '💰': ['coins', ''], '🪙': ['coins', ''], '🍂': ['leaf', ''],
    '🌱': ['sprout', ''], '🔗': ['link', ''], '🩺': ['stetho', ''], '🧠': ['brain', ''], '🗄': ['cabinet', ''],
    '🕯': ['candle', ''], '🧯': ['exting', ''], '🎤': ['mic', ''], '📻': ['radio', ''], '⭐': ['star', '★'],
    '🎗': ['ribbon', ''], '🫙': ['jar', ''], '🎓': ['gradcap', ''], '🎟': ['ticket', ''], '🎫': ['ticket', ''],
    '📦': ['box', ''], '📁': ['folder', ''], '📂': ['folder', ''], '⚙': ['gear', ''], '🔊': ['speaker', ''],
    '🔇': ['mute', ''], '👑': ['crown', ''], '🔔': ['bell', ''], '❤': [null, '♥'], '💗': [null, '♥'],
    '🧟': ['walker', ''], '⬇': [null, '↓'], '⬆': [null, '↑'], '🔁': ['repeat', ''], '🔄': ['repeat', ''],
    '🕹': ['joystick', ''], '🍅': ['tomato', ''], '🪜': ['ladder', ''], '🐕': ['dog', ''], '⚕': ['medcross', ''],
    '☤': ['medcross', ''], '✚': [null, '✚'], '🧸': ['teddy', ''], '😴': ['sleep', ''], '🐾': ['paw', ''],
    '🏖': ['umbrella', ''], '🎩': ['tophat', ''], '🧷': ['clip', ''], '🛏': ['bed', ''], '🕳': ['hole', ''],
    '🍫': ['choc', ''], '📢': ['megaphone', ''], '📣': ['megaphone', ''], '🛗': ['elevator', ''],
    '🔴': [null, '●'], '🟡': [null, '●'], '🧬': ['dna', ''], '📳': ['vibrate', ''], '📴': ['mobile', ''],
    '✖': [null, '×'], '🧱': ['bricks', ''], '🙂': [null, ''], '👏': [null, ''], '✍': ['pen', ''],
    '🍀': ['clover', ''], '🛍': ['cart', ''], '🛒': ['cart', ''], '🏷': ['tag', ''], '💼': ['briefcase', ''],
    '👻': ['ghost', ''], '🩻': ['xray', ''], '💌': ['mail', ''], '✉': ['mail', ''], '📬': ['mail', ''],
    '🥗': ['salad', ''], '🚱': ['nowater', ''], '🏢': ['building', ''], '🏙': ['city', ''], '🐈': ['cat', ''],
    '🐍': ['snake', ''], '🐟': ['fish', ''], '🐠': ['fish', ''], '🎬': ['clapper', ''], '⏸': [null, '❚❚'],
    '⏭': [null, '»'], '🏪': ['shop', ''], '🗺': ['map', ''], '🎈': ['balloon', ''], '📺': ['tv', ''],
    '🛡': ['shield', ''], '🌫': ['wind', ''], '👁': ['eye', ''], '📿': ['beads', ''], '💳': ['card', ''],
    '❔': [null, '?'], '🎵': ['music', ''], '👒': ['tophat', ''], '🗑': ['trash', ''], '🎒': ['briefcase', ''],
    '💉': ['syringe', ''], '🪣': ['bucket', ''], '💿': [null, '●'], '🎭': [null, ''], '⚔': ['boxing', ''],
    '⌨': ['keyboard', ''], '📱': ['mobile', ''], '🏋': ['gym', ''], '🛋': ['couch', ''], '🏚': ['annex', ''],
    '📜': ['scroll', ''], '🎰': ['dice', ''], '🔮': ['sparkle', ''], '🤒': [null, ''], '💪': [null, ''],
    '🤫': [null, ''], '💐': ['flower', ''], '🧼': [null, ''], '🛳': [null, ''], '📐': [null, ''],
    '🖋': ['pen', ''], '🖊': ['pen', ''], '🪞': [null, ''], '🪢': [null, ''], '🥉': ['medal', ''],
    '🥈': ['medal', ''], '🥇': ['medal', ''], '🪴': ['plant', ''], '💨': ['wind', ''], '🧰': ['toolbox', ''],
    '💥': ['bolt', ''], '🥶': [null, ''], '🚫': ['ban', ''], '🎢': [null, ''], '🍮': ['pudding', ''],
    '📎': ['clip', ''], '🌡': ['therm', ''], '👓': ['glasses', ''], '🪑': ['chair', ''], '🦠': ['germ', ''],
    '🔦': ['torch', ''], '🔋': ['battery', ''], '😵': [null, ''], '🕸': ['web', ''], '✌': [null, ''],
    '📶': [null, ''], '🩹': ['bandage', ''], '❥': [null, '❥'], '✦': [null, '✦'],
    '📕': ['book', ''], '📗': ['book', ''], '📙': ['book', ''], '☤': ['medcross', '✚'],
  };

  const IC = (name, cls) => S[name]
    ? '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-' + name + '"/></svg>'
    : '';

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);
  const RX = new RegExp(KEYS.map(esc).join('|'), 'gu');
  const VS = /[︎️‍]/gu;                   // variation selectors + ZWJ
  const RESIDUE = /[\u{1F000}-\u{1FAFF}]/gu;             // any unmapped pictograph: gone
  const TIDY = s => s.replace(RESIDUE, '').replace(/ {2,}/g, ' ');

  const html = str => TIDY(String(str).replace(VS, '').replace(RX, m => {
    const [sym, txt] = MAP[m];
    return sym ? IC(sym) : (txt || '');
  }));

  const txt = str => TIDY(String(str).replace(VS, '').replace(RX, m => MAP[m][1] || '')).replace(/^ +/, '');

  /* ---- canvas mini-doodles (hub signage, minimap, arcade) ---- */
  const PAINT = {
    trophy(c) { c.beginPath(); c.moveTo(-4, -6); c.lineTo(4, -6); c.lineTo(3.4, -1); c.quadraticCurveTo(3, 2, 0, 2); c.quadraticCurveTo(-3, 2, -3.4, -1); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0, 2); c.lineTo(0, 4.6); c.moveTo(-2.6, 5.8); c.quadraticCurveTo(0, 4.6, 2.6, 5.8); c.stroke(); },
    gear(c) { c.beginPath(); c.arc(0, 0, 3.4, 0, TAU); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * 4.4, Math.sin(a) * 4.4); c.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); c.stroke(); } },
    skull(c) { c.beginPath(); c.arc(0, -1, 4.2, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-1.8, 2.6); c.lineTo(-1.8, 4.6); c.moveTo(0, 3); c.lineTo(0, 5); c.moveTo(1.8, 2.6); c.lineTo(1.8, 4.6); c.stroke(); c.beginPath(); c.arc(-1.6, -1.4, 1, 0, TAU); c.arc(1.6, -1.4, 1, 0, TAU); c.fill(); },
    jar(c) { c.beginPath(); c.moveTo(-3, -5); c.lineTo(3, -5); c.stroke(); c.beginPath(); c.moveTo(-3.6, -3.4); c.quadraticCurveTo(-4.4, 2, -3.6, 4.4); c.quadraticCurveTo(0, 6, 3.6, 4.4); c.quadraticCurveTo(4.4, 2, 3.6, -3.4); c.stroke(); c.beginPath(); c.moveTo(-1.8, 1); c.lineTo(1.8, 1); c.stroke(); },
    radio(c) { c.strokeRect(-5.4, -3, 10.8, 7); c.beginPath(); c.moveTo(-3.4, -3.4); c.lineTo(3.4, -6.4); c.stroke(); c.beginPath(); c.arc(2.4, 0.6, 1.8, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-4, -0.6); c.lineTo(-1, -0.6); c.moveTo(-4, 1.2); c.lineTo(-1, 1.2); c.moveTo(-4, 3); c.lineTo(-1, 3); c.stroke(); },
    joystick(c) { c.beginPath(); c.moveTo(0, 0.6); c.lineTo(0, -3.4); c.stroke(); c.beginPath(); c.arc(0, -4.4, 1.7, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-5, 4.4); c.quadraticCurveTo(-5, 1.4, 0, 1.4); c.quadraticCurveTo(5, 1.4, 5, 4.4); c.closePath(); c.stroke(); },
    book(c) { c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(-2.4, -5.6, -5.4, -5.2); c.lineTo(-5.4, 4.4); c.quadraticCurveTo(-2.4, 4, 0, 5.6); c.quadraticCurveTo(2.4, 4, 5.4, 4.4); c.lineTo(5.4, -5.2); c.quadraticCurveTo(2.4, -5.6, 0, -4); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0, -4); c.lineTo(0, 5.4); c.stroke(); },
    clipboard(c) { c.strokeRect(-4, -5.4, 8, 10.8); c.strokeRect(-2, -6.4, 4, 2.2); c.beginPath(); c.moveTo(-2.4, -1.4); c.lineTo(2.6, -1.4); c.moveTo(-2.4, 1.4); c.lineTo(1.4, 1.4); c.stroke(); },
    coffee(c) { c.beginPath(); c.moveTo(-3.6, -2.4); c.lineTo(3.2, -2.4); c.lineTo(2.8, 3.6); c.quadraticCurveTo(0, 4.6, -3.2, 3.6); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(3.2, -1.4); c.quadraticCurveTo(5.6, -1, 4.4, 1.6); c.stroke(); c.beginPath(); c.moveTo(-1.6, -4); c.quadraticCurveTo(-2, -5, -1.2, -6); c.moveTo(1, -4); c.quadraticCurveTo(0.6, -5, 1.4, -6); c.stroke(); },
    sparkle(c) { c.beginPath(); c.moveTo(0, -6); c.lineTo(1.4, -1.4); c.lineTo(6, 0); c.lineTo(1.4, 1.4); c.lineTo(0, 6); c.lineTo(-1.4, 1.4); c.lineTo(-6, 0); c.lineTo(-1.4, -1.4); c.closePath(); c.stroke(); },
    gradcap(c) { c.beginPath(); c.moveTo(-6, -1.4); c.lineTo(0, -4.4); c.lineTo(6, -1.4); c.lineTo(0, 1.6); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(-3.4, 0.2); c.lineTo(-3.4, 3); c.quadraticCurveTo(0, 5, 3.4, 3); c.lineTo(3.4, 0.2); c.stroke(); c.beginPath(); c.moveTo(6, -1.2); c.lineTo(6, 2.4); c.stroke(); },
    pill(c) { c.save(); c.rotate(-0.35); c.beginPath(); const r = 2.6; c.moveTo(-3.4, -r); c.lineTo(3.4, -r); c.arc(3.4, 0, r, -Math.PI / 2, Math.PI / 2); c.lineTo(-3.4, r); c.arc(-3.4, 0, r, Math.PI / 2, -Math.PI / 2); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.restore(); },
    moon(c) { c.beginPath(); c.arc(0.6, 0, 5, -1.1, 1.9); c.quadraticCurveTo(-2.6, 2.4, -2.8, -2.8); c.closePath(); c.stroke(); },
    heart(c) { c.beginPath(); c.moveTo(0, 4.8); c.quadraticCurveTo(-5.6, 0.6, -5.6, -2); c.quadraticCurveTo(-5.4, -5.2, -2.6, -5); c.quadraticCurveTo(-0.6, -4.8, 0, -2.8); c.quadraticCurveTo(0.6, -4.8, 2.6, -5); c.quadraticCurveTo(5.4, -5.2, 5.6, -2); c.quadraticCurveTo(5.6, 0.6, 0, 4.8); c.closePath(); c.stroke(); },
    phone(c) { c.beginPath(); c.moveTo(-4.6, -4.2); c.quadraticCurveTo(-2.4, -5.6, -1.6, -3.6); c.lineTo(-1, -1.8); c.quadraticCurveTo(-0.6, -0.6, -1.8, 0); c.quadraticCurveTo(-0.8, 2.6, 1.6, 3.8); c.quadraticCurveTo(2.6, 2.8, 3.6, 3.4); c.lineTo(5, 4.4); c.quadraticCurveTo(6.4, 5.4, 4.6, 6.6); c.quadraticCurveTo(0.6, 8, -3, 3.4); c.quadraticCurveTo(-6.4, -1, -4.6, -4.2); c.closePath(); c.stroke(); },
    key(c) { c.beginPath(); c.arc(-3, -3, 2.8, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-1, -1); c.lineTo(5, 5); c.moveTo(2.6, 2.6); c.lineTo(4.2, 1); c.moveTo(4.4, 4.4); c.lineTo(6, 2.8); c.stroke(); },
  };

  const paint = (ctx, name, x, y, size, color, lw) => {
    const fn = PAINT[name]; if (!fn) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 12, size / 12);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = (lw || 1.4) * 12 / size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(ctx); ctx.restore();
  };

  /* ---- the canvas dragnet ----
     Every fillText/strokeText in the game passes through the same
     translation the overlays get. Nothing pictographic reaches a
     canvas, now or in any future round. Memoized — label strings
     repeat every frame. */
  const _memo = new Map();
  const sanitize = s => {
    if (typeof s !== 'string' || !s) return s;
    let v = _memo.get(s);
    if (v === undefined) {
      v = txt(s);
      if (_memo.size > 4000) _memo.clear();
      _memo.set(s, v);
    }
    return v;
  };
  const patchCtx = proto => {
    if (!proto || proto._egsInked) return;
    proto._egsInked = true;
    const ft = proto.fillText, st = proto.strokeText;
    proto.fillText = function (s, ...a) { return ft.call(this, sanitize(s), ...a); };
    proto.strokeText = function (s, ...a) { return st.call(this, sanitize(s), ...a); };
  };
  if (typeof CanvasRenderingContext2D !== 'undefined') patchCtx(CanvasRenderingContext2D.prototype);
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') patchCtx(OffscreenCanvasRenderingContext2D.prototype);

  /* ---- inject the <symbol> sheet once ---- */
  const inject = () => {
    if (document.getElementById('egsIconDefs')) return;
    const div = document.createElement('div');
    div.innerHTML = '<svg id="egsIconDefs" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">'
      + Object.entries(S).map(([n, m]) => '<symbol id="ic-' + n + '" viewBox="0 0 24 24">' + m + '</symbol>').join('') + '</svg>';
    document.body.insertBefore(div.firstChild, document.body.firstChild);
  };
  if (typeof document !== 'undefined') { if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject); }

  return { S, MAP, IC, html, txt, paint, inject };
})();
