export interface Telemetry {
    timestamp: number;
    speed: number;
    temp: number;
    pressure: number;
    fuel: number;
    voltage: number;
    error: boolean;
}