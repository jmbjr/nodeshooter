var http = require('http').createServer(server).listen(7777);
var io = require('socket.io').listen(http);

function server(request, response) {
  response.writeHead(200, {'content-type': 'plain-text'});
  response.end();
}

