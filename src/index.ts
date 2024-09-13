import Aedes, { Client, Subscription, PublishPacket } from 'aedes';
import { createServer, Server } from 'net';

const port: number = 8443;

const aedes = new Aedes();

// Evento disparado quando um novo cliente se conecta
aedes.on('client', (client: Client) => {
    console.log('New client connected:', client.id);
});

// Evento disparado quando um cliente desconecta
aedes.on('clientDisconnect', (client: Client) => {
    console.log('Client disconnected:', client.id);
});
let lastTime = new Date().toUTCString();
const currentState = {
    portao: 'Fechado',
}
const rgbToBgr = (rgb: string) => {
    const [r, g, b] = rgb.slice(1).match(/.{1,2}/g) as string[];
    return `#${b}${g}${r}`;
}
// Evento disparado quando uma mensagem é publicada
aedes.on('publish', (packet: PublishPacket, client: Client | null) => {
    if (client) {
        console.log('Message from client:', client.id, 'Topic:', packet.topic, 'Payload:', packet.payload.toString());

        // Verificar se a mensagem é do tópico do ESP8266
        if (packet.topic === 'sensor/portao/status') {
            // Decidir qual cor enviar com base no estado
            const estado = packet.payload.toString() == "Aberto" ? "Destrancado" : "Trancado";
            let ledColor = '#00FF00'; 
            let ledValue = 0;

            if (estado === 'Destrancado') {
                ledColor = '#FF0000'; 
                ledValue = 255;
            }
            if(currentState.portao !== estado){
                currentState.portao = estado;
                lastTime = getCurrentTime();
                aedes.publish({
                    topic: 'hasp/central/command/p1.b3.text',
                    payload: estado,
                    qos: 0,
                    retain: false,
                    cmd: 'publish',
                    dup: false
                }, () => {
                });
            }
            aedes.publish({
                topic: 'hasp/central/command/p1.b6.text', // ultima atualização
                payload: lastTime,
                qos: 0,
                retain: false,
                cmd: 'publish',
                dup: false
            }, () => {
            });

            // Publicar a mensagem no broker
            aedes.publish({
                topic: 'hasp/central/command/p1.b4.val',
                payload: ledValue.toString(),
                qos: 0,
                retain: false,
                cmd: 'publish',
                dup: false
            }, () => {
            });

            aedes.publish({
                topic: 'hasp/central/command/p1.b4.bg_color',
                payload: rgbToBgr(ledColor),
                qos: 0,
                retain: false,
                cmd: 'publish',
                dup: false
            }, () => {
            });
            aedes.publish({
                topic: 'hasp/central/command/p1.b3.text',
                payload: estado,
                qos: 0,
                retain: false,
                cmd: 'publish',
                dup: false
            }, () => {
            });
        }
    }
});

// Evento disparado quando um cliente se inscreve em um tópico
aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
    console.log('Client subscribed:', client.id, 'Subscriptions:', subscriptions.map(s => s.topic));
});

// Evento disparado quando um cliente cancela uma inscrição em um tópico
aedes.on('unsubscribe', (subscriptions: string[], client: Client) => {
    console.log('Client unsubscribed:', client.id, 'Subscriptions:', subscriptions);
});

// Evento disparado quando há um erro no cliente
aedes.on('clientError', (client: Client, err: Error) => {
    console.error('Client error:', client.id, err.message);
});

// Evento disparado quando há um erro de conexão
aedes.on('connectionError', (client: Client, err: Error) => {
    console.error('Connection error with client:', client.id, err.message);
});

// Criar o servidor TCP e vincular ao Aedes
const server: Server = createServer(aedes.handle);

// Iniciar o servidor e escutar na porta especificada
server.listen(port, () => {
    console.log('MQTT broker started and listening on port', port);
});

function getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // Retorna o horário no formato HH:MM:SS
}
setInterval(() => {
    const currentTime = getCurrentTime();
    const message = {
        topic: 'hasp/central/command/p1.b100.text',
        payload: currentTime,
        qos: 0,
        retain: false
    } as PublishPacket;
    
    aedes.publish(message, () => {
    });
}, 200); // 60000 ms = 1 minuto