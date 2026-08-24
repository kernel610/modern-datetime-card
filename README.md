# Modern Date/Time Card

A touch-friendly Lovelace card for Home Assistant `input_datetime` entities. Instead of the stock more-info dialog, it puts a large hour/minute stepper with an AM/PM toggle (and an optional date picker) right on the dashboard, styled to match your HA theme.

## Features

- Big buttons for hour, minute, and AM/PM — built for touchscreens (wall tablets, phones)
- Press-and-hold on the steppers to auto-repeat
- Date picker only shows up for entities that actually have a date component (`has_date`); time-only entities skip it automatically
- The **Set** button only appears once the displayed value differs from the entity's actual value — nothing to tap if there's nothing to change
- Configurable title, icon, title alignment (left/center/right), minute step size, and accent color
- Full GUI editor — no YAML required
- Responsive: scales itself down automatically in narrow layouts (e.g. 2-column mobile dashboards) via CSS container queries

## Installation

1. Copy `modern-datetime-card.js` into `config/www/` in your Home Assistant instance.
2. In Home Assistant, go to **Settings → Dashboards → ⋮ (top right) → Resources → Add Resource**.
   - URL: `/local/modern-datetime-card.js`
   - Resource type: **JavaScript Module**
3. Refresh your browser (hard refresh if you've installed this before and are updating — see note below).

## Usage

Add the card through the UI: **Add Card → Modern Date/Time Card**, then pick an `input_datetime` entity in the visual editor. Or use YAML:

```yaml
type: custom:modern-datetime-card
entity: input_datetime.wake_up_time
name: Wake up time
icon: mdi:alarm
minute_step: 5
show_title: true
show_icon: true
title_alignment: left
```

## Configuration options

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | *required* | An `input_datetime.*` entity |
| `name` | string | entity's friendly name | Overrides the title |
| `icon` | string | entity's icon, or `mdi:clock-outline` | Overrides the header icon |
| `show_title` | boolean | `true` | Show/hide the title text |
| `show_icon` | boolean | `true` | Show/hide the header icon |
| `title_alignment` | string | `left` | `left`, `center`, or `right` |
| `minute_step` | number | `1` | Minutes adjusted per tap |
| `accent_color` | string | your theme's `--primary-color` | Any CSS color |

## License

MIT — see [LICENSE](LICENSE).
