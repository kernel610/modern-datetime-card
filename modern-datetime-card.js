class ModernDatetimeCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hour = 12;
    this._minute = 0;
    this._isPM = false;
    this._date = null;
    this._dirty = false;
    this._repeatTimer = null;
    this._repeatDelay = null;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an "entity" (an input_datetime.* entity)');
    }
    this._config = {
      entity: config.entity,
      name: config.name,
      icon: config.icon || 'mdi:clock-outline',
      minute_step: Number(config.minute_step) || 1,
      accent_color: config.accent_color || null,
      show_title: config.show_title !== false,
      show_icon: config.show_icon !== false,
      title_alignment: config.title_alignment || 'left',
    };
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this._config.entity];

    if (!stateObj) {
      this.shadowRoot.innerHTML = `
        <ha-card><div style="padding:16px;color:var(--error-color,#db4437);">
          Entity not found: ${this._config.entity}
        </div></ha-card>`;
      this._built = false;
      return;
    }

    this._stateObj = stateObj;

    if (!this._built) {
      this._buildDom();
      this._built = true;
    }

    if (!this._dirty) {
      this._syncFromState(stateObj);
    }

    this._updateDisplay();
  }

  _syncFromState(stateObj) {
    const a = stateObj.attributes;
    this._hasTime = !!a.has_time;
    this._hasDate = !!a.has_date;

    if (this._hasTime) {
      const h = a.hour ?? 0;
      this._minute = a.minute ?? 0;
      this._isPM = h >= 12;
      const h12 = h % 12;
      this._hour = h12 === 0 ? 12 : h12;
    }
    if (this._hasDate) {
      const y = a.year, mo = a.month, d = a.day;
      this._date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  _buildDom() {
    const accent = this._config.accent_color || 'var(--primary-color)';
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          container-type: inline-size;
          padding: 14px 14px 16px;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color);
          min-width: 0;
        }
        .header.hidden { display: none; }
        .header.align-left { justify-content: flex-start; }
        .header.align-center { justify-content: center; }
        .header.align-right { justify-content: flex-end; }
        .header ha-icon {
          color: ${accent};
          --mdc-icon-size: 18px;
          flex-shrink: 0;
        }
        .header ha-icon.hidden,
        .header span.hidden { display: none; }
        #name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .time-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          margin-bottom: 14px;
        }
        .time-row.hidden { display: none; }
        .stepper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          user-select: none;
          min-width: 0;
        }
        .step-btn {
          width: 34px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: var(--secondary-background-color, #f2f2f2);
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: manipulation;
          flex-shrink: 0;
        }
        .step-btn ha-icon { --mdc-icon-size: 18px; }
        .step-btn:active { background: var(--divider-color, #e0e0e0); }
        .digit {
          font-size: 26px;
          font-weight: 500;
          min-width: 44px;
          text-align: center;
          color: var(--primary-text-color);
          font-variant-numeric: tabular-nums;
        }
        .colon {
          font-size: 26px;
          font-weight: 500;
          color: var(--secondary-text-color);
          padding-bottom: 34px;
          flex-shrink: 0;
        }
        .ampm {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-left: 4px;
          flex-shrink: 0;
        }
        .ampm button {
          width: 38px;
          height: 26px;
          border-radius: 8px;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color);
          color: var(--secondary-text-color);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          touch-action: manipulation;
        }
        .ampm button.active {
          background: ${accent};
          border-color: ${accent};
          color: var(--text-primary-color, #fff);
        }
        @container (min-width: 320px) {
          .step-btn { width: 44px; height: 36px; }
          .step-btn ha-icon { --mdc-icon-size: 20px; }
          .digit { font-size: 38px; min-width: 62px; }
          .colon { font-size: 38px; padding-bottom: 46px; }
          .ampm button { width: 54px; height: 36px; font-size: 13px; }
          .ampm { margin-left: 8px; gap: 6px; }
          .time-row { gap: 6px; }
        }
        .date-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: var(--secondary-background-color, #f2f2f2);
          margin-bottom: 14px;
          position: relative;
        }
        .date-row.hidden { display: none; }
        .date-row ha-icon {
          --mdc-icon-size: 18px;
          color: var(--secondary-text-color);
          flex-shrink: 0;
        }
        .date-row input[type="date"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          width: 100%;
          height: 100%;
          border: none;
          cursor: pointer;
        }
        .date-label {
          font-size: 13px;
          color: var(--primary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .set-btn {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: none;
          background: ${accent};
          color: var(--text-primary-color, #fff);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          touch-action: manipulation;
          transition: transform 0.1s ease;
        }
        .set-btn:active { transform: scale(0.98); }
        .set-btn.confirmed { background: var(--success-color, #4caf50); }
        .set-btn.hidden { display: none; }
      </style>
      <ha-card>
        <div class="header" id="header">
          <ha-icon id="icon"></ha-icon>
          <span id="name"></span>
        </div>

        <div class="time-row" id="time-row">
          <div class="stepper">
            <button class="step-btn" id="hour-up" aria-label="Increase hour"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
            <div class="digit" id="hour-display">12</div>
            <button class="step-btn" id="hour-down" aria-label="Decrease hour"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
          </div>
          <div class="colon">:</div>
          <div class="stepper">
            <button class="step-btn" id="min-up" aria-label="Increase minute"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
            <div class="digit" id="min-display">00</div>
            <button class="step-btn" id="min-down" aria-label="Decrease minute"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
          </div>
          <div class="ampm">
            <button id="am-btn">AM</button>
            <button id="pm-btn">PM</button>
          </div>
        </div>

        <div class="date-row" id="date-row">
          <ha-icon icon="mdi:calendar"></ha-icon>
          <span class="date-label" id="date-label"></span>
          <input type="date" id="date-input" />
        </div>

        <button class="set-btn" id="set-btn">Set</button>
      </ha-card>
    `;

    const root = this.shadowRoot;
    root.getElementById('hour-up').addEventListener('click', () => this._changeHour(1));
    root.getElementById('hour-down').addEventListener('click', () => this._changeHour(-1));
    root.getElementById('min-up').addEventListener('click', () => this._changeMinute(1));
    root.getElementById('min-down').addEventListener('click', () => this._changeMinute(-1));
    root.getElementById('am-btn').addEventListener('click', () => this._setAmPm(false));
    root.getElementById('pm-btn').addEventListener('click', () => this._setAmPm(true));
    root.getElementById('date-input').addEventListener('change', (e) => this._onDateChange(e));
    root.getElementById('set-btn').addEventListener('click', () => this._commit());

    this._attachHold(root.getElementById('hour-up'), () => this._changeHour(1));
    this._attachHold(root.getElementById('hour-down'), () => this._changeHour(-1));
    this._attachHold(root.getElementById('min-up'), () => this._changeMinute(1));
    this._attachHold(root.getElementById('min-down'), () => this._changeMinute(-1));
  }

  _attachHold(el, fn) {
    const start = (e) => {
      e.preventDefault();
      this._repeatDelay = setTimeout(() => {
        this._repeatTimer = setInterval(fn, 90);
      }, 400);
    };
    const stop = () => {
      clearTimeout(this._repeatDelay);
      clearInterval(this._repeatTimer);
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointerleave', stop);
    el.addEventListener('pointercancel', stop);
  }

  _pad(n) { return String(n).padStart(2, '0'); }

  _changeHour(delta) {
    this._hour += delta;
    if (this._hour > 12) this._hour = 1;
    if (this._hour < 1) this._hour = 12;
    this._dirty = true;
    this._updateDisplay();
  }

  _changeMinute(delta) {
    const step = this._config.minute_step;
    this._minute += delta * step;
    if (this._minute >= 60) this._minute = 0;
    if (this._minute < 0) this._minute = 60 - step;
    this._dirty = true;
    this._updateDisplay();
  }

  _setAmPm(pm) {
    this._isPM = pm;
    this._dirty = true;
    this._updateDisplay();
  }

  _onDateChange(e) {
    this._date = e.target.value;
    this._dirty = true;
    this._updateDisplay();
  }

  _updateDisplay() {
    const root = this.shadowRoot;
    if (!root.getElementById('name')) return;

    const header = root.getElementById('header');
    const iconEl = root.getElementById('icon');
    const nameEl = root.getElementById('name');
    const showIcon = this._config.show_icon;
    const showTitle = this._config.show_title;

    iconEl.classList.toggle('hidden', !showIcon);
    nameEl.classList.toggle('hidden', !showTitle);
    header.classList.toggle('hidden', !showIcon && !showTitle);
    header.classList.remove('align-left', 'align-center', 'align-right');
    header.classList.add(`align-${this._config.title_alignment}`);

    if (showTitle) {
      nameEl.textContent =
        this._config.name || this._stateObj.attributes.friendly_name || this._config.entity;
    }
    if (showIcon) {
      iconEl.setAttribute(
        'icon',
        this._config.icon || this._stateObj.attributes.icon || 'mdi:clock-outline'
      );
    }

    const timeRow = root.getElementById('time-row');
    const dateRow = root.getElementById('date-row');
    timeRow.classList.toggle('hidden', !this._hasTime);
    dateRow.classList.toggle('hidden', !this._hasDate);

    if (this._hasTime) {
      root.getElementById('hour-display').textContent = this._pad(this._hour);
      root.getElementById('min-display').textContent = this._pad(this._minute);
      root.getElementById('am-btn').classList.toggle('active', !this._isPM);
      root.getElementById('pm-btn').classList.toggle('active', this._isPM);
    }

    if (this._hasDate && this._date) {
      const dateInput = root.getElementById('date-input');
      if (dateInput.value !== this._date) dateInput.value = this._date;
      const d = new Date(this._date + 'T00:00:00');
      root.getElementById('date-label').textContent = d.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
    }

    root.getElementById('set-btn').classList.toggle('hidden', !this._suppressHide && this._matchesState());
  }

  _matchesState() {
    if (!this._stateObj) return true;
    const a = this._stateObj.attributes;

    if (this._hasTime) {
      const entityHour = a.hour ?? 0;
      const entityMinute = a.minute ?? 0;
      let h24 = this._hour % 12;
      if (this._isPM) h24 += 12;
      if (h24 !== entityHour || this._minute !== entityMinute) return false;
    }
    if (this._hasDate) {
      const entityDate = `${a.year}-${this._pad(a.month)}-${this._pad(a.day)}`;
      if (this._date !== entityDate) return false;
    }
    return true;
  }

  _commit() {
    if (!this._hass || !this._stateObj) return;
    const serviceData = { entity_id: this._config.entity };

    if (this._hasTime) {
      let h24 = this._hour % 12;
      if (this._isPM) h24 += 12;
      serviceData.time = `${this._pad(h24)}:${this._pad(this._minute)}:00`;
    }
    if (this._hasDate && this._date) {
      serviceData.date = this._date;
    }

    this._hass.callService('input_datetime', 'set_datetime', serviceData);
    this._dirty = false;
    this._flashConfirm();
  }

  _flashConfirm() {
    const btn = this.shadowRoot.getElementById('set-btn');
    if (!btn) return;
    const original = btn.textContent;
    this._suppressHide = true;
    btn.textContent = 'Updated';
    btn.classList.add('confirmed');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('confirmed');
      this._suppressHide = false;
      this._updateDisplay();
    }, 1200);
  }

  static getStubConfig(hass) {
    const entities = Object.keys(hass.states).filter((e) => e.startsWith('input_datetime.'));
    return {
      entity: entities[0] || '',
      name: '',
      minute_step: 1,
      show_title: true,
      show_icon: true,
      title_alignment: 'left',
    };
  }

  static getConfigElement() {
    return document.createElement('modern-datetime-card-editor');
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('modern-datetime-card', ModernDatetimeCard);

class ModernDatetimeCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      show_title: true,
      show_icon: true,
      title_alignment: 'left',
      minute_step: 1,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  get _schema() {
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'input_datetime' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
      { name: 'show_title', selector: { boolean: {} } },
      { name: 'show_icon', selector: { boolean: {} } },
      {
        name: 'title_alignment',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ],
          },
        },
      },
      { name: 'minute_step', selector: { number: { min: 1, max: 30, mode: 'box' } } },
      { name: 'accent_color', selector: { text: {} } },
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;

    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
      this.appendChild(this._form);
    }

    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = this._schema;
    this._form.computeLabel = (schema) => {
      const labels = {
        entity: 'Entity',
        name: 'Name',
        icon: 'Icon',
        show_title: 'Show title',
        show_icon: 'Show icon',
        title_alignment: 'Title alignment',
        minute_step: 'Minute step',
        accent_color: 'Accent color',
      };
      return labels[schema.name] || schema.name;
    };
    this._form.computeHelper = (schema) => {
      const helpers = {
        entity: 'An input_datetime entity',
        name: 'Overrides the entity\u2019s friendly name',
        icon: 'Overrides the entity\u2019s icon',
        show_title: 'Turn off to hide the title text',
        show_icon: 'Turn off to hide the header icon',
        title_alignment: 'Aligns the header row (icon and/or title)',
        minute_step: 'How many minutes each tap adjusts by (default 1)',
        accent_color: 'Any CSS color, defaults to your theme\u2019s primary color',
      };
      return helpers[schema.name] || '';
    };
  }

  _valueChanged(ev) {
    this._config = ev.detail.value;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('modern-datetime-card-editor', ModernDatetimeCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'modern-datetime-card',
  name: 'Modern Date/Time Card',
  description: 'A modern, touch-friendly date/time picker for input_datetime entities.',
});
