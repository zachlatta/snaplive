var express = require("express");
var app = express();
var fs = require("fs");
var http = require("http").Server(app);
var io = require("socket.io")(http);
var Q =  require("q");
var snapchat = require("snapchat");

var client = new snapchat.Client();

var SNAPCHAT_USERNAME = 'eshs-snaplive';
var SNAPCHAT_PASSWORD = 'foobarfoobar1';

function createDirIfNotExists(name) {
  if (!fs.existsSync(name)) {
    fs.mkdirSync(name);
  }
}

// downloadUnreadSnaps downloads all of the unread snaps, writes them to the
// ./images directory, and returns promise for an array of all of the snaps
// downloaded. the snaps in the promised array have an additional attribute
// called 'filename' added to them that contains the name of the file that the
// snap is saved in.
function downloadUnreadSnaps(client, snaps) {
  // filter all of the snaps for unread snaps.
  //
  // the .filter function iterates over an array, runs a function on each item
  // in the array, then creates a new array with all of the elements that pass
  // the test in the function.
  //
  // examples:
  //
  // [5, 4, 3, 2, 1].filter(function (n) { return n > 2 })
  // > returns [5, 4, 3]
  //
  // ['a', 'b', 'c', 'd'].filter(function (l) { return l == 'a' })
  // > returns ['a']
  //
  var unreadSnaps = snaps.filter(function (snap) {
    return typeof snap.sn !== 'undefined' && typeof snap.t !== 'undefined' &&
      snap.st == 1
  })

  return Q.all(unreadSnaps.map(function (snap) {
    console.log('Saving snap from ' + snap.sn + '...');

    // save the image to ./images/{SENDER USERNAME}_{SNAP ID}.jpg
    snap.filename = snap.sn + '_' + snap.id + '.jpg';
    var stream = fs.createWriteStream('./images/' + snap.filename, {
      flags: 'w',
      encoding: null,
      mode: 0666
    });
    return client.getBlob(snap.id)
      .then(function (blob) {
        blob.pipe(stream);
      })
      .then(function () {
        return snap;
      });
  }))
  .then(function (downloadedSnaps) {
    var update = {};
    // add the snaps to the update we'll send to snapchat that'll it to mark
    // them as read
    downloadedSnaps.forEach(function (snap) {
      update[snap.id] = {
        c: 0, // mark snap as seen
        t: (new Date).getTime(), // set timestamp to the epoch
        replayed: 0 // we have not replayed the snap
      };
    })

    // send our update to snapchat, marking all snaps we just downloaded as
    // read
    return client.sync(update)
      .then(function () {
        return downloadedSnaps;
      });
  });
}

function replyToSnaps(client, snaps) {
  // upload response.jpg to snapchat
  var blob = fs.createReadStream('response.jpg');
  return client.upload(blob, false)
    .then(function (mediaId) {
      // create an array of the senders of all of the downloaded
      // snaps.
      //
      // the .map function iterates over an array, runs a function
      // on each item in the array, then returns an array of all of
      // the results of all of the functions.
      //
      // examples:
      //
      // [5, 4, 3, 2].map(function (n) { return n + 1 })
      // > returns [6, 5, 4, 3]
      //
      // ['a', 'b', 'c'].map(function (l) { return 'hi' })
      // > returns ['hi', 'hi', 'hi']
      //
      var recipients = snaps.map(function (snap) { return snap.sn });

      console.log('Sending response to %s...', recipients.join(', '));

      return client.send(mediaId, recipients, 5);
    });
}

app.use('/images', express.static(__dirname + '/images'));

app.get('/', function (req, res) {
  res.sendFile('index.html', {root: __dirname});
})

io.on('connection', function (socket) {
  console.log('user connected from %s', socket.conn.remoteAddress);
  socket.on('disconnect', function () {
    console.log('user disconnected from %s', socket.conn.remoteAddress);
  });
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
      client.sync()
        .then(function (data) {
          // download the unread snaps from the update
          return downloadUnreadSnaps(client, data.snaps)
            .then(function (downloadedSnaps) {
              // if we downloaded any snaps, then emit an event to the client
              // and respond to them
              if (downloadedSnaps.length) {
                // emit the last snap as an event to the client
                io.emit('snap', downloadedSnaps[downloadedSnaps.length - 1]);

                return replyToSnaps(client, downloadedSnaps);
              }
            });
        })
        .fail(function (err) {
          console.error(err);
        });
    }, 1000);

    // start our webserver on port 1759
    var server = http.listen(1759, function () {
      var host = server.address().address;
      var port = server.address().port;

      console.log("Snaplive listening on http://%s:%s", host, port);
    });
  }, function (err) {
    console.log(err);
  });
