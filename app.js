var express = require("express");
var snapchat = require("snapchat");
var fs = require("fs");

var client = new snapchat.Client();
var app = express();

var SNAPCHAT_USERNAME = 'TODO';
var SNAPCHAT_PASSWORD = 'TODO';

function createDirIfNotExists(name) {
  if (!fs.existsSync(name)) {
    fs.mkdirSync(name);
  }
}

app.get('/', function (req, res) {
  res.sendFile('index.html', {root: __dirname});
})

client.login(SNAPCHAT_USERNAME, SNAPCHAT_PASSWORD)
  .then(function (data) {
    console.log("Logged into Snapchat as %s", SNAPCHAT_USERNAME);

    createDirIfNotExists('./images');

    var server = app.listen(1759, function () {
      var host = server.address().address;
      var port = server.address().port;

      console.log("Snaplive listening on http://%s:%s", host, port);
    });
  }, function (err) {
    console.log(err);
  });
