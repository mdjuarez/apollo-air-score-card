/* Apollo Air Score Card (barra + %)
 *
 * Uso:
 *  A) Con helper existente:
 *      type: custom:apollo-air-score-card
 *      name: Air Quality - Max
 *      icon: mdi:sprout
 *      pct_entity: number.airmax_helper
 *
 *  B) Cálculo automático (slug obligatorio, misma lógica que el template Jinja):
 *      type: custom:apollo-air-score-card
 *      name: Air Quality - Max
 *      icon: mdi:sprout
 *      slug: apollo_air_max
 *
 * Opciones extra:
 *  - show_temp:      true/false  (default: true)
 *  - show_hum:       true/false  (default: true)
 *  - temp_value:     entidad o número  (override de temperatura)
 *  - hum_value:      entidad o número  (override de humedad)
 *  - use_fahrenheit: true/false  (default: false)
 *
 *  Prioridad de temp/hum:
 *    1) Si se pasa temp_value / hum_value en config:
 *         - Si es string, se trata como entity_id (sensor.xxx, number.xxx, etc.)
 *         - Si es número, se usa directamente.
 *    2) Si hay slug, se leen sensor.<slug>_sen55_temperature / _sen55_humidity.
 *    3) Si no hay nada, se usan defaults (21°C y 45%).
 *
 *  Importante:
 *    - El score SIEMPRE se calcula en °C (modelo pesimista).
 *    - Si use_fahrenheit: true, la UI muestra °F, pero internamente
 *      convertimos a °C para el cálculo.
 */

const LitEl = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html  = LitEl.prototype.html;
const css   = LitEl.prototype.css;

class ApolloAirScoreCard extends LitEl {
  static get properties() { return { hass:{}, _config:{} }; }

  setConfig(config) {
    if (!config) throw new Error("Config inválida");
    if (!config.pct_entity && !config.slug) {
      throw new Error("Debes pasar pct_entity o slug");
    }

    this._config = {
      show_temp:      config.show_temp      !== false,    // default true
      show_hum:       config.show_hum       !== false,    // default true
      use_fahrenheit: config.use_fahrenheit === true,    // default false
      ...config,
    };
  }

  getCardSize(){ return 3; }

  _n(id){
    const v = Number(this.hass?.states?.[id]?.state);
    return Number.isNaN(v) ? undefined : v;
  }

  _fmt(n){
    return (Math.round(n*100)/100).toFixed(2).replace(/\.?0+$/,'');
  }

  // Resuelve temperatura y humedad con la prioridad:
  // overrides -> slug -> defaults
  // Devuelve siempre tempC (en °C) y hum (%)
  _resolveEnv(slug) {
    const cfg = this._config;

    // --- Humedad ---
    let hum;
    if (cfg.hum_value !== undefined) {
      if (typeof cfg.hum_value === "string") {
        // tratar como entity_id
        const h = this._n(cfg.hum_value);
        if (h !== undefined) hum = h;
      } else {
        const h = Number(cfg.hum_value);
        if (!Number.isNaN(h)) hum = h;
      }
    }
    if (hum === undefined && slug) {
      const h = this._n(`sensor.${slug}_sen55_humidity`);
      if (h !== undefined) hum = h;
    }
    if (hum === undefined) hum = 45; // default igual al template

    // --- Temperatura ---
    let tempRaw; // En unidad “visible” del usuario (°C por defecto, °F si use_fahrenheit)
    if (cfg.temp_value !== undefined) {
      if (typeof cfg.temp_value === "string") {
        const t = this._n(cfg.temp_value);
        if (t !== undefined) tempRaw = t;
      } else {
        const t = Number(cfg.temp_value);
        if (!Number.isNaN(t)) tempRaw = t;
      }
    }
    if (tempRaw === undefined && slug) {
      const t = this._n(`sensor.${slug}_sen55_temperature`);
      if (t !== undefined) tempRaw = t;
    }
    if (tempRaw === undefined) tempRaw = 21; // default igual al template

    // Internamente trabajamos SIEMPRE en °C
    let tempC;
    if (cfg.use_fahrenheit) {
      // tempRaw en °F → convertir a °C
      tempC = (tempRaw - 32) * 5 / 9;
    } else {
      tempC = tempRaw; // ya está en °C
    }

    return { tempC, hum };
  }

  // === Auto score: modelo pesimista normalizado, 1:1 con tu Jinja ===
  _autoScore(slug) {
    // Defaults como en tu template
    const co2     = this._n(`sensor.${slug}_co2`)                            ?? 4500;
    const pm25    = this._n(`sensor.${slug}_pm_2_5_m_weight_concentration`) ?? 225.4;
    const voc     = this._n(`sensor.${slug}_sen55_voc`)                      ?? 500;
    const nh3     = this._n(`sensor.${slug}_ammonia`)                        ?? 50;
    const co      = this._n(`sensor.${slug}_carbon_monoxide`)                ?? 10;
    const press   = this._n(`sensor.${slug}_dps310_pressure`)                ?? 1013;
    const ethanol = this._n(`sensor.${slug}_ethanol`)                        ?? 100;
    const h2      = this._n(`sensor.${slug}_hydrogen`)                       ?? 10;
    const ch4     = this._n(`sensor.${slug}_methane`)                        ?? 1000;
    const no2     = this._n(`sensor.${slug}_nitrogen_dioxide`)               ?? 1;
    const pm10    = this._n(`sensor.${slug}_pm_10_m_weight_concentration`)  ?? 50;
    const pm1     = this._n(`sensor.${slug}_pm_1_m_weight_concentration`)   ?? 10;
    const pm4     = this._n(`sensor.${slug}_pm_4_m_weight_concentration`)   ?? 25;
    const nox     = this._n(`sensor.${slug}_sen55_nox`)                      ?? 1;

    // Temp/Hum vía helper (en °C + %)
    const { tempC: temp, hum } = this._resolveEnv(slug);

    // --- CO2 (AJUSTADO 800–2000, máx 20) ---
    let co2_score;
    if (co2 >= 2000)      co2_score = 0;
    else if (co2 <= 800)  co2_score = 20;
    else                  co2_score = ((2000 - co2) / (2000 - 800)) * 20;

    // --- PM2.5 (AJUSTADO 5–75, máx 18) ---
    let pm25_score;
    if (pm25 >= 75)       pm25_score = 0;
    else if (pm25 <= 5)   pm25_score = 18;
    else                  pm25_score = ((75 - pm25) / (75 - 5)) * 18;

    // --- VOC (escalones, >=100 → 0, máx 10) ---
    let voc_score;
    if (voc >= 100)       voc_score = 0;
    else if (voc <= 10)   voc_score = 10;
    else if (voc <= 20)   voc_score = 9;
    else if (voc <= 30)   voc_score = 8;
    else if (voc <= 40)   voc_score = 7;
    else if (voc <= 50)   voc_score = 6;
    else if (voc <= 60)   voc_score = 5;
    else if (voc <= 70)   voc_score = 4;
    else if (voc <= 80)   voc_score = 3;
    else if (voc <= 90)   voc_score = 2;
    else                  voc_score = 1;

    // --- Temperatura (ideal 23, máx 7) ---
    const tdev       = Math.abs(temp - 23);
    const temp_score = tdev >= 10 ? 0 : (7 - tdev * 0.7);

    // --- Humedad (30–60 ideal, máx 8) ---
    let hum_score;
    if (hum < 30)         hum_score = (hum / 30) * 8;
    else if (hum > 60)    hum_score = ((100 - hum) / 40) * 8;
    else                  hum_score = 8;

    // --- Amoníaco (máx 3) ---
    let nh3_score;
    if (nh3 >= 50)        nh3_score = 0;
    else if (nh3 <= 1)    nh3_score = 3;
    else                  nh3_score = ((50 - nh3) / (50 - 1)) * 3;

    // --- Monóxido de Carbono (máx 15) ---
    let co_score;
    if (co >= 10)         co_score = 0;
    else if (co <= 1)     co_score = 15;
    else                  co_score = ((10 - co) / (10 - 1)) * 15;

    // --- Presión (ideal 1013, máx 1) ---
    const pdev        = Math.abs(press - 1013);
    const press_score = pdev >= 10 ? 0 : (1 - (pdev / 10)) * 1;

    // --- Etanol (máx 1) ---
    let et_score;
    if (ethanol >= 100)   et_score = 0;
    else if (ethanol <= 1)et_score = 1;
    else                  et_score = ((100 - ethanol) / (100 - 1)) * 1;

    // --- Hidrógeno (máx 1) ---
    let h2_score;
    if (h2 >= 10)         h2_score = 0;
    else if (h2 <= 1)     h2_score = 1;
    else                  h2_score = ((10 - h2) / (10 - 1)) * 1;

    // --- Metano (máx 2) ---
    let ch4_score;
    if (ch4 >= 1000)      ch4_score = 0;
    else if (ch4 <= 1)    ch4_score = 2;
    else                  ch4_score = ((1000 - ch4) / (1000 - 1)) * 2;

    // --- NO2 (máx 5) ---
    let no2_score;
    if (no2 >= 1)         no2_score = 0;
    else if (no2 <= 0.1)  no2_score = 5;
    else                  no2_score = ((1 - no2) / (1 - 0.1)) * 5;

    // --- PM10 (máx 5) ---
    let pm10_score;
    if (pm10 >= 50)       pm10_score = 0;
    else if (pm10 <= 10)  pm10_score = 5;
    else                  pm10_score = ((50 - pm10) / (50 - 10)) * 5;

    // --- PM1 (máx 6) ---
    let pm1_score;
    if (pm1 >= 10)        pm1_score = 0;
    else if (pm1 <= 1)    pm1_score = 6;
    else                  pm1_score = ((10 - pm1) / (10 - 1)) * 6;

    // --- PM4 (máx 6) ---
    let pm4_score;
    if (pm4 >= 25)        pm4_score = 0;
    else if (pm4 <= 5)    pm4_score = 6;
    else                  pm4_score = ((25 - pm4) / (25 - 5)) * 6;

    // --- NOx (SEN55 Index, 1 limpio → 10 puntos, máx 10) ---
    let nox_score;
    if (nox <= 1)         nox_score = 10;
    else if (nox >= 50)   nox_score = 0;
    else                  nox_score = ((50 - nox) / (50 - 1)) * 10;

    // --- Suma bruta EXACTAMENTE como en el template ---
    const final_score_raw =
      co2_score +
      pm25_score +
      voc_score +
      nh3_score +
      co_score +
      press_score +
      et_score +
      h2_score +
      ch4_score +
      no2_score +
      ((pm10_score + pm1_score + pm4_score) / 3) +
      nox_score +
      temp_score +
      hum_score;

    // --- Mismo max_score que el template ---
    const max_score =
      20 + 18 + 10 + 7 + 8 + 3 + 15 + 1 + 1 + 1 + 2 + 5 + 5 + 6 + 6 + ((5 + 6 + 6) / 3) + 10;

    const normalized = (final_score_raw / max_score) * 100;

    return Math.max(0, Math.min(100, Number(normalized.toFixed(2))));
  }

  _barColor(v){
    if (v >= 80) return "#9EDF9C";
    if (v >= 60) return "#78B3CE";
    if (v >= 40) return "#FBD288";
    if (v >= 20) return "#FF9C73";
    return "#F95454";
  }

  render(){
    const name = this._config.name ?? "Air Quality";
    const icon = this._config.icon ?? "mdi:sprout";

    // ── Temp/Hum para UI (partimos SIEMPRE de tempC en _resolveEnv)
    const { tempC, hum } = this._resolveEnv(this._config.slug ?? null);

    let tempDisplay = undefined;
    let humDisplay  = undefined;
    let tempUnit    = "°C";

    if (this._config.show_temp && tempC !== undefined) {
      if (this._config.use_fahrenheit) {
        tempDisplay = (tempC * 9/5) + 32; // UI en °F
        tempUnit    = "°F";
      } else {
        tempDisplay = tempC; // UI en °C
      }
    }

    if (this._config.show_hum && hum !== undefined) {
      humDisplay = hum;
    }

    const showTemp   = tempDisplay !== undefined;
    const showHum    = humDisplay  !== undefined;
    const showMiniEnv = showTemp || showHum;

    // calcular el % (helper o auto)
    let pct;
    if (this._config.pct_entity) {
      const v = this._n(this._config.pct_entity);
      pct = (v === undefined) ? 0 : v;
    } else {
      pct = this._autoScore(this._config.slug);
    }

    const pctStr   = this._fmt(pct);
    const barColor = this._barColor(pct);
    const barWidth = (pct <= 0) ? 0 : Math.min(100, pct);

    return html`
      <ha-card class="wrap">
        <div class="top">
          <div class="icon-badge"><ha-icon icon="${icon}"></ha-icon></div>
        </div>

        <div class="label">${pctStr}%</div>

        <div class="meta">
          <div class="title">${name}</div>

          ${showMiniEnv ? html`
            <div class="mini-env">
              ${showTemp ? html`
                <span class="mini-temp">
                  ${tempDisplay.toFixed(1)}${tempUnit}
                </span>
              ` : ''}

              ${showTemp && showHum ? html`
                <span class="mini-dot">·</span>
              ` : ''}

              ${showHum ? html`
                <span class="mini-hum">
                  ${humDisplay.toFixed(0)}%
                </span>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div class="bar-bg">
          <div class="bar" style="width:${barWidth}%; background:${barColor}"></div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host, ha-card { overflow: hidden; box-sizing: border-box; }

      .wrap{
        display: grid;
        grid-template-areas:
          "icon"
          "label"
          "name"
          "bar";
        grid-template-rows: min-content min-content min-content 30px;
        padding: 0;
        background: var(--popupBG, var(--card-background-color));
      }

      .top{
        grid-area: icon;
        display:flex;
        justify-content:flex-end;
        padding:4px 4px 0 0;
      }

      .icon-badge{
        background: var(--apollo-score-badge-bg, rgba(0,0,0,0));
        width: auto;
        height: auto;
        padding: var(--apollo-score-badge-pad, 14px);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .icon-badge ha-icon{
        --mdc-icon-size: var(--apollo-score-icon-size, 30px);
        width:  var(--apollo-score-icon-size, 30px);
        height: var(--apollo-score-icon-size, 30px);
        color: black;
      }

      .label{
        grid-area: label;
        font-size:40px;
        font-weight:300;
        color: var(--gray800, var(--primary-text-color));
        padding-left:20px;
      }

      .meta{
        grid-area: name;
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        padding: 0 20px 0 20px;
        gap: 8px;
      }

      .title{
        font-size:14px;
        color: var(--gray800, var(--primary-text-color));
        opacity:.7;
      }

      .mini-env{
        font-size:10px;
        line-height:1;
        color: var(--gray800, var(--primary-text-color));
        opacity:0.7;
        display:flex;
        align-items:center;
        gap:3px;
      }

      .mini-temp,
      .mini-hum{
        white-space:nowrap;
      }

      .mini-dot{
        font-size:10px;
        opacity:0.5;
      }

      .bar-bg{
        grid-area: bar;
        height: 30px;
        margin-top: 6px;
        background-image: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,.08) 3px,
          transparent 4px
        );
        border-bottom-left-radius:  var(--ha-card-border-radius, 12px);
        border-bottom-right-radius: var(--ha-card-border-radius, 12px);
        overflow: hidden;
      }

      .bar{
        height: 30px;
      }
    `;
  }
}

customElements.define("apollo-air-score-card", ApolloAirScoreCard);
