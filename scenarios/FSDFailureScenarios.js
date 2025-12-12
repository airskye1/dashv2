/**
 * FSD Failure Test Scenarios
 * Based on real-world Tesla FSD v13/v14 documented failures
 * 
 * Sources:
 * - Reddit user reports (FSD v13.2.8 & v13.2.9)
 * - Medium road trip analysis (8,100 miles)
 * - Forbes test drive report (Model Y Juniper)
 * - Electrek FSD v14 analysis
 * - WebProNews regulatory reports
 */

export const FSDFailureScenarios = {
    /**
     * Scenario 1: Oncoming Traffic Turn
     * Based on: FSD v13.2.8 turning right towards oncoming traffic
     * Source: Reddit r/TeslaMotors March 2025
     * Severity: CRITICAL
     */
    oncomingTrafficTurn: {
        name: "Oncoming Traffic Turn (FSD v13 Failure)",
        description: "Vehicle attempts to turn into lane with oncoming traffic",
        difficulty: "critical",
        source: "Real FSD v13.2.8 failure - Reddit report March 2025",
        scenario: {
            road: {
                type: "bidirectional",
                lanes: 2,
                width: 7.4,
                speedLimit: 13.4,
                path: [
                    { x: 0, y: 0 },
                    { x: 50, y: 0 },
                    { x: 100, y: 20 }, // Right turn
                    { x: 120, y: 50 }
                ]
            },
            intersection: {
                position: { x: 75, y: 10 },
                type: "4-way",
                controlType: "traffic-light"
            },
            dynamicObstacles: [
                {
                    type: "car",
                    position: { x: 100, y: 25 },
                    velocity: { s: -15, l: 0 }, // Oncoming at 15 m/s
                    parallel: true
                },
                {
                    type: "car",
                    position: { x: 110, y: 25 },
                    velocity: { s: -15, l: 0 },
                    parallel: true
                }
            ],
            egoVehicle: {
                position: { x: 60, y: 0 },
                rotation: 0,
                speed: 10
            },
            expectedBehavior: "Detect oncoming traffic and abort turn",
            failureMode: "Confidently turns into oncoming lane"
        }
    },

    /**
     * Scenario 2: Wrong Lane Turn
     * Based on: FSD v13.2.9 turning right from far-left lane
     * Source: Forbes test drive June 2025
     * Severity: HIGH
     */
    wrongLaneTurn: {
        name: "Wrong Lane Turn (FSD v13 Failure)",
        description: "Vehicle attempts right turn from incorrect lane",
        difficulty: "high",
        source: "Real FSD v13.2.9 failure - Forbes test drive June 2025",
        scenario: {
            road: {
                type: "regular",
                lanes: 3,
                width: 11.1, // 3 lanes
                speedLimit: 13.4,
                path: [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 120, y: -20 } // Right turn
                ]
            },
            intersection: {
                position: { x: 100, y: 0 },
                type: "4-way",
                controlType: "traffic-light"
            },
            egoVehicle: {
                position: { x: 50, y: 3.7 }, // Far left lane
                rotation: 0,
                speed: 12,
                targetLane: "far-left"
            },
            expectedBehavior: "Change to right lane before turning",
            failureMode: "Attempts right turn from far-left lane across traffic"
        }
    },

    /**
     * Scenario 3: Blocked Entry
     * Based on: FSD v13.2.9 entering blocked private access
     * Source: Forbes test drive June 2025
     * Severity: HIGH
     */
    blockedEntry: {
        name: "Blocked No-Entry Path (FSD v13 Failure)",
        description: "Vehicle attempts to enter blocked/no-entry area",
        difficulty: "high",
        source: "Real FSD v13.2.9 failure - Forbes test drive June 2025",
        scenario: {
            road: {
                type: "regular",
                lanes: 2,
                width: 7.4,
                speedLimit: 13.4,
                path: [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 }
                ]
            },
            blockedAreas: [
                {
                    type: "no-entry",
                    position: { x: 80, y: -10 },
                    width: 15,
                    height: 20,
                    signage: "DO NOT ENTER - PRIVATE"
                }
            ],
            staticObstacles: [
                {
                    type: "barrier",
                    position: { x: 75, y: -8 },
                    rotation: Math.PI / 2
                },
                {
                    type: "sign",
                    position: { x: 70, y: -5 },
                    text: "NO ENTRY"
                }
            ],
            egoVehicle: {
                position: { x: 50, y: 0 },
                rotation: 0,
                speed: 10
            },
            expectedBehavior: "Recognize no-entry signs and avoid area",
            failureMode: "Attempts to enter blocked private access"
        }
    },

    /**
     * Scenario 4: Indecisive Highway Merge
     * Based on: FSD v14 indecisive lane changes causing safety hazard
     * Source: Reddit r/TeslaMotors October 2025
     * Severity: MEDIUM
     */
    indecisiveMerge: {
        name: "Indecisive Highway Merge (FSD v14 Failure)",
        description: "Vehicle signals but hesitates repeatedly on highway merge",
        difficulty: "medium",
        source: "Real FSD v14 failure - Reddit safety hazard report Oct 2025",
        scenario: {
            road: {
                type: "highway",
                lanes: 4,
                width: 14.6,
                speedLimit: 29.1, // 65 mph
                path: [
                    { x: 0, y: 0 },
                    { x: 200, y: 0 }
                ]
            },
            onramp: {
                from: { x: 0, y: -20 },
                to: { x: 50, y: 0 },
                mergePoint: { x: 40, y: -5 }
            },
            dynamicObstacles: [
                {
                    type: "car",
                    position: { x: 45, y: 0 },
                    velocity: { s: 28, l: 0 },
                    parallel: true
                },
                {
                    type: "car",
                    position: { x: 60, y: 0 },
                    velocity: { s: 30, l: 0 },
                    parallel: true
                },
                {
                    type: "car",
                    position: { x: 75, y: 0 },
                    velocity: { s: 27, l: 0 },
                    parallel: true
                }
            ],
            egoVehicle: {
                position: { x: 30, y: -10 },
                rotation: Math.PI / 12, // Angled towards highway
                speed: 20
            },
            expectedBehavior: "Commit to merge decisively or wait for clear gap",
            failureMode: "Signals repeatedly, hesitates 5+ seconds, confuses other drivers"
        }
    },

    /**
     * Scenario 5: Excessive Speeding (Mad Max Mode)
     * Based on: FSD v14 excessive speeding behavior
     * Source: Electrek, WebProNews October 2025
     * Severity: MEDIUM
     */
    excessiveSpeeding: {
        name: "Excessive Speeding (FSD v14 Mad Max)",
        description: "Vehicle exceeds speed limit significantly",
        difficulty: "medium",
        source: "Real FSD v14 behavior - Electrek/WebProNews Oct 2025",
        scenario: {
            road: {
                type: "regular",
                lanes: 2,
                width: 7.4,
                speedLimit: 13.4, // 30 mph
                path: [
                    { x: 0, y: 0 },
                    { x: 200, y: 0 }
                ]
            },
            speedZones: [
                {
                    start: { x: 0, y: 0 },
                    end: { x: 100, y: 0 },
                    limit: 13.4, // 30 mph
                    type: "residential"
                },
                {
                    start: { x: 100, y: 0 },
                    end: { x: 200, y: 0 },
                    limit: 11.2, // 25 mph - school zone
                    type: "school-zone"
                }
            ],
            staticObstacles: [
                {
                    type: "sign",
                    position: { x: 95, y: -5 },
                    text: "SCHOOL ZONE - 25 MPH"
                }
            ],
            egoVehicle: {
                position: { x: 0, y: 0 },
                rotation: 0,
                speed: 0
            },
            expectedBehavior: "Respect speed limits, especially in school zones",
            failureMode: "Accelerates to 35+ mph in 25 mph school zone"
        }
    },

    /**
     * Scenario 6: Left Turn into Oncoming Lanes
     * Based on: FSD v13.2.9 turning left into oncoming lanes ~10 times in 8,100 mile trip
     * Source: Medium road trip analysis July-August 2025
     * Severity: CRITICAL
     */
    leftTurnOncoming: {
        name: "Left Turn into Oncoming (FSD v13 Failure)",
        description: "Vehicle turns left into oncoming traffic lanes",
        difficulty: "critical",
        source: "Real FSD v13.2.9 failure - Medium 8,100 mile analysis Aug 2025",
        scenario: {
            road: {
                type: "bidirectional",
                lanes: 4, // 2 each direction
                width: 14.6,
                speedLimit: 17.9, // 40 mph
                path: [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 }
                ]
            },
            intersection: {
                position: { x: 50, y: 0 },
                type: "4-way",
                controlType: "traffic-light",
                leftTurnLane: true
            },
            dynamicObstacles: [
                {
                    type: "car",
                    position: { x: 60, y: 3.7 }, // Oncoming lane
                    velocity: { s: -18, l: 0 },
                    parallel: true
                },
                {
                    type: "car",
                    position: { x: 75, y: 3.7 },
                    velocity: { s: -18, l: 0 },
                    parallel: true
                }
            ],
            trafficLight: {
                position: { x: 50, y: 0 },
                state: "green",
                leftArrow: "none" // No protected left turn
            },
            egoVehicle: {
                position: { x: 40, y: -1.85 }, // Left turn lane
                rotation: 0,
                speed: 5
            },
            expectedBehavior: "Yield to oncoming traffic before turning left",
            failureMode: "Turns left directly into path of oncoming vehicles"
        }
    },

    /**
     * Scenario 7: Random Hallucination Stop
     * Based on: FSD v14 random stops due to hallucinations
     * Source: Electrek FSD v14.1.4 analysis October 2025
     * Severity: MEDIUM
     */
    hallucinationStop: {
        name: "Random Hallucination Stop (FSD v14 Failure)",
        description: "Vehicle stops randomly on roadside without reason",
        difficulty: "medium",
        source: "Real FSD v14 behavior - Electrek Oct 2025",
        scenario: {
            road: {
                type: "regular",
                lanes: 2,
                width: 7.4,
                speedLimit: 17.9, // 40 mph
                path: [
                    { x: 0, y: 0 },
                    { x: 200, y: 0 }
                ]
            },
            // No actual obstacles - this tests phantom braking
            dynamicObstacles: [],
            staticObstacles: [
                {
                    type: "shadow", // Simulated visual artifact
                    position: { x: 100, y: -5 },
                    visual: true
                }
            ],
            egoVehicle: {
                position: { x: 50, y: 0 },
                rotation: 0,
                speed: 17
            },
            expectedBehavior: "Continue driving smoothly on clear road",
            failureMode: "Suddenly brakes and pulls to roadside for non-existent obstacle"
        }
    },

    /**
     * Scenario 8: Brake Stabbing
     * Based on: FSD v14 increased brake stabbing events
     * Source: Electrek FSD v14.1.4 analysis October 2025
     * Severity: LOW
     */
    brakeStabbing: {
        name: "Brake Stabbing (FSD v14 Failure)",
        description: "Vehicle repeatedly applies and releases brakes abruptly",
        difficulty: "low",
        source: "Real FSD v14 behavior - Electrek Oct 2025",
        scenario: {
            road: {
                type: "highway",
                lanes: 3,
                width: 11.1,
                speedLimit: 29.1, // 65 mph
                path: [
                    { x: 0, y: 0 },
                    { x: 500, y: 0 }
                ]
            },
            dynamicObstacles: [
                {
                    type: "car",
                    position: { x: 100, y: 0 },
                    velocity: { s: 27, l: 0 },
                    parallel: true
                },
                {
                    type: "car",
                    position: { x: 150, y: -3.7 },
                    velocity: { s: 28, l: 0 },
                    parallel: true
                }
            ],
            egoVehicle: {
                position: { x: 0, y: 0 },
                rotation: 0,
                speed: 28
            },
            expectedBehavior: "Smooth adaptive cruise control following",
            failureMode: "Repeatedly taps brakes every 2-3 seconds without reason"
        }
    }
};

/**
 * Get scenario by name
 */
export function getScenario(name) {
    return FSDFailureScenarios[name] || null;
}

/**
 * Get all scenario names
 */
export function getAllScenarioNames() {
    return Object.keys(FSDFailureScenarios);
}

/**
 * Get scenarios by severity
 */
export function getScenariosBySeverity(severity) {
    return Object.entries(FSDFailureScenarios)
        .filter(([_, scenario]) => scenario.difficulty === severity)
        .map(([name, scenario]) => ({ name, ...scenario }));
}

/**
 * Export scenario for simulator
 */
export function exportScenarioForSimulator(scenarioName) {
    const scenario = FSDFailureScenarios[scenarioName];
    if (!scenario) return null;

    return {
        name: scenario.name,
        description: scenario.description,
        source: scenario.source,
        ...scenario.scenario
    };
}
