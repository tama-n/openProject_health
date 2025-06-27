const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
import nodeWebSocketLib from "websocket"; // https://www.npmjs.com/package/websocket
import {RelayServer} from "./RelayServer.js";

import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";
import ADS1X15 from "@chirimen/ads1x15";

var channel;
var ads1115;

var state = {
    threshold: 100,
    weight: 0,
};

async function init_all() {
    const i2cAccess = await requestI2CAccess();
    const port = i2cAccess.ports.get(1);
    ads1115 = new ADS1X15(port, 0x48);
    // If you uses ADS1115, you have to select "true", otherwise select "false".
    await ads1115.init(true, 7); // High Gain
    console.log("init complete");

    await connect();
    cast_threshold();
}

async function connect(){
    // webSocketリレーの初期化
    var relay = RelayServer("chirimentest", "chirimenSocket" , nodeWebSocketLib, "https://chirimen.org");
    channel = await relay.subscribe("isutribute_measure");
    console.log("web socketリレーサービスに接続しました");
    channel.onmessage = receiver;
}

function receiver(msg) {
    let data = msg.data;
    if (data.type == "set_threshold") {
        change_threshold(data)
    } else if (data.type == "request_cast_threshold") {
        cast_threshold();
    }
}

function change_threshold(data){
    state.threshold = parseFloat(data.threshold);
    console.log("new threshold: " + state.threshold );
}

function cast_threshold() {
    channel.send({
        "type": "cast_threshold",
        "threshold": state.threshold,
    });
}

function judge(state) {
    return state.weight >= state.threshold;
}

async function main() {
    var firstTime = true;
    const base = 22;
    let is_last_sit = false;
    for (var i = 0; ;i++) {
        var difA = await ads1115.read("0,1");  // p0-p1 differential mode
        state.weight = difA - base;
        console.log(state);

        if (judge(state)) {
            channel.send({
                "type": "sitting_signal",
                "time": new Date().toISOString(),
            });
            console.log("sent");
            is_last_sit = true;
        } else if (is_last_sit) {
            channel.send({
                "type": "end_sitting_signal",
                "time": new Date().toISOString(),
            });
            is_last_sit = false;
        }

        await sleep(1000);
    }
}

await init_all();
await main();
