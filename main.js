var Station = require('./lib/station'),
  express = require('express'),
  http = require('http');

var app = express();
app.use(express.static('./public'));

var http_server = http.createServer(app);
var comm_server = new Station(http_server);

http_server.listen(1337);
comm_server.start();
