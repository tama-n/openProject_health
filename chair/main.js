const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
import nodeWebSocketLib from "websocket"; // https://www.npmjs.com/package/websocket
import {RelayServer} from "./RelayServer.js";

import { init_motor, stretch, stop_stretch } from "./chair_act.js";
import { init_measure, measure } from "./measure.js";

var channel;
var state = {
    threshold: 100,
    weight: 0,
};

async function receiver(msg) {
    let data = msg.data;
    if (data.type == "set_threshold") {
        change_threshold(data)
    } else if (data.type == "request_cast_threshold") {
        cast_threshold();
    } else if (data.type == "actuator_on") {
        actuator_on();
    } else if (data.type == "actuator_off") {
        actuator_off();
    } else if (data.type == "stretch_signal") {
        await stretch();
    } else if (data.type == "stretch_stop_signal") {
        await stop_stretch();
    }
}

async function connect(){
    // webSocketリレーの初期化
    var relay = RelayServer("chirimentest", "chirimenSocket" , nodeWebSocketLib, "https://chirimen.org");
    channel = await relay.subscribe("isutribute_measure");
    console.log("web socketリレーサービスに接続しました");
    channel.onmessage = receiver;
}

function cast_threshold() {
    channel.send({
        "type": "cast_threshold",
        "threshold": state.threshold,
    });
}

function change_threshold(data){
    state.threshold = parseFloat(data.threshold);
    console.log("new threshold: " + state.threshold );
}

async function init() {
    await connect();
    cast_threshold();
    await init_motor();
    await init_measure();
    console.log("init complete");
}

function judge(state) {
    return state.weight >= state.threshold;
}

async function main() {
    var firstTime = true;
    let is_last_sit = false;
    for (;;) {
        state.weight = await measure();
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

await init();
await main();
