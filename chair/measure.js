import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";
import ADS1X15 from "@chirimen/ads1x15";

var ads1115;

export async function init_measure() {
    const i2cAccess = await requestI2CAccess();
    const port = i2cAccess.ports.get(1);
    ads1115 = new ADS1X15(port, 0x48);
    // If you uses ADS1115, you have to select "true", otherwise select "false".
    await ads1115.init(true, 7); // High Gain
}

export async function measure() {
    const base = 15;
    // p0-p1 differential mode
    var difA = await ads1115.read("0,1");  
    return difA - base;
}
