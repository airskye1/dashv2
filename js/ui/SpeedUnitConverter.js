/**
 * Speed Unit Converter
 * Handles MPH <-> KM/H conversions
 */

export default class SpeedUnitConverter {
    constructor() {
        this.currentUnit = localStorage.getItem('speedUnit') || 'mph';
    }

    // Convert m/s to current unit
    fromMetersPerSecond(mps) {
        if (this.currentUnit === 'mph') {
            return mps * 2.23694; // m/s to mph
        } else {
            return mps * 3.6; // m/s to km/h
        }
    }

    // Convert current unit to m/s
    toMetersPerSecond(value) {
        if (this.currentUnit === 'mph') {
            return value / 2.23694; // mph to m/s
        } else {
            return value / 3.6; // km/h to m/s
        }
    }

    // Get unit label
    getUnitLabel() {
        return this.currentUnit;
    }

    // Set unit
    setUnit(unit) {
        if (unit === 'mph' || unit === 'kmh') {
            this.currentUnit = unit;
            localStorage.setItem('speedUnit', unit);
            return true;
        }
        return false;
    }

    // Format speed with unit
    format(mps, decimals = 0) {
        const value = this.fromMetersPerSecond(mps);
        return `${value.toFixed(decimals)} ${this.currentUnit}`;
    }

    // Convert between units
    convert(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;

        // Convert to m/s first
        let mps;
        if (fromUnit === 'mph') {
            mps = value / 2.23694;
        } else if (fromUnit === 'kmh') {
            mps = value / 3.6;
        } else {
            mps = value; // assume m/s
        }

        // Convert to target unit
        if (toUnit === 'mph') {
            return mps * 2.23694;
        } else if (toUnit === 'kmh') {
            return mps * 3.6;
        } else {
            return mps;
        }
    }
}

// Global instance
window.SpeedConverter = new SpeedUnitConverter();
