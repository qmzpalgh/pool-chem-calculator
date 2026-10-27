// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.classList.add('active');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.classList.remove('active');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.classList.add('active');
        localStorage.setItem('theme', 'dark');
    }
}

themeToggle.addEventListener('click', toggleTheme);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        if (e.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.classList.add('active');
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.classList.remove('active');
        }
    }
});

// Initialize theme on page load
initTheme();

// State
const CALC_SUFFIX_PATTERN = /-up$|-down$/;
const ONE_MILLION = 1000000;

let state = {
    poolVolume: 660000,
    poolType: 'pelican',
    selectedCalc: null,
    selectedChemical: null,
    direction: 'increase',
    inputMemory: {} // Stores {calcBaseName: {current: value, target: value}}
};

// Pool configurations
const pools = {
    '660000': { type: 'pelican', name: 'Main Pool - Pelican Park', chlorineRange: '1-2.5 mg/L' },
    '76000': { type: 'pelican', name: 'Leisure Pool - Pelican Park', chlorineRange: '1-2.5 mg/L' },
    '12000': { type: 'pelican', name: 'Spa - Pelican Park', chlorineRange: '3-4.5 mg/L' },
    '440000': { type: 'cribpoint', name: 'Main Pool - Crib Point', chlorineRange: '2-3.5 mg/L' },
    '15000': { type: 'cribpoint', name: 'Leisure Pool - Crib Point', chlorineRange: '2-3.5 mg/L' }
};

// Target ranges for each calculation type
const targetRanges = {
    'alkalinity': '80-120 mg/L',
    'ph': '7.35',
    'chlorine': null, // Dynamic - uses pool's chlorineRange
    'cya': '30-100 mg/L',
    'calcium': '200-400 mg/L'
};

// Chemical to color class mapping
const chemicalColors = {
    'Sodium Bicarbonate': 'chem-bicarb',
    'Sodium Hypochlorite 12.5%': 'chem-hypo',
    'Isocyanuric Acid': 'chem-cya',
    'HCl 33%': 'chem-hcl',
    'Sodium Thiosulphate': 'chem-thio'
};

// Chemical calculations
const calculations = {
    'alkalinity-up': {
        label: 'Increase Alkalinity',
        chemical: 'Sodium Bicarbonate',
        multiplier: 2,
        unit: 'kg'
    },
    'chlorine-up': {
        label: 'Increase Free Chlorine',
        chemical: 'Sodium Hypochlorite 12.5%',
        multiplier: 8,
        unit: 'L'
    },
    'cya-up': {
        label: 'Increase CYA',
        chemical: 'Isocyanuric Acid',
        multiplier: 1,
        unit: 'kg'
    },
    'ph-up': {
        label: 'Increase pH',
        chemical: 'Sodium Bicarbonate',
        multiplier: 800,
        unit: 'kg'
    },
    'alkalinity-down': {
        label: 'Decrease Alkalinity',
        chemical: 'HCl 33%',
        multiplier: 2,
        unit: 'L'
    },
    'chlorine-down': {
        label: 'Decrease Free Chlorine',
        chemical: 'Sodium Thiosulphate',
        multiplier: 1,
        unit: 'kg'
    },
    'ph-down': {
        label: 'Decrease pH',
        chemical: 'HCl 33%',
        multiplier: 0.833,
        unit: 'L'
    }
};

// DOM elements
const facilityButtons = document.querySelectorAll('[data-facility]');
const pelicanPools = document.getElementById('pelicanPools');
const cribpointPools = document.getElementById('cribpointPools');
const customVolumeGroup = document.getElementById('customVolumeGroup');
const customVolume = document.getElementById('customVolume');
const poolVolume = document.getElementById('poolVolume');
const cyaButton = document.getElementById('cyaButton');
const directionToggleButtons = document.querySelectorAll('[data-direction]');
const decreaseButton = document.querySelector('[data-direction="decrease"]');
const increaseOptions = document.getElementById('increaseOptions');
const decreaseOptions = document.getElementById('decreaseOptions');
const calcButtons = document.querySelectorAll('[data-calc]');
const calculatorInputs = document.getElementById('calculatorInputs');
const chemicalOptions = document.getElementById('chemicalOptions');
const currentValue = document.getElementById('currentValue');
const targetValue = document.getElementById('targetValue');
const currentValueLabel = document.querySelector('label[for="currentValue"]');
const targetValueLabel = document.querySelector('label[for="targetValue"]');
const result = document.getElementById('result');
const resultValue = document.getElementById('resultValue');
const resultUnit = document.getElementById('resultUnit');
const resultChemical = document.getElementById('resultChemical');
const chemicalColorClasses = Object.values(chemicalColors);

// Event listeners
facilityButtons.forEach(btn => btn.addEventListener('click', handleFacilityToggle));
customVolume.addEventListener('input', handleCustomVolumeChange);
directionToggleButtons.forEach(btn => btn.addEventListener('click', handleDirectionToggle));
calcButtons.forEach(btn => btn.addEventListener('click', handleCalcSelection));
currentValue.addEventListener('input', handleInputChange);
targetValue.addEventListener('input', handleInputChange);

// Add keyboard support for Enter key
currentValue.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') targetValue.focus();
});
targetValue.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') e.target.blur();
});

function handleInputChange() {
    // Save to memory for current calculation
    if (state.selectedCalc) {
        const baseName = getCalcBaseName(state.selectedCalc);
        state.inputMemory[baseName] = {
            current: currentValue.value,
            target: targetValue.value
        };
    }
    calculate();
}

// Add pool button event listeners dynamically
function attachPoolListeners() {
    document.querySelectorAll('[data-pool]').forEach(btn => {
        btn.addEventListener('click', handlePoolClick);
    });
}
attachPoolListeners();

function handleFacilityToggle(e) {
    const facility = e.target.dataset.facility;

    // Update facility toggle active states
    facilityButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Show/hide appropriate pool options
    if (facility === 'pelican') {
        pelicanPools.classList.remove('hidden');
        cribpointPools.classList.add('hidden');
        state.poolType = 'pelican';
        cyaButton.classList.add('hidden');
    } else {
        pelicanPools.classList.add('hidden');
        cribpointPools.classList.remove('hidden');
        state.poolType = 'cribpoint';
        cyaButton.classList.remove('hidden');
    }

    // Click the first pool button in the visible set
    const visiblePools = facility === 'pelican' ? pelicanPools : cribpointPools;
    const firstPoolButton = visiblePools.querySelector('[data-pool]:not([data-pool="custom"])');
    if (firstPoolButton) {
        firstPoolButton.click();
    }
}

function handlePoolClick(e) {
    const value = e.target.dataset.pool;
    const parentGrid = e.target.closest('.calculation-grid');

    // Update button active states within the same grid
    parentGrid.querySelectorAll('[data-pool]').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    if (value === 'custom') {
        customVolumeGroup.classList.remove('hidden');
        poolVolume.style.display = 'none';
        state.poolType = 'custom';
    } else {
        customVolumeGroup.classList.add('hidden');
        poolVolume.style.display = 'block';
        state.poolVolume = parseInt(value);
        state.poolType = pools[value].type;
        poolVolume.textContent = formatNumber(state.poolVolume) + ' L';

        // Show/hide CYA option for Crib Point pools
        if (state.poolType === 'cribpoint') {
            cyaButton.classList.remove('hidden');
        } else {
            cyaButton.classList.add('hidden');
        }
    }

    calculate();
}

function handleCustomVolumeChange(e) {
    const value = parseInt(e.target.value) || 0;
    state.poolVolume = value;
    calculate();
}

function handleDirectionToggle(e) {
    const direction = e.target.dataset.direction;
    const previousCalc = state.selectedCalc;
    state.direction = direction;

    // Update active toggle
    directionToggleButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Show/hide option sets
    if (direction === 'increase') {
        increaseOptions.classList.remove('hidden');
        decreaseOptions.classList.add('hidden');
    } else {
        increaseOptions.classList.add('hidden');
        decreaseOptions.classList.remove('hidden');
    }

    // Try to preserve selection if equivalent exists in new direction
    if (previousCalc) {
        const baseName = getCalcBaseName(previousCalc);
        const newCalc = baseName + (direction === 'increase' ? '-up' : '-down');
        const newButton = document.querySelector(`[data-calc="${newCalc}"]`);

        if (newButton && !newButton.classList.contains('hidden')) {
            newButton.click();
            return;
        }
    }

    // Reset if no equivalent found
    resetCalculator();
}

function handleCalcSelection(e) {
    const calcType = e.target.dataset.calc;
    const previousCalc = state.selectedCalc;
    state.selectedCalc = calcType;

    // Update active button
    calcButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Show inputs
    calculatorInputs.classList.remove('hidden');

    // Hide decrease button for CYA (cannot decrease CYA chemically)
    const baseName = getCalcBaseName(calcType);
    if (baseName === 'cya') {
        decreaseButton.classList.add('hidden');
    } else {
        decreaseButton.classList.remove('hidden');
    }

    // Handle input values - restore from memory or clear
    const previousBase = previousCalc ? getCalcBaseName(previousCalc) : null;
    const currentBase = baseName;
    if (previousBase !== currentBase) {
        // Check if we have saved values for this calculation type
        const savedValues = state.inputMemory[currentBase];
        if (savedValues) {
            currentValue.value = savedValues.current;
            targetValue.value = savedValues.target;
        } else {
            currentValue.value = '';
            targetValue.value = '';
        }
        result.classList.remove('show', 'mismatch');
    }

    // Update input labels based on calculation type
    const isPH = baseName === 'ph';

    // Get target range for this calculation type
    let range = targetRanges[baseName];
    if (baseName === 'chlorine') {
        // Use pool-specific chlorine range
        const poolConfig = pools[state.poolVolume];
        range = poolConfig ? poolConfig.chlorineRange : '1-2.5 mg/L';
    }

    currentValueLabel.textContent = isPH ? 'Current' : 'Current (mg/L)';
    targetValueLabel.textContent = `Target (${range})`;

    // Handle chemical options
    const calc = calculations[calcType];
    if (calc.options) {
        showChemicalOptions(calc.options);
    } else {
        chemicalOptions.classList.add('hidden');
        state.selectedChemical = {
            chemical: calc.chemical,
            multiplier: calc.multiplier,
            unit: calc.unit
        };
    }

    calculate();
}

function showChemicalOptions(options) {
    chemicalOptions.classList.remove('hidden');
    chemicalOptions.innerHTML = '<div class="toggle-group" id="chemicalToggle"></div>';

    const toggleGroup = chemicalOptions.querySelector('#chemicalToggle');
    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'toggle-option' + (index === 0 ? ' active' : '');
        btn.textContent = option.chemical;
        btn.dataset.index = index;
        btn.addEventListener('click', (e) => {
            toggleGroup.querySelectorAll('.toggle-option').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.selectedChemical = option;
            calculate();
        });
        toggleGroup.appendChild(btn);
    });

    state.selectedChemical = options[0];
}

function calculate() {
    if (!state.selectedCalc || !state.selectedChemical) {
        result.classList.remove('show', 'mismatch');
        return;
    }

    if (currentValue.value === '' || targetValue.value === '') {
        result.classList.remove('show', 'mismatch');
        return;
    }

    const current = parseFloat(currentValue.value);
    const target = parseFloat(targetValue.value);

    // Check if direction matches the values
    const baseName = getCalcBaseName(state.selectedCalc);
    const paramName = baseName === 'ph' ? 'pH' :
                     baseName === 'cya' ? 'CYA' :
                     baseName.charAt(0).toUpperCase() + baseName.slice(1);

    if (state.direction === 'increase' && target <= current) {
        showMismatchMessage(`Target ${paramName} must be higher than current to increase`);
        return;
    }
    if (state.direction === 'decrease' && current <= target) {
        showMismatchMessage(`Current ${paramName} must be higher than target to decrease`);
        return;
    }

    // Formula: (|target - current| / 1,000,000) × poolVolume × multiplier
    const diff = Math.abs(target - current);
    const amount = (diff / ONE_MILLION) * state.poolVolume * state.selectedChemical.multiplier;

    if (amount <= 0) {
        result.classList.remove('show', 'mismatch');
        return;
    }

    // Display result
    result.classList.remove('mismatch');
    clearChemicalColors();
    const colorClass = chemicalColors[state.selectedChemical.chemical];
    if (colorClass) {
        result.classList.add(colorClass);
    }
    resultValue.textContent = amount.toFixed(2);
    resultUnit.textContent = state.selectedChemical.unit;
    resultChemical.textContent = state.selectedChemical.chemical;
    result.classList.add('show');
}

function clearChemicalColors() {
    chemicalColorClasses.forEach(cls => result.classList.remove(cls));
}

function getCalcBaseName(calcType) {
    return calcType.replace(CALC_SUFFIX_PATTERN, '');
}

function showMismatchMessage(message) {
    clearChemicalColors();
    result.classList.add('mismatch', 'show');
    resultValue.textContent = message;
    resultUnit.textContent = '';
    resultChemical.textContent = '';
}

function resetCalculator() {
    state.selectedCalc = null;
    state.selectedChemical = null;
    calcButtons.forEach(btn => btn.classList.remove('active'));
    calculatorInputs.classList.add('hidden');
    clearChemicalColors();
    result.classList.remove('show', 'mismatch');
    currentValue.value = '';
    targetValue.value = '';
    decreaseButton.classList.remove('hidden');
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
