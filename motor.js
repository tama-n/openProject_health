// https://github.com/chirimen-oh/chirimen.org/blob/master/pizero/src/esm-examples/hbridge1/main.js
// Hブリッジモータードライバは正転[1,0]・逆転[0,1]・ブレーキ[1,1]・フリー[0,0]の4状態を
// GPIOの２つの信号線を使って指示します

import { requestGPIOAccess } from "./node_modules/node-web-gpio/dist/index.js";
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

import nodeWebSocketLib from "websocket"; // https://www.npmjs.com/package/websocket
import {RelayServer} from "./RelayServer.js";

const portAddrs = [20, 21]; // HブリッジコントローラをつなぐGPIOポート番号
let ports;

var channel;

async function free() {
    ports[0].write(0);
    ports[1].write(0);
}

async function brake() {
    ports[0].write(1);
    ports[1].write(1);
    await sleep(300); // 300ms待機してフリー状態にします
    ports[0].write(0);
    ports[1].write(0);
}

async function fwd() {
    ports[0].write(1);
    ports[1].write(0);
}

async function rev() {
    ports[0].write(0);
    ports[1].write(1);
}

async function init() {
    // ポートを初期化するための非同期関数
    const gpioAccess = await requestGPIOAccess(); // thenの前の関数をawait接頭辞をつけて呼び出します。
    ports = [];

    for (let i = 0; i < 2; i++) {
        ports[i] = gpioAccess.ports.get(portAddrs[i]);
        await ports[i].export("out");
    }
    for (let i = 0; i < 2; i++) {
        ports[i].write(0);
    }
}

async function connect() {
	// webSocketリレーの初期化
	var relay = RelayServer("chirimentest", "chirimenSocket" , nodeWebSocketLib, "https://chirimen.org");
	channel = await relay.subscribe("isutribute_motor");
	console.log("web socketリレーサービスに接続しました");
	channel.onmessage = receiver;
}

async function init_all() {
    await init();
    await connect();
}

function receiver(msg) {
    let data = msg.data;
    if (data.type == "over_sitting_signal") {
		console.log("ON");
        fwd();
    } else if (data.type == "after_over_sitting_signal") {
		console.log("OFF");
        brake();
    }
}

await init_all();
