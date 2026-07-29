/* ==========================================================================
   muscles.js — карта работающих мышц.
   Единственная схема, которая осталась в проекте: технику показывают
   фотографии и видео, а карта мышц отвечает на другой вопрос —
   «что именно должно работать» — и для этого схема подходит лучше фото.
   ========================================================================== */

function muscleMap(primary = [], secondary = []) {
  const c = (k) => 'm' + (primary.includes(k) ? ' on' : secondary.includes(k) ? ' on2' : '');
  const svg = (inner) => `<svg viewBox="0 0 110 178" role="img" aria-hidden="true">${inner}</svg>`;

  const base =
    `<circle class="m" cx="55" cy="15" r="11"/>` +
    `<rect class="m" x="49" y="23" width="12" height="9" rx="3"/>` +
    `<path class="m" d="M40,31 H70 Q79,32 79,42 L74,88 Q73,98 64,99 H46 Q37,98 36,88 L31,42 Q31,32 40,31 Z"/>` +
    `<rect class="m" x="16" y="48" width="13" height="30" rx="6.5"/>` +
    `<rect class="m" x="81" y="48" width="13" height="30" rx="6.5"/>` +
    `<rect class="m" x="15" y="75" width="11" height="30" rx="5.5"/>` +
    `<rect class="m" x="84" y="75" width="11" height="30" rx="5.5"/>` +
    `<path class="m" d="M37,95 H73 L70,117 H40 Z"/>` +
    `<rect class="m" x="38" y="110" width="16" height="39" rx="8"/>` +
    `<rect class="m" x="56" y="110" width="16" height="39" rx="8"/>` +
    `<rect class="m" x="40" y="145" width="13" height="30" rx="6"/>` +
    `<rect class="m" x="57" y="145" width="13" height="30" rx="6"/>`;

  const front = svg(base +
    `<ellipse class="${c('delt')}" cx="28" cy="41" rx="11" ry="10"/>` +
    `<ellipse class="${c('delt')}" cx="82" cy="41" rx="11" ry="10"/>` +
    `<rect class="${c('chest')}" x="40" y="38" width="14" height="18" rx="6"/>` +
    `<rect class="${c('chest')}" x="56" y="38" width="14" height="18" rx="6"/>` +
    `<path class="${c('obl')}" d="M38,60 L44,63 V92 L39,85 Z"/>` +
    `<path class="${c('obl')}" d="M72,60 L66,63 V92 L71,85 Z"/>` +
    `<rect class="${c('abs')}" x="45" y="58" width="20" height="38" rx="6"/>` +
    `<path class="mline" d="M45,70 H65 M45,79 H65 M45,88 H65 M55,58 V96"/>` +
    `<rect class="${c('bi')}" x="17" y="49" width="11" height="27" rx="5.5"/>` +
    `<rect class="${c('bi')}" x="82" y="49" width="11" height="27" rx="5.5"/>` +
    `<rect class="${c('fore')}" x="16" y="76" width="10" height="27" rx="5"/>` +
    `<rect class="${c('fore')}" x="84" y="76" width="10" height="27" rx="5"/>` +
    `<rect class="${c('quad')}" x="39" y="112" width="14" height="34" rx="7"/>` +
    `<rect class="${c('quad')}" x="57" y="112" width="14" height="34" rx="7"/>`);

  const back = svg(base +
    `<ellipse class="${c('rdelt')}" cx="28" cy="41" rx="11" ry="10"/>` +
    `<ellipse class="${c('rdelt')}" cx="82" cy="41" rx="11" ry="10"/>` +
    `<path class="${c('trap')}" d="M43,30 H67 L74,45 L63,58 H47 L36,45 Z"/>` +
    `<path class="${c('lat')}" d="M36,50 L48,58 V88 L38,76 Q34,64 36,50 Z"/>` +
    `<path class="${c('lat')}" d="M74,50 L62,58 V88 L72,76 Q76,64 74,50 Z"/>` +
    `<rect class="${c('erector')}" x="48" y="58" width="14" height="36" rx="5"/>` +
    `<rect class="${c('tri')}" x="17" y="49" width="11" height="27" rx="5.5"/>` +
    `<rect class="${c('tri')}" x="82" y="49" width="11" height="27" rx="5.5"/>` +
    `<rect class="${c('glute')}" x="37" y="94" width="18" height="21" rx="8"/>` +
    `<rect class="${c('glute')}" x="55" y="94" width="18" height="21" rx="8"/>` +
    `<rect class="${c('ham')}" x="39" y="112" width="14" height="34" rx="7"/>` +
    `<rect class="${c('ham')}" x="57" y="112" width="14" height="34" rx="7"/>`);

  return `<div class="muscle-maps">
    <figure>${front}<figcaption>спереди</figcaption></figure>
    <figure>${back}<figcaption>сзади</figcaption></figure>
  </div>`;
}
