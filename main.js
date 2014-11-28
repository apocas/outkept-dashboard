var Station = require('./lib/station'),
  express = require('express'),
  http = require('http'),
  request = require('request'),
  url = require('url'),
  querystring = require('querystring'),
  vendors = require('./vendors');

var app = express();
app.use(express.static('./public'));

var http_server = http.createServer(app);
var comm_server = new Station(http_server);


function tts(req, res) {
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  var urll = 'http://translate.google.com/translate_tts?' + querystring.stringify(query);

  res.writeHead(200, {'Content-Type': 'audio/mpeg'});
  var google = request(urll);

  google.pipe(res);
}

function search(req, res) {
  var query = req.params.query;
  var search_strings = [];

  vendors.mongo(function(db) {
    var collection = db.collection('servers');
    collection.find().toArray(function(err, servers) {
      for (var i = 0; i < servers.length; i++) {
        var server = servers[i];

        if (server.hostname && server.address) {
          search_strings.push(server.hostname);
          search_strings.push(server.address);
        }

        if (server.ips) {
          for (var z = 0; z < server.ips.length; z++) {
            search_strings.push(server.ips[z]);
          }
        }

        for (var y = 0; y < server.sensors.length; y++) {
          var sensor = server.sensors[y];
          if (sensor !== null && search_strings.indexOf(sensor.name) < 0 && sensor.name != undefined) {
            search_strings.push(sensor.name);
          }
        }
      }

      res.json(search_strings);
    });
  });

}

app.get('/tts', tts);

app.get('/search/:query', search);

http_server.listen(1337);
comm_server.start();
