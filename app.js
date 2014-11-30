var express = require("express");
var app = express();

app.get('/', function (req, res) {
  res.sendFile('index.html', {root: __dirname});
})

var server = app.listen(1759, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("Snapchat feed listening on http://%s:%s", host, port);
});
