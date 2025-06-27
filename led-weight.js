import {requestGPIOAccess} from "./node_modules/node-web-gpio/dist/index.js";
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
import nodeWebSocketLib from "websocket"; // https://www.npmjs.com/package/websocket
import {RelayServer} from "./RelayServer.js";

var channel;
var gpioPort0;

async function connect(){
	// GPIOポート0の初期化
	var gpioAccess = await requestGPIOAccess();
	var mbGpioPorts = gpioAccess.ports;
	gpioPort0 = mbGpioPorts.get(26);
	await gpioPort0.export("out"); //port0 out
	
	// webSocketリレーの初期化
	var relay = RelayServer("chirimentest", "chirimenSocket" , nodeWebSocketLib, "https://chirimen.org");
	channel = await relay.subscribe("isutribute_act");
	console.log("web socketリレーサービスに接続しました");
	channel.onmessage = controlLED;
}

function controlLED(msg){
	console.log(msg.data);
    let data = msg.data;
	if (data.type == "over_sitting_signal"){
		gpioPort0.write(1);
		console.log("ON");
		channel.send("LEDをオンにしました");
	} else if (data.type == "after_over_sitting_signal"){
		gpioPort0.write(0);
		console.log("OFF");
		channel.send("LEDをオフにしました");
	}
}

connect();
