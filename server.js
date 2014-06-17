var http = require('http').createServer(server).listen(7777);
var io = require('socket.io').listen(http);

function server(request, response) {
  response.writeHead(200, {'content-type': 'plain-text'});
  response.end();
}

function lenObject(obj) {
  var size = 0;
  for (key in obj) { if (obj.hasOwnProperty(key)) size++; }
  return size;
}

function arrayHasOwnIndex(array, prop) {
  return array.hasOwnProperty(prop) && /^0$|^[1-9]\d*$/.test(prop) && prop <= 4294967294; // 2^32 - 2
}

function collisionDetect(boundA, boundB) {
  return ! (
    (boundA.y + boundA.height < boundB.y) ||
    (boundA.y > boundB.y + boundB.height) ||
    (boundA.x > boundB.x + boundB.width)  ||
    (boundA.x + boundA.width < boundB.x)
  );
}

var playerIn = null;


