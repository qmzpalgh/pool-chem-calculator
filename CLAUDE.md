# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page web application for calculating pool chemistry dosages. The application is completely self-contained in `index.html` with no external dependencies or build process.

**Facilities Managed:**
- Pelican Park: Main Pool (660,000L), Leisure Pool (76,000L), Spa (12,000L)
- Crib Point: Main Pool (440,000L), Leisure Pool (15,000L)

## Architecture

### State Management
The application uses a global `state` object (line 561-570) that tracks:
- `poolVolume`: Current pool volume in liters
- `poolType`: 'pelican', 'cribpoint', or 'custom'
- `selectedCalc`: Current calculation type (e.g., 'alkalinity-up')
- `selectedChemical`: Chemical configuration object with multiplier
- `direction`: 'increase' or 'decrease'
- `inputMemory`: Preserves user inputs when switching between calculation types

### Chemical Calculation Formula
All dosage calculations follow the formula (line 903-904):
```
amount = (|target - current| / 1,000,000) × poolVolume × multiplier
```

Where:
- `target` and `current` are in mg/L (or pH units)
- `poolVolume` is in liters
- `multiplier` is chemical-specific (defined in `calculations` object, line 600-643)

### Key Data Structures

**calculations object** (line 600-643): Maps calculation types to chemical properties:
- `chemical`: Chemical name
- `multiplier`: Dosage calculation factor
- `unit`: 'kg' or 'L'

**pools object** (line 573-579): Maps pool volumes to metadata including chlorine target ranges

**chemicalColors object** (line 591-597): Maps chemical names to CSS color classes for result card styling

**targetRanges object** (line 582-588): Defines acceptable parameter ranges displayed in UI labels

### UI Interaction Flow

1. User selects facility (Pelican Park/Crib Point) → toggles pool options visibility
2. User selects pool → updates `state.poolVolume` and shows/hides CYA option (Crib Point only)
3. User selects direction (Increase/Decrease) → switches available calculation options
4. User selects calculation type → shows input fields with appropriate labels
5. User enters current/target values → triggers `calculate()` which validates direction matches values
6. Result displays with chemical-specific color gradient

### Input Memory Feature
When switching between related calculations (e.g., 'alkalinity-up' to 'alkalinity-down'), the application preserves the user's current/target inputs by storing them in `state.inputMemory` keyed by the base calculation name (line 676-683, 805-817).

## Development

### Testing Changes
Open `index.html` directly in a browser. No build process, dev server, or dependencies required.

### CSS Architecture
Uses iOS-inspired design with CSS custom properties (line 16-25). Chemical result cards use color-coded gradients defined in lines 309-330. Note that Sodium Thiosulphate uses dark text (line 325-330) due to yellow background.

### Adding New Calculations
1. Add entry to `calculations` object with chemical, multiplier, and unit
2. Add button with `data-calc` attribute in appropriate direction section
3. Add target range to `targetRanges` object
4. Add chemical color gradient if needed (CSS lines 309-330 and chemicalColors object)

### Validation Logic
The application validates that direction matches user input values (lines 888-900):
- For "increase": target must be > current
- For "decrease": current must be > target
Invalid combinations show an orange warning message instead of a result.

## Chemical Multipliers

**Increase:**
- Alkalinity: 2 (Sodium Bicarbonate, kg)
- Free Chlorine: 8 (Sodium Hypochlorite 12.5%, L)
- pH: 800 (Sodium Bicarbonate, kg)
- CYA: 1 (Isocyanuric Acid, kg) - Crib Point only

**Decrease:**
- Alkalinity: 2 (HCl 33%, L)
- Free Chlorine: 1 (Sodium Thiosulphate, kg)
- pH: 0.833 (HCl 33%, L)

## Key Functions

- `calculate()` (line 873): Core calculation logic with direction validation
- `handleCalcSelection()` (line 792): Manages calculation type switching and input memory restoration
- `handleFacilityToggle()` (line 694): Switches between Pelican Park and Crib Point
- `handleDirectionToggle()` (line 758): Switches between increase/decrease with smart preservation of selection
