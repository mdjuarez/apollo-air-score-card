# apollo-air-score-card  
Compact and minimalistic score card for displaying any 0–100% metric.
Originally designed for Apollo AIR-1 Air Quality scoring, but flexible enough for curtain opening %, comfort scores, automation indicators, and more.

This custom card can:
- Compute an air quality score from Apollo AIR-1 sensors using a **pessimistic/normalized model**, or  
- Simply display any numeric percentage (0–100) from a helper entity — e.g. curtain opening %, room comfort score, custom automations, etc.

<img alt="Screenshot 2025-11-20 at 10 35 57 PM" src="https://github.com/user-attachments/assets/fbe975d7-d8f4-4972-9c2c-341b0231cc78" />


---

## ✨ Features

- **Single 0–100% Score**
  - Originally built for an **Air Quality Score** using Apollo AIR-1 sensors.
  - Can also be reused as a **generic percentage bar** for any metric (curtain opening, comfort index, health score, etc.).

- **Two input modes (helper or auto)**
  - Use an existing **number / input_number** helper via `pct_entity`, **or**
  - Let the card **calculate the air quality score automatically** from the AIR-1 sensor entities using `slug`.

- **Color-coded score bar**
  The bar at the bottom is color-coded (green → red) so you can see at a glance how good or bad the score is.

- **Optional mini temperature & humidity display**
  Tiny, subtle labels next to the title:
  - Read from `sensor.<slug>_sen55_temperature` / `sensor.<slug>_sen55_humidity`, **or**
  - Manually overridden via `temp_value` / `hum_value`, or hidden entirely.

- **Versatile beyond Apollo AIR-1**
  If you don’t use Apollo sensors at all, you can:
  - Provide your own `pct_entity`
  - Change `name` and `icon`
  - Set `show_temp: false` and `show_hum: false`  
  → and use the card as a clean, generic percentage indicator.

---

## 🧩 Prerequisites

This card is a standard JavaScript Lovelace resource. The only thing you need to know is the correct slug.

For example, if your AIR-1 device exposes entities like:
```yaml
sensor.apollo_air_max_sen55_temperature
sensor.apollo_air_max_sen55_humidity
sensor.apollo_air_max_co2
sensor.apollo_air_max_pm_2_5_m_weight_concentration
sensor.apollo_air_max_methane
sensor.apollo_air_max_ammonia
```

Then the correct slug is: **apollo_air_max**

### When using it with **Apollo AIR-1 (auto mode via `slug`)**

In this mode, the card computes the Air Quality Score internally.

### When using it for **other purposes**

You only need:

- A numeric entity (0–100), for example:
  - `number.livingroom_curtain_open`
  - `input_number.kids_room_score`
  - `sensor.custom_health_index`

The card will just display that value with the bar and optional temp/hum labels (which you can disable).

---

## 📦 Installation (short version for advanced users)

(If you are a beginner, scroll down to the full installation guide at the end of this README.)

1. Create a folder named `apollo` inside `/config/www`:

   `/config/www/apollo/`

2. Copy the file:

   `apollo-air-score-card.js` → `/config/www/apollo/apollo-air-score-card.js`

3. Add a Lovelace resource:

   - **URL:**  
     `/local/apollo/apollo-air-score-card.js`
   - **Resource type:**  
     `JavaScript Module`

Reload the browser (Ctrl+Shift+R / Cmd+Shift+R) after adding the resource.

---

## 🚀 Usage

The card supports two main usage patterns:

### 1. Automatic air quality scoring from `slug` (pessimistic model)

The card will compute the Air Quality Score internally using the same **pessimistic/normalized model** as the Jinja template described here:

`https://github.com/mdjuarez/ApolloAirAqi/tree/main`

Basic example:

```yaml
type: custom:apollo-air-score-card
name: AQI – Kitchen
slug: apollo_air_kitchen
```
In this mode, the card:

* Reads all relevant AIR-1 metrics using the slug

* Applies the pessimistic model (same thresholds and math as the template)

* Normalizes the result to a 0–100% score


### 2. Use an existing helper (pct_entity) – generic mode

If you already have a template sensor or helper that computes a percentage, or you simply want to use this card as a generic percentage bar (e.g. curtain opening), use:
```yaml
type: custom:apollo-air-score-card
name: Curtain Opening
icon: mdi:curtains
pct_entity: number.livingroom_curtain_open
show_temp: false
show_hum: false
```
In this mode:

* The card does not compute the score.

* It simply reads pct_entity and renders the percentage and bar.

* You can rename it and change the icon to match any use case.

* You can still combine both: use pct_entity for the score and use temp_value / hum_value as static or computed context labels.

##  ⚙️ Available options
| Option       | Required                      | Description |
|--------------|-------------------------------|-------------|
| **pct_entity** | ⚠️ Either this or `slug`       | Helper entity that contains the final score (0–100). Use this if you want to supply your own AQI or any percentage-based value. |
| **slug**       | ⚠️ Either this or `pct_entity` | Base name for Apollo AIR-1 entities. The card automatically reads `sensor.<slug>_co2`, `sensor.<slug>_pm_2_5_m_weight_concentration`, `sensor.<slug>_sen55_temperature`, etc., and computes the score using the pessimistic AQI model. |
| **name**       | ❌ Optional                    | Display name shown on the card. Default: `"Air Quality"`. |
| **icon**       | ❌ Optional                    | Icon shown in the circular badge. Default: `mdi:sprout`. |
| **show_temp**  | ❌ Optional                    | Show/hide the tiny temperature label. Default: `true`. |
| **show_hum**   | ❌ Optional                    | Show/hide the tiny humidity label. Default: `true`. |
| **temp_value** | ❌ Optional                    | Override for temperature. If set, this value appears instead of `sensor.<slug>_sen55_temperature`. |
| **hum_value**  | ❌ Optional                    | Override for humidity. If set, this value appears instead of `sensor.<slug>_sen55_humidity`. |
| **use_fahrenheit** | ❌ Optional | If set to `true`, the card displays temperature in °F. Internally, all score calculations still use °C. |

_Temperature is always read in °C internally, but you may display °F using use_fahrenheit: true.
_
## 🌡 Mini temperature & humidity examples
1) Read from slug (default AQ mode)
```yaml
type: custom:apollo-air-score-card
name: AQI – Kitchen
slug: apollo_air_kitchen
```

<img alt="Screenshot 2025-11-20 at 11 25 56 PM" src="https://github.com/user-attachments/assets/b509c41a-6bdc-4b50-b098-71bd77324be5" />



2) Hide humidity, keep temperature and use Farenheit
```yaml
type: custom:apollo-air-score-card
name: Living Room
icon: mdi:sofa
slug: apollo_air_living
show_hum: false
use_fahrenheit: true
```
<img alt="Screenshot 2025-11-20 at 11 28 11 PM" src="https://github.com/user-attachments/assets/b383992e-16cb-492d-a40d-b8bddd474c0d" />


3) Generic usage (curtains) with no temp/hum
```yaml
type: custom:apollo-air-score-card
name: Curtain Opening
icon: mdi:curtains
pct_entity: number.livingroom_curtain_open
show_temp: false
show_hum: false
```
<img alt="image" src="https://github.com/user-attachments/assets/e6590d5d-f4c2-4fe8-a95d-7f3deb0a48df" />


4) Custom score + manual temp/hum context
```yaml
type: custom:apollo-air-score-card
name: Office Comfort
icon: mdi:briefcase
pct_entity: number.office_comfort_score
temp_value: number.temp_entity
hum_value: number.hum_entity
```

<img width="503" height="193" alt="Screenshot 2025-11-20 at 11 33 43 PM" src="https://github.com/user-attachments/assets/5e771396-db70-4eb5-9838-581981a1d373" />

# ⚠️ Idea!

Use it together with **swipe-card** to flip between the score and the full Apollo AIR-1 view:

![aqi](https://github.com/user-attachments/assets/014013b9-d027-4c4b-8b48-421686bd376d)

Example:
```yaml
type: custom:swipe-card
cards:
  - type: custom:apollo-air-score-card
    slug: apollo_air_max
    name: Air Quality - Max
  - type: custom:apollo-air1-card
    slug: apollo_air_max
    icon: mdi:bed
    name: Max
```

Swipe card 👉 https://github.com/bramkragten/swipe-card

Apollo Air Card: 👉 https://github.com/mdjuarez/apollo-air-card

### ⚠️ Disclaimer

This card’s default air-quality score is not a medical or scientific certification.

I am not a scientist; the scoring logic is based on personal research, Apollo sensor behavior and AI-assisted experimentation.

The score is intended for home use and experimentation, not for safety-critical or clinical decisions.

You are encouraged to:

* Adjust the thresholds and scoring to your needs

* Build your own AQI helpers or models

* Open issues / PRs with improvements or ideas

* Always refer to official air-quality standards and local guidelines when making health-related decisions.

# 🧰 Beginner Installation Guide (Step-by-Step)

This guide explains how to install the **Apollo AIR-1 score card** even if you've never installed a custom card before.

---

### ✅ 1. Enable Advanced Mode in Home Assistant

1. Go to **your profile** (bottom left in Home Assistant)
2. Scroll down
3. Turn on **Advanced Mode**

This is required so you can access the “Resources” section later.

---

### ✅ 2. Open the `www` folder

The card must be placed inside the `www` folder of Home Assistant.

1. Go to **Settings → Add-ons**
2. Open **File Editor** or **Studio Code Server**  
   (if you don’t have one installed, install *File Editor* from the Add-on Store)
3. Navigate to: /config/
4. If you do NOT see a folder named **www**, create it:
   - Click **New Folder**
   - Name it: `www`

Your structure should now look like: /config/www/

### ✅ 3. Create the “apollo” folder inside `www`

Inside `/config/www/`, create a new folder: /config/www/apollo/

---

### ✅ 4. Upload the card file

Download or copy the file: apollo-air-score-card.js
Then put it inside: /config/www/apollo/apollo-air-score-card.js


---

### ✅ 5. Add the resource in Home Assistant

1. Go to **Settings → Dashboards**
2. Click the **three dots** in the top-right
3. Choose **Resources**
4. Click **Add Resource**
5. Fill in:

- **URL:**  
  `/local/apollo/apollo-air-score-card.js`
- **Resource type:**  
  `JavaScript Module`

6. Click **Create**

---

### ✅ 6. Reload the frontend (important)

To make sure the custom card loads:

- Press **CTRL + SHIFT + R**  
  _(or CMD + SHIFT + R on Mac)_

This forces a full refresh.

You can also go to:

**Developer Tools → YAML → Reload Resources**

---

### ✅ 7. Add the card to a dashboard

Go to the dashboard where you want to add it:

1. Click **Edit Dashboard**
2. Click **Add Card**
3. Choose **Manual card**
4. Paste the example:

```yaml
type: custom:apollo-air-score-card
slug: apollo_air_max
name: Max
```
