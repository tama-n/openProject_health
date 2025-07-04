import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";
import ADS1015 from "@chirimen/ads1015";
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
import nodeWebSocketLib from "websocket"; // https://www.npmjs.com/package/websocket
import {RelayServer} from "./RelayServer.js";

main();

async function main() {
    const relay = RelayServer("chirimentest", "chirimenSocket", nodeWebSocketLib, "https://chirimen.org");
    const bendChannel = await relay.subscribe("bend_sensor_channel");
    
    var i2cAccess = await requestI2CAccess();
    var port = i2cAccess.ports.get(1);
    var ads1015 = new ADS1015(port, 0x48);
    var value=0;
    var value_bef=0;

    await ads1015.init();
    for (; ;) {
        try {
            value = await ads1015.read(0);
            console.log("value:", value);
            if(Math.abs(value-value_bef) >= 300) {
                bendChannel.send({type: "is_moved"});
            }
            value_bef = value;
        } catch (error) {
            console.error("error: code:" + error.code + " message:" + error.message);
        }
        await sleep(100);
    }
}