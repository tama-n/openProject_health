import {RelayServer} from "https://chirimen.org/remote-connection/js/beta/RelayServer.js";
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

window.show_threshold =  show_threshold;
window.set_threshold  = set_threshold_handler;
window.show_over_sitting_threshold =  show_over_sitting_threshold;
window.set_over_sitting_threshold = set_over_sitting_threshold;
window.test_measure = test_measure;
window.test_bend = test_bend;

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

var channel_measure;
var channel_act;
var channel_bend;
onload = async function(){
	// webSocketリレーの初期化
	var relay = RelayServer("chirimentest", "chirimenSocket" );

	channel_measure = await relay.subscribe("isutribute_measure");

	channel_measure.onmessage = receiver;
    channel_measure.send({type: "request_cast_threshold"});

	channel_act = await relay.subscribe("isutribute_motor");
    channel_act.onmessage = debug_act_receiver;

	channel_bend = await relay.subscribe("bend_sensor_channel");
	channel_bend.onmessage = bend_receiver;

	messageDiv.innerText="web socketリレーサービスに接続しました";

    overSiggingThresholdGuide.innerText = over_sitting_threshold / 1000;
    overSittingThresholdInput.value = over_sitting_threshold / 1000;
}

function receiver(msg) { // メッセージを受信したときに起動する関数
    let data = msg.data;
    console.log(data);
    if (data.type == "sitting_signal") {
        get_sitting_signal(data);
    } else if (data.type == "cast_threshold") {
        cast_threshold_handler(data);
    } else if (data.type == "end_sitting_signal") {
        end_sitting_handler(data);
    } 
}

function bend_receiver() {
    if (state.mode != OVER_SITTING) return;
    state.bend.count++;
    if (state.bend.count >= 10) {
        state.mode = AFTER_OVER_SITTING;
        return;
    }
    messageDiv.innerText = "運動してください あと" + (10 - state.bend.count) + "回";
}

function debug_act_receiver(msg) {
    let data = msg.data;
    console.log("receive? " + data.type);
    console.log(msg);
}

function get_new_sitting_info(sit_d) {
    return {
        begin: sit_d,
        end: sit_d,
        allowed: false,
    };
}

let over_sitting_threshold = 5000;
function is_over_sat(info) {
    return !info.allowed && 
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

let is_act_on = false;

function actuator_on_checked() {
    if (!is_act_on) { 
        console.log("sent: " +  "over_sitting_signal");
        channel_act.send({ type: "over_sitting_signal" });
        is_act_on = true;
    }
}

function actuator_off_checked() {
    if (is_act_on) { 
        channel_act.send({ type: "after_over_sitting_signal" });
        console.log("sent: " +  "after_over_sitting_signal");
        is_act_on = false;
    }
}

function is_new_log(last_info, sit_d) {
    const continue_time = 2000;
    return last_info.allowed || sit_d - last_info.end > continue_time
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
                // actuator_on_checked();
                state.mode = BEFORE_OVER_SITTING;
            }
        }
    }
}

function end_sitting_handler(data) {
    sitting_info_list.at(-1).end = new Date(data.time);
    actuator_off_checked();
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
    channel_measure.send({
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
    console.log("sent: sitting_signal");
    for (let i = 0; i < 6; i++) {
        channel_measure.send({ 
                "type": "sitting_signal",
                "time": new Date().toISOString(),
        });
        await sleep(1000);
    }
}

function test_bend() {
    console.log("sent: is_moved from bend channel");
    channel_bend.send({ 
            "type": "is_moved",
    });
}

function over_sit_notaton() {
    messageDiv.innerText = "運動してください";
}

let DEFAULT = "default";
let OVER_SITTING = "over_sitting";
let BEFORE_OVER_SITTING = "before_over_sitting";
let AFTER_OVER_SITTING = "after_sitting";
let ACTING = "acting";

let state = {
    mode: DEFAULT,
    bend: {
        count: 0,
    }
};

async function main() {
    while (true) {
        // console.log(state);
        display_sitting_log();
        switch (state.mode) {
            case BEFORE_OVER_SITTING: {
                over_sit_notaton();
                state.mode = OVER_SITTING;
                break;
            }
            case AFTER_OVER_SITTING: {
                messageDiv.innerText = "Good Job!";
                state.bend.count = 0;
                sitting_info_list.at(-1).allowed = true;
                state.mode = DEFAULT;
                break;
            }
            case ACTING: {
                actuator_on_checked();
                state.mode = DEFAULT;
                break;
            }
            default: {
                actuator_off_checked();
            }
        }
        await sleep(5);
    }

}

await main();
