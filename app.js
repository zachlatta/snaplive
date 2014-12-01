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

function downloadUnreadSnaps(client, snaps) {
  var update = {}; // update we'll send to snapchat after downloading all snaps

  snaps.forEach(function (snap) {
    if (typeof snap.sn !== 'undefined' && typeof snap.t !== 'undefined' &&
        snap.st == 1) {
      console.log('Saving snap from ' + snap.sn + '...');

      // save the image to ./images/{SENDER USERNAME}_{SNAP ID}.jpg
      var stream =
        fs.createWriteStream('./images/' + snap.sn + '_' + snap.id + '.jpg', {
          flags: 'w',
          encoding: null,
          mode: 0666
        });
      client.getBlob(snap.id).then(function(blob) {
        blob.pipe(stream);
        blob.resume();
      });

      // add the snap to the update we'll send to snapchat, telling it to mark
      // the snap as read
      update[snap.id] = {
        c: 0, // mark snap as seen
        t: (new Date).getTime(), // set timestamp to the epoch
        replayed: 0 // we have not replayed the snap
      };
    }
  });

  // send our update to snapchat, marking all snaps we just downloaded as read
  client.sync(update);
}

app.use('/images', express.static(__dirname + '/images'));

app.get('/', function (req, res) {
  res.sendFile('index.html', {root: __dirname});
})

client.login(SNAPCHAT_USERNAME, SNAPCHAT_PASSWORD)
  .then(function (data) {
    console.log("Logged into Snapchat as %s", SNAPCHAT_USERNAME);

    createDirIfNotExists('./images');

    // make sure we allow snaps from any account
    client.privacy(false);

    // run the actions in the passed function every 5 seconds
    setInterval(function () {
      // get the latest updates from snapchat
      client.sync().then(function (data) {
        // download the unread snaps from the update
        downloadUnreadSnaps(client, data.snaps);
      });
    }, 5000);

    // start our webserver on port 1759
    var server = app.listen(1759, function () {
      var host = server.address().address;
      var port = server.address().port;

      console.log("Snaplive listening on http://%s:%s", host, port);
    });
  }, function (err) {
    console.log(err);
  });
