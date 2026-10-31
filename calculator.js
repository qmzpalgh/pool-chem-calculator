// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');

function getSavedTheme() {
    try {
        return localStorage.getItem('theme');
    } catch (error) {
        return null;
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem('theme', theme);
    } catch (error) {
        // The theme can still be changed for this page when storage is unavailable.
    }
}

function initTheme() {
    const savedTheme = getSavedTheme();
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
        saveTheme('light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.classList.add('active');
        saveTheme('dark');
    }
}

themeToggle.addEventListener('click', toggleTheme);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!getSavedTheme()) {
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
    facility: 'pelican',
    selectedFacility: 'pelican',
    selectedPool: '660000',
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
const customPoolName = document.getElementById('customPoolName');
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
const saveNote = document.getElementById('saveNote');
const saveStatus = document.getElementById('saveStatus');
const notesList = document.getElementById('notesList');
const notesEmpty = document.getElementById('notesEmpty');
const notesStatus = document.getElementById('notesStatus');
const printNotes = document.getElementById('printNotes');
const chemicalColorClasses = Object.values(chemicalColors);

const notesStorageKey = 'poolChemicalNotes';
let savedNotes = [];
let notesAvailable = true;
let readingsCustomPoolName = '';
try {
    savedNotes = JSON.parse(localStorage.getItem(notesStorageKey) || '[]');
    if (!Array.isArray(savedNotes)) throw new Error('Invalid saved notes');
} catch (error) {
    savedNotes = [];
    notesAvailable = false;
    notesStatus.textContent = 'Saved notes could not be loaded on this device.';
}
renderNotes();
window.addEventListener('storage', (event) => {
    if (event.key !== notesStorageKey && event.key !== null) return;
    try {
        const notes = JSON.parse(event.key === null ? '[]' : (event.newValue || '[]'));
        if (!Array.isArray(notes)) throw new Error('Invalid saved notes');
        savedNotes = notes;
        notesAvailable = true;
        notesStatus.textContent = '';
    } catch (error) {
        savedNotes = [];
        notesAvailable = false;
        notesStatus.textContent = 'Saved notes could not be loaded on this device.';
    }
    renderNotes();
});

// Event listeners
facilityButtons.forEach(btn => btn.addEventListener('click', handleFacilityToggle));
customVolume.addEventListener('input', handleCustomVolumeChange);
customPoolName.addEventListener('input', () => {
    customPoolName.removeAttribute('aria-invalid');
    saveStatus.textContent = '';
    if (readingsCustomPoolName &&
        customPoolName.value.trim().toLocaleLowerCase() !== readingsCustomPoolName.toLocaleLowerCase()) {
        clearPoolReadings();
        calculate();
    }
});
directionToggleButtons.forEach(btn => btn.addEventListener('click', handleDirectionToggle));
calcButtons.forEach(btn => btn.addEventListener('click', handleCalcSelection));
currentValue.addEventListener('input', handleInputChange);
targetValue.addEventListener('input', handleInputChange);
saveNote.addEventListener('click', saveCurrentNote);
printNotes.addEventListener('click', () => window.print());

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
        if (state.selectedPool === 'custom' && customPoolName.value.trim()) {
            readingsCustomPoolName = customPoolName.value.trim();
        }
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
    if (facility === state.facility) return;

    state.facility = facility;
    customVolume.value = '';
    customPoolName.value = '';
    customPoolName.removeAttribute('aria-invalid');

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
    const poolChanged = value !== state.selectedPool || state.facility !== state.selectedFacility;

    if (poolChanged) {
        clearPoolReadings();
    }
    state.selectedPool = value;
    state.selectedFacility = state.facility;

    // Update button active states within the same grid
    parentGrid.querySelectorAll('[data-pool]').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    if (value === 'custom') {
        customVolumeGroup.classList.remove('hidden');
        poolVolume.style.display = 'none';
        state.poolType = 'custom';
        state.poolVolume = customVolume.valueAsNumber;
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

    if (state.selectedCalc === 'cya-up' && state.facility !== 'cribpoint') {
        resetCalculator();
    } else {
        if (state.selectedCalc) updateReadingLabels();
        calculate();
    }
}

function handleCustomVolumeChange(e) {
    state.poolVolume = e.target.valueAsNumber;
    calculate();
}

function clearPoolReadings() {
    state.inputMemory = {};
    readingsCustomPoolName = '';
    currentValue.value = '';
    targetValue.value = '';
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

    updateReadingLabels();

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

function updateReadingLabels() {
    const baseName = getCalcBaseName(state.selectedCalc);
    let range = targetRanges[baseName];
    if (baseName === 'chlorine') {
        const poolConfig = state.selectedPool === 'custom' ? null : pools[state.selectedPool];
        range = poolConfig ? poolConfig.chlorineRange : 'check site procedure';
    }
    currentValueLabel.textContent = baseName === 'ph' ? 'Current' : 'Current (mg/L)';
    targetValueLabel.textContent = `Target (${range})`;
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
    saveNote.classList.add('hidden');
    saveStatus.textContent = '';
    if (!state.selectedCalc || !state.selectedChemical) {
        result.classList.remove('show', 'mismatch');
        return;
    }

    if (currentValue.value === '' || targetValue.value === '') {
        result.classList.remove('show', 'mismatch');
        return;
    }

    const current = currentValue.valueAsNumber;
    const target = targetValue.valueAsNumber;

    if (!Number.isFinite(state.poolVolume) || state.poolVolume <= 0) {
        showMismatchMessage('Enter a pool volume greater than zero');
        return;
    }
    if (!Number.isFinite(current) || !Number.isFinite(target) || current < 0 || target < 0) {
        showMismatchMessage('Enter valid, non-negative readings');
        return;
    }

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

    if (!Number.isFinite(amount) || amount <= 0) {
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
    resultValue.textContent = amount < 0.01
        ? amount.toLocaleString('en-AU', { maximumSignificantDigits: 3 })
        : amount.toFixed(2);
    resultUnit.textContent = state.selectedChemical.unit;
    resultChemical.textContent = state.selectedChemical.chemical;
    result.classList.add('show');
    saveNote.classList.remove('hidden');
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
    saveNote.classList.add('hidden');
    saveStatus.textContent = '';
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function saveCurrentNote() {
    const visiblePools = state.facility === 'pelican' ? pelicanPools : cribpointPools;
    const poolName = state.selectedPool === 'custom'
        ? customPoolName.value.trim()
        : visiblePools.querySelector('[data-pool].active').textContent.trim();

    if (!poolName) {
        customPoolName.setAttribute('aria-invalid', 'true');
        saveStatus.textContent = 'Enter a custom pool name before saving.';
        customPoolName.focus();
        return;
    }

    const note = {
        facilityId: state.facility,
        facility: document.querySelector('[data-facility].active').textContent.trim(),
        poolId: state.selectedPool,
        poolName,
        volume: state.poolVolume,
        calculation: state.selectedCalc,
        adjustment: calculations[state.selectedCalc].label,
        amount: resultValue.textContent,
        unit: resultUnit.textContent,
        chemical: resultChemical.textContent,
        savedAt: new Date().toISOString()
    };
    const existingIndex = savedNotes.findIndex((saved) =>
        saved.facilityId === note.facilityId && saved.poolId === note.poolId &&
        (note.poolId !== 'custom' || saved.poolName.toLocaleLowerCase() === note.poolName.toLocaleLowerCase()) &&
        saved.calculation === note.calculation && saved.chemical === note.chemical
    );
    const nextNotes = savedNotes.slice();
    if (existingIndex === -1) nextNotes.push(note);
    else nextNotes[existingIndex] = note;

    if (storeNotes(nextNotes)) {
        if (state.selectedPool === 'custom') readingsCustomPoolName = poolName;
        saveStatus.textContent = existingIndex === -1 ? 'Saved to notes.' : 'Updated in notes.';
    } else {
        saveStatus.textContent = 'Could not save. See the notes section below.';
    }
}

function storeNotes(nextNotes) {
    if (!notesAvailable) {
        notesStatus.textContent = 'Notes are unavailable because saved notes could not be loaded.';
        return false;
    }
    try {
        localStorage.setItem(notesStorageKey, JSON.stringify(nextNotes));
    } catch (error) {
        notesStatus.textContent = 'Could not save notes on this device. Check your browser storage settings.';
        return false;
    }
    savedNotes = nextNotes;
    notesStatus.textContent = '';
    renderNotes();
    return true;
}

function renderNotes() {
    notesList.replaceChildren();
    notesEmpty.classList.toggle('hidden', savedNotes.length > 0 || !notesAvailable);
    printNotes.classList.toggle('hidden', savedNotes.length === 0);

    savedNotes.forEach((note, index) => {
        const item = document.createElement('li');
        item.className = 'note-item';

        const pool = document.createElement('h3');
        pool.className = 'note-pool';
        pool.textContent = `${note.facility} · ${note.poolName}`;
        const volume = document.createElement('p');
        volume.className = 'note-meta';
        volume.textContent = `${note.volume.toLocaleString('en-AU', { maximumFractionDigits: 20 })} L · ${note.adjustment}`;
        const dose = document.createElement('p');
        dose.className = 'note-dose';
        dose.textContent = `${note.amount} ${note.unit} ${note.chemical}`;
        const saved = document.createElement('p');
        saved.className = 'note-meta';
        saved.textContent = `Saved ${new Date(note.savedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'note-remove';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${note.chemical} for ${note.facility}, ${note.poolName} from notes`);
        remove.addEventListener('click', () => storeNotes(savedNotes.filter((_, i) => i !== index)));

        item.append(pool, volume, dose, saved, remove);
        notesList.appendChild(item);
    });
}
