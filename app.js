var express = require('express');
var app = express();
var fs = require('fs');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Q =  require('q');
var snapchat = require('snapchat');

var client = new snapchat.Client();

var SNAPCHAT_USERNAME = 'TODO';
var SNAPCHAT_PASSWORD = 'TODO';

app.get('/', function (req, res) {
  res.sendFile('index.html', {root: __dirname});
})

client.login(SNAPCHAT_USERNAME, SNAPCHAT_PASSWORD)
  .then(function (data) {
    console.log('Logged into Snapchat as %s', SNAPCHAT_USERNAME);

    // start our webserver on port 3000
    var server = http.listen(3000, function () {
      var host = server.address().address;
      var port = server.address().port;

      console.log('Snaplive listening on http://%s:%s', host, port);
    });
  }, function (err) {
    console.log(err);
  });
