import {RelayServer} from "https://chirimen.org/remote-connection/js/beta/RelayServer.js";
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

window.show_threshold =  show_threshold;
window.set_threshold  = set_threshold_handler;
window.show_over_sitting_threshold =  show_over_sitting_threshold;
window.set_over_sitting_threshold = set_over_sitting_threshold;

window.test_measure = test_measure;
window.test_bend = test_bend;
window.test_actuator_off = test_actuator_off;
window.test_actuator_on = test_stretch;

let data = {
    "threshold": 0,
    "type": "",
};

/*
 * sitting_info :: {
 *   begin: 座り始めた時刻,
 *   end: 暫定的な座り終わりの時刻,
 * }
 **/
let sitting_info_list = [];

var channel_chair;
var channel_bend;
onload = async function(){
	// webSocketリレーの初期化
	var relay = RelayServer("chirimentest", "chirimenSocket" );

	channel_chair = await relay.subscribe("isutribute_measure");

	channel_chair.onmessage = receiver;
    channel_chair.send({type: "request_cast_threshold"});

	channel_bend = await relay.subscribe("bend_sensor_channel");
	channel_bend.onmessage = bend_receiver;

	messageDiv.innerText="web socketリレーサービスに接続しました";

    overSiggingThresholdGuide.innerText = over_sitting_threshold / 1000;
    overSittingThresholdInput.value = over_sitting_threshold / 1000;
}

function receiver(msg) { // メッセージを受信したときに起動する関数
    let data = msg.data;
    console.log(data);
    console.log(state.mode);
    if (data.type == "sitting_signal") {
        get_sitting_signal(data);
    } else if (data.type == "cast_threshold") {
        cast_threshold_handler(data);
    } else if (data.type == "end_sitting_signal") {
        end_sitting_handler(data);
    } 
}

function bend_receiver() {
    console.log(data);
    console.log(state.mode);
    console.log(state.bend.count);
    if (
        state.mode == OVER_SITTING 
        || state.mode == BENDING
        || state.mode == BEFORE_ACTING
    ) {
        state.mode = BENDING;
        state.bend.count++;
        state.bend.start_time = new Date();
        // if (state.bend.count >= 10) {
        if (state.bend.count >= 5) {
            state.mode = AFTER_OVER_SITTING;
        }
    }
}

function get_new_sitting_info(sit_d) {
    return {
        begin: sit_d,
        end: sit_d,
        finished: false,
    };
}

let over_sitting_threshold = 5000;
function is_over_sat(info) {
    return !info.finished && 
        info.end - info.begin >= over_sitting_threshold;
}

function display_sitting_log() {
    const to_html = (item) => {
        const over_p = is_over_sat(item);
        const style = "color: " + (over_p ? "red": "green") + ";";
        return`<div style="${style}">${item.begin.toLocaleTimeString()} ~ ${item.end.toLocaleTimeString()}</div>` 
    };
    sittingLog.innerHTML = sitting_info_list
        .toReversed()
        .map(to_html)
        .join("");
}

function is_new_log(last_info, sit_d) {
    const continue_time = 2000;
    return last_info.finished || sit_d - last_info.end > continue_time;
}

function get_sitting_signal(data){
    const sit_d = new Date(data.time);
    if (sitting_info_list.length == 0) {
        sitting_info_list.push(get_new_sitting_info(sit_d));
    } else {
        const last_info = sitting_info_list.at(-1);
        if (is_new_log(last_info, sit_d)) {
            sitting_info_list.push(get_new_sitting_info(sit_d));
        } else {
            sitting_info_list.at(-1).end = sit_d;
            if (is_over_sat(sitting_info_list.at(-1)) && state.mode == DEFAULT) {
                state.mode = BEFORE_OVER_SITTING;
            }
        }
    }
}

function end_sitting_handler(data) {
    sitting_info_list.at(-1).end = new Date(data.time);
}

function cast_threshold_handler(data) {
    let v = data.threshold;
    thresholdGuide.innerText = v;
    thresholdInput.value = v;
}

function set_threshold_handler(event) {
    set_threshold(event.target.value);
}

function set_threshold(value) {
    console.log("threshold: " + value);
    channel_chair.send({
        type: "set_threshold",
        threshold: value,
    });
}

function show_threshold(event) {
    thresholdGuide.innerText = event.target.value;
}

function set_over_sitting_threshold(event) {
    over_sitting_threshold = event.target.value * 1000;
}

function show_over_sitting_threshold(event) {
    overSiggingThresholdGuide.innerText = event.target.value;
}

async function test_measure() {
    console.log("send: sitting_signal");
    for (let i = 0; i < 7; i++) {
        channel_chair.send({ 
                "type": "sitting_signal",
                "time": new Date().toISOString(),
        });
        await sleep(1000);
    }
}

function test_bend() {
    console.log("send: is_moved from bend channel");
    channel_bend.send({ 
            "type": "is_moved",
    });
}

function test_actuator_off() {
    console.log("send: " +  "actuator_off");
    channel_chair.send({ type: "actuator_off" });
}

function test_actuator_on() {
    console.log("send: " +  "actuator_on");
    channel_chair.send({ type: "actuator_on" });
}

function test_stretch() {
    console.log("send: " +  "stretch");

    channel_chair.send({
        type: "stretch_signal", 
    });
}

async function before_acting_notation() {
    for (let i = 20; i >= 0; i--) {
        if (state.mode == BENDING) return false;
        messageDiv.innerText = "フットレストが動くまで: " + i;
        display_sitting_log();
        await sleep(1000);
    }
    return true;
}

function display_notation() {
    switch(state.mode) {
        case BEFORE_OVER_SITTING: {
            messageDiv.innerText = "運動してください";
            break;
        }
        case ACTING: {
            messageDiv.innerText = "フットレストが動きます";
            break;
        }
        case AFTER_ACTING :{
            messageDiv.innerText = "次はがんばってください";
            break;
        }
        case AFTER_OVER_SITTING: {
            messageDiv.innerText = "Good Job!";
            break;
        }
        case BENDING: {
            messageDiv.innerText = "運動してください あと" + (10 - state.bend.count) + "回";
            break;
        }
    }
}

let DEFAULT = "default";
let OVER_SITTING = "over_sitting";
let BEFORE_OVER_SITTING = "before_over_sitting";
let BENDING = "bending";
let AFTER_OVER_SITTING = "after_sitting";
let BEFORE_ACTING = "before_acting";
let ACTING = "acting";
let AFTER_ACTING = "after_acting";

let state = {
    mode: DEFAULT,
    bend: {
        count: 0,
        start_time: new Date(),
    }
};

function is_timeover() {
    let now = new Date();
    const MAX_WAIT_TIME = 10 * 1000;
    return now - state.bend.start_time > MAX_WAIT_TIME;
}

async function main() {
    while (true) {
        // console.log(state);
        
        display_sitting_log();
        display_notation();
        switch (state.mode) {
            case BEFORE_OVER_SITTING: {
                state.bend.start_time = new Date();
                state.mode = OVER_SITTING;
                break;
            }
            case BENDING:
            case OVER_SITTING: {
                if (is_timeover()) {
                    if (state.mode == BENDING) state.bend.count = 0;
                    if (!mannerModeCheckBox.checkbox) state.mode = BEFORE_ACTING;
                }
                break;
            }
            case AFTER_OVER_SITTING: {
                state.bend.count = 0;
                sitting_info_list.at(-1).finished = true;
                state.mode = DEFAULT;
                break;
            }
            case BEFORE_ACTING: {
                if (await before_acting_notation()) {
                    state.mode = ACTING;
                }
                break;
            }
            case ACTING: {
                channel_chair.send({
                    type: "stretch_signal", 
                });
                await sleep(3000);
                state.mode = AFTER_ACTING;
                break;
            }
            case AFTER_ACTING: {
                sitting_info_list.at(-1).finished = true;
                state.mode = DEFAULT;
                break;
            }
            default: {
            }
        }
        await sleep(5);
    }

}

await main();
