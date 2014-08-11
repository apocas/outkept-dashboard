var Station = require('./lib/station'),
  express = require('express'),
  http = require('http'),
  request = require('request'),
  url = require('url'),
  querystring = require('querystring');

var app = express();
app.use(express.static('./public'));

var http_server = http.createServer(app);
var comm_server = new Station(http_server);


function tts(req, res) {
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;

  var urll = 'http://translate.google.com/translate_tts?' + querystring.stringify(query);

  console.log(urll);

  res.writeHead(200, {'Content-Type': 'audio/mpeg'});
  var google = request(urll);
  google.pipe(res);
}

app.get('/tts', tts);

http_server.listen(1337);
comm_server.start();
