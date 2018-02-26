const SocketMethods = require('./SocketMethods.js');
module.exports = new class ASocket extends SocketMethods {
    constructor() {
        super();
        console.log('SocketMethods inited!!!')
        this.r = null;
        this.connection = null;
        this.io = null;
    }


    set(name, value) {
        this[name] = value;
    }


    startIO() {
        if(this.io === null) {
            console.error("Set IO first [s.set('io', io)]");
            return false;
        }
        let propertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf(new SocketMethods));

        this.io.on('connection', (socket) => {
            console.log(`New user connected [${socket.id}]`);
            propertyNames.forEach((method) => {
                if(method !== "constructor") {
                    socket.on(method, (data) => {
                        this[method](socket, data);
                    });
                }
            });
        });

    }





}