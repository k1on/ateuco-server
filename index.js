var port = 8080;
var express = require('express');
var server = new express();
var app = require('http').createServer(server);
var bodyParser = require('body-parser');
var r = require('rethinkdb');

server.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
server.use(bodyParser.json({limit: '50mb'}));
server.use('/images', express.static('images'));

//static server
//server.use('/images', express.static('images'));

var io = require('socket.io')(app);
app.listen(port);
var connection;



console.log(process.cwd());
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    console.log(`Server started at ${add}:${port}`);
});

//start socket server

r.connect({host: 'node148109-ateucobd.jelastic.regruhosting.ru', port:  process.platform === "win32" ? 11000 : 28015, db: 'ateuco'}, function(err, conn) {
    if(err) throw err;
    connection = conn;

    console.log('rethinkdb connected');


    global.r = r;
    global.conn = connection;

    /*r.db('test').tableCreate('test').run(connection, (err, data) => {
        console.log(data);
    });*/


    let s = require('./socket.js');
    s.set('r', r);
    s.set('conn', connection);
    s.set('io', io);

    s.startIO();
});


//start http server
let http = require('./httpServer.js');

let propertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf(http));
propertyNames.forEach((method) => {
    if(method !== "constructor") {
        let m = method.split('_');

        if(m[0] === 'get') {

            server.get('/'+m[1], (req, res) => {
                http[method](req, res);
            });
        }

        if(m[0] === 'post') {
            server.post('/'+m[1], (req, res) => {
                http[method](req, res);
            });
        }
    }
});
//404 pages
server.get('*', function(req, res){
    res.status(404).send('invalid uri');
});
server.post('*', function(req, res){
    res.status(404).send('invalid uri');
});





