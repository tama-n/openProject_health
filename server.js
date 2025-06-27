import {RelayServer} from "https://chirimen.org/remote-connection/js/beta/RelayServer.js";
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

window.show_threshold =  show_threshold;
window.set_threshold  = set_threshold_handler;
window.show_over_sitting_threshold =  show_over_sitting_threshold;
window.set_over_sitting_threshold = set_over_sitting_threshold;
window.test_act = test_act;
window.test_act_stop = test_act_stop;


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
onload = async function(){
	// webSocketリレーの初期化
	var relay = RelayServer("chirimentest", "chirimenSocket" );

	channel_measure = await relay.subscribe("isutribute_measure");

	channel_measure.onmessage = receiver;
    channel_measure.send({type: "request_cast_threshold"});

	channel_act = await relay.subscribe("isutribute_motor");
    channel_act.onmessage = debug_act_receiver;

	messageDiv.innerText="web socketリレーサービスに接続しました";

    overSiggingThresholdGuide.innerText = over_sitting_threshold / 1000;
    overSittingThresholdInput.value = over_sitting_threshold / 1000;
}

function receiver(msg) { // メッセージを受信したときに起動する関数
    let data = msg.data;
    if (data.type == "sitting_signal") {
        get_sitting_signal(data);
    } else if (data.type == "cast_threshold") {
        cast_threshold_handler(data);
    } else if (data.type == "end_sitting_signal") {
        end_sitting_handler(data);
    } 
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
    };
}

let over_sitting_threshold = 5000;
function is_over_sat(info) {
    return info.end - info.begin >= over_sitting_threshold;
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

function actuator_on() {
    if (!is_act_on) { 
        console.log("sent: " +  "over_sitting_signal");
        channel_act.send({ type: "over_sitting_signal" });
        is_act_on = true;
    }
}

function actuator_off() {
    if (is_act_on) { 
        channel_act.send({ type: "after_over_sitting_signal" });
        console.log("sent: " +  "after_over_sitting_signal");
        is_act_on = false;
    }
}

function get_sitting_signal(data){

    const sit_d = new Date(data.time);
    if (sitting_info_list.length == 0) {
        sitting_info_list.push(get_new_sitting_info(sit_d));
    } else {
        const last_info = sitting_info_list.at(-1);
        const continue_time = 2000;
        if (sit_d - last_info.end > continue_time) {
            sitting_info_list.push(get_new_sitting_info(sit_d));
        } else {
            sitting_info_list.at(-1).end = sit_d;
            if (is_over_sat(sitting_info_list.at(-1))) {
                actuator_on();
            }
        }
    }

    display_sitting_log();
}

function end_sitting_handler(data) {
    sitting_info_list.at(-1).end = new Date(data.time);
    actuator_off();
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
    display_sitting_log();
}

function show_over_sitting_threshold(event) {
    overSiggingThresholdGuide.innerText = event.target.value;
}

function test_act() {
    console.log("sent: over_sitting_signal");
    channel_act.send({ type: "over_sitting_signal" });
}

function test_act_stop() {
    console.log("sent: after_over_sitting_signal");
    channel_act.send({ type: "after_over_sitting_signal" });
}
