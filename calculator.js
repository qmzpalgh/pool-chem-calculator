const themeToggle = document.getElementById('themeToggle');
const darkMode = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(isDark) {
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    themeToggle.classList.toggle('active', isDark);
    themeToggle.setAttribute('aria-pressed', String(isDark));
}

const savedTheme = localStorage.getItem('theme');
setTheme(savedTheme ? savedTheme === 'dark' : darkMode.matches);

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'dark';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setTheme(isDark);
});

darkMode.addEventListener('change', (event) => {
    if (!localStorage.getItem('theme')) setTheme(event.matches);
});

const state = {
    facility: 'pelican',
    selectedFacility: 'pelican',
    pool: '660000',
    volume: 660000,
    direction: 'increase',
    selectedCalc: null,
    inputMemory: {}
};

const pools = {
    '660000': { chlorineRange: '1–2.5 mg/L' },
    '76000': { chlorineRange: '1–2.5 mg/L' },
    '12000': { chlorineRange: '3–4.5 mg/L' },
    '440000': { chlorineRange: '2–3.5 mg/L' },
    '15000': { chlorineRange: '2–3.5 mg/L' }
};

// Multipliers apply to mg/L change × litres / 1,000,000.
const calculations = {
    'alkalinity-up': {
        chemical: 'Sodium bicarbonate',
        multiplier: 1.68,
        unit: 'kg',
        color: 'chem-bicarb',
        note: 'Assumes pure sodium bicarbonate. Follow your site procedure and retest.'
    },
    'chlorine-up': {
        chemical: 'Sodium hypochlorite',
        multiplier: 8,
        unit: 'L',
        color: 'chem-hypo',
        note: 'Assumes 125 g/L available chlorine. Check the product strength and retest.'
    },
    'cya-up': {
        chemical: 'Cyanuric acid',
        multiplier: 1,
        unit: 'kg',
        color: 'chem-cya',
        note: 'Assumes pure cyanuric acid. For outdoor pools only; follow your site procedure and retest.'
    },
    'alkalinity-down': {
        chemical: 'Hydrochloric acid 33%',
        multiplier: 2,
        unit: 'L',
        color: 'chem-hcl',
        label: 'Estimated total, not a single dose',
        note: 'Acid can sharply lower pH. Follow your site procedure and retest pH and alkalinity between additions.'
    },
    'chlorine-down': {
        chemical: 'Sodium thiosulphate',
        multiplier: 1,
        unit: 'kg',
        color: 'chem-thio',
        note: 'Overdosing can prevent a chlorine residual. Check your product dosage and retest before reopening.'
    },
    'ph-up': {
        notice: 'pH doses depend on alkalinity and other water chemistry. Use a base demand test and follow your site procedure.'
    },
    'ph-down': {
        notice: 'pH doses depend on alkalinity and other water chemistry. Use an acid demand test and follow your site procedure.'
    }
};

const facilityButtons = document.querySelectorAll('[data-facility]');
const poolButtons = document.querySelectorAll('[data-pool]');
const directionButtons = document.querySelectorAll('[data-direction]');
const calcButtons = document.querySelectorAll('[data-calc]');
const pelicanPools = document.getElementById('pelicanPools');
const cribpointPools = document.getElementById('cribpointPools');
const customVolumeGroup = document.getElementById('customVolumeGroup');
const customVolume = document.getElementById('customVolume');
const poolVolume = document.getElementById('poolVolume');
const cyaButton = document.getElementById('cyaButton');
const increaseOptions = document.getElementById('increaseOptions');
const decreaseOptions = document.getElementById('decreaseOptions');
const calculatorInputs = document.getElementById('calculatorInputs');
const calculationNotice = document.getElementById('calculationNotice');
const currentValue = document.getElementById('currentValue');
const targetValue = document.getElementById('targetValue');
const currentValueLabel = document.querySelector('label[for="currentValue"]');
const targetValueLabel = document.querySelector('label[for="targetValue"]');
const targetHint = document.getElementById('targetHint');
const result = document.getElementById('result');
const resultLabel = document.getElementById('resultLabel');
const resultValue = document.getElementById('resultValue');
const resultUnit = document.getElementById('resultUnit');
const resultChemical = document.getElementById('resultChemical');
const resultNote = document.getElementById('resultNote');
const colorClasses = ['chem-bicarb', 'chem-hypo', 'chem-cya', 'chem-hcl', 'chem-thio'];

function selectButton(buttons, selected) {
    buttons.forEach((button) => {
        const active = button === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

selectButton(facilityButtons, document.querySelector('[data-facility="pelican"]'));
selectButton(poolButtons, pelicanPools.querySelector('[data-pool="660000"]'));
selectButton(directionButtons, document.querySelector('[data-direction="increase"]'));
selectButton(calcButtons, null);

facilityButtons.forEach((button) => button.addEventListener('click', () => {
    const facility = button.dataset.facility;
    if (facility === state.facility) return;

    state.facility = facility;
    customVolume.value = '';
    selectButton(facilityButtons, button);
    pelicanPools.classList.toggle('hidden', facility !== 'pelican');
    cribpointPools.classList.toggle('hidden', facility !== 'cribpoint');
    cyaButton.classList.toggle('hidden', facility !== 'cribpoint');

    const visiblePools = facility === 'pelican' ? pelicanPools : cribpointPools;
    visiblePools.querySelector('[data-pool]').click();
}));

poolButtons.forEach((button) => button.addEventListener('click', () => {
    const pool = button.dataset.pool;
    const poolChanged = state.pool !== pool || state.selectedFacility !== state.facility;

    if (poolChanged) {
        // Readings from one pool must not be used to dose another.
        state.inputMemory = {};
        currentValue.value = '';
        targetValue.value = '';
    }

    state.pool = pool;
    state.selectedFacility = state.facility;
    selectButton(poolButtons, button);
    const isCustom = pool === 'custom';
    customVolumeGroup.classList.toggle('hidden', !isCustom);
    poolVolume.classList.toggle('hidden', isCustom);
    state.volume = isCustom ? customVolume.valueAsNumber : Number(pool);

    if (!isCustom) poolVolume.textContent = state.volume.toLocaleString('en-AU') + ' L';

    if (state.selectedCalc === 'cya-up' && state.facility !== 'cribpoint') {
        resetCalculator();
    } else {
        updateTargetHint();
        calculate();
    }
}));

customVolume.addEventListener('input', () => {
    state.volume = customVolume.valueAsNumber;
    calculate();
});

directionButtons.forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.direction;
    if (direction === state.direction) return;

    state.direction = direction;
    selectButton(directionButtons, button);
    increaseOptions.classList.toggle('hidden', direction !== 'increase');
    decreaseOptions.classList.toggle('hidden', direction !== 'decrease');

    if (state.selectedCalc) {
        const base = getBaseName(state.selectedCalc);
        const nextCalc = base + (direction === 'increase' ? '-up' : '-down');
        const nextButton = document.querySelector(`[data-calc="${nextCalc}"]`);
        if (nextButton && !nextButton.classList.contains('hidden')) {
            nextButton.click();
            return;
        }
    }
    resetCalculator();
}));

calcButtons.forEach((button) => button.addEventListener('click', () => {
    const previousBase = state.selectedCalc ? getBaseName(state.selectedCalc) : null;
    state.selectedCalc = button.dataset.calc;
    const base = getBaseName(state.selectedCalc);
    const config = calculations[state.selectedCalc];
    selectButton(calcButtons, button);

    if (previousBase !== base) {
        const saved = state.inputMemory[base] || { current: '', target: '' };
        currentValue.value = saved.current;
        targetValue.value = saved.target;
    }

    calculatorInputs.classList.toggle('hidden', Boolean(config.notice));
    calculationNotice.classList.toggle('hidden', !config.notice);
    calculationNotice.textContent = config.notice || '';
    updateTargetHint();
    calculate();
}));

[currentValue, targetValue].forEach((input) => input.addEventListener('input', () => {
    if (state.selectedCalc) {
        state.inputMemory[getBaseName(state.selectedCalc)] = {
            current: currentValue.value,
            target: targetValue.value
        };
    }
    calculate();
}));

currentValue.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') targetValue.focus();
});
targetValue.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') targetValue.blur();
});

function getBaseName(calc) {
    return calc.replace(/-(up|down)$/, '');
}

function updateTargetHint() {
    if (!state.selectedCalc) return;
    const base = getBaseName(state.selectedCalc);
    currentValueLabel.textContent = 'Current (mg/L)';
    targetValueLabel.textContent = 'Target (mg/L)';

    if (base === 'alkalinity') {
        targetHint.textContent = 'Reference: 80–120 mg/L as CaCO₃.';
    } else if (base === 'chlorine') {
        const pool = pools[state.pool];
        targetHint.textContent = pool
            ? `Pool reference: ${pool.chlorineRange}.`
            : 'Choose a target using your site procedure.';
    } else if (base === 'cya') {
        targetHint.textContent = 'Victoria: ideally at or below 30 mg/L; maximum 100 mg/L.';
    }
}

function calculate() {
    const config = calculations[state.selectedCalc];
    if (!config || config.notice) {
        hideResult();
        return;
    }

    if (currentValue.value === '' || targetValue.value === '') {
        hideResult();
        return;
    }

    const current = currentValue.valueAsNumber;
    const target = targetValue.valueAsNumber;

    if (!Number.isFinite(state.volume) || state.volume <= 0) {
        showMessage('Enter a pool volume greater than zero.');
        return;
    }
    if (!Number.isFinite(current) || !Number.isFinite(target) || current < 0 || target < 0) {
        showMessage('Enter valid, non-negative readings.');
        return;
    }
    if (getBaseName(state.selectedCalc) === 'cya' && target > 100) {
        showMessage('The CYA target cannot exceed 100 mg/L.');
        return;
    }
    if (current === target) {
        showMessage('Current and target are the same.', 'No adjustment needed');
        return;
    }
    if (state.direction === 'increase' && target < current) {
        showMessage('To increase, the target must be higher than the current reading.');
        return;
    }
    if (state.direction === 'decrease' && target > current) {
        showMessage('To decrease, the target must be lower than the current reading.');
        return;
    }

    const amount = (Math.abs(target - current) / 1000000) * state.volume * config.multiplier;
    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage('These values cannot be calculated. Check your inputs.');
        return;
    }

    const smallAmount = amount < 1;
    const displayAmount = smallAmount ? amount * 1000 : amount;
    const displayUnit = smallAmount ? (config.unit === 'kg' ? 'g' : 'mL') : config.unit;

    result.classList.remove('mismatch', ...colorClasses);
    result.classList.add(config.color, 'show');
    resultLabel.textContent = config.label || 'Estimated amount';
    resultValue.textContent = smallAmount
        ? displayAmount.toLocaleString('en-AU', { maximumSignificantDigits: 3 })
        : displayAmount.toFixed(2);
    resultUnit.textContent = displayUnit;
    resultChemical.textContent = config.chemical;
    resultNote.textContent = config.note;
}

function showMessage(message, label = 'Check values') {
    result.classList.remove(...colorClasses);
    result.classList.add('mismatch', 'show');
    resultLabel.textContent = label;
    resultValue.textContent = message;
    resultUnit.textContent = '';
    resultChemical.textContent = '';
    resultNote.textContent = '';
}

function hideResult() {
    result.classList.remove('show', 'mismatch', ...colorClasses);
}

function resetCalculator() {
    state.selectedCalc = null;
    selectButton(calcButtons, null);
    calculatorInputs.classList.add('hidden');
    calculationNotice.classList.add('hidden');
    currentValue.value = '';
    targetValue.value = '';
    hideResult();
}
