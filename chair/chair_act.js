// https://github.com/chirimen-oh/chirimen.org/blob/master/pizero/src/esm-examples/hbridge1/main.js
// Hブリッジモータードライバは正転[1,0]・逆転[0,1]・ブレーキ[1,1]・フリー[0,0]の4状態を
// GPIOの２つの信号線を使って指示します

import { requestGPIOAccess } from "./node_modules/node-web-gpio/dist/index.js";
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

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

async function back() {
    ports[0].write(0);
    ports[1].write(1);
}

async function reset() {
    await back();
    await sleep(timing);
    await brake();
}

export async function init_motor() {
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
    await reset();
}

let timing = 1000;
export async function actuator_on() {
    await fwd();
    console.log("fwd");
    await sleep(timing);
    await brake();
    await sleep(timing);
}

export async function actuator_off() {
    await back();
    console.log("back");
    await sleep(timing);
    await brake();
    await sleep(timing);
}

let is_stretch_continue = false;
export async function stretch() {
    is_stretch_continue = true;
    for (let i = 0; i < 10; i++) {
        await actuator_on();
        await sleep(1000);
        await actuator_off();
        await sleep(1000);
    }
}

export async function stop_stretch() {
    is_stretch_continue = false;
}
