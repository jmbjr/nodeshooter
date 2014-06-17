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

io.sockets.on('connection', function (socket) {
  socket.on('clientlogin', function(id) {
    if (playerIn === null) {
      playerIn = new Array();
    }

    var cnew = true;
    for (var idx = 0; idx < playerIn.length; idx++) {
      var d = playerIn[idx];
  
      if (lenObject(d.players) < 2) {
        d.players[id] = {
          'x': 50,
          'y': 200, 
          'w': 50,
          'h': 69,
          'health': 100,
          'speed': 70,
          'type': 2,
          'boundary': {
            'x': 14,
            'y': 4,
            'w': 24,
            'h': 52
          },
          'lastUpdated': null,
          'lastShot': null
        };
        d.status = 'ready';
        socket.set('playerslot', idx);
        cnew = false;
      }
    }
  
    if (cnew) {
      var slot = {
        'players': {},
        'bullets': new Array(),
        'status': 'wait'
      };
  
      slot.players[id] = {
        'x': 500, 
        'y': 200,
        'w': 50,
        'h': 69,
        'health': 100,
        'speed': 70,
        'type': 1,
        'boundary': {
          'x': 19,
          'y': 17,
          'w': 24,
          'h': 52
        },
        'lastUpdated': null,
        'lastShot': null
      };
  
      var idx = playerIn.push(slot);
      socket.set('playerslot', idx-1);
    }
  
    socket.emit('serverloginsuccess', null);

  });

  socket.on('clientattempt', function(id) {
    socket.get('playerslot', function(err, idx) {
      var slot = playerIn[idx];

      socket.emit('serverplayerstatus', slot);
    });
  });

  socket.on('clientgame', function(id) {
    socket.get('playerslot', function(err, idx) {
      var slot = playerIn[idx];

      socket.emit('servergame', slot);
    });
  });

  socket.on('clientupdate', function(data){
    socket.get('playerslot', function(err, idx){
      //count deltatime
      var now = Date.now();
      var then = playerIn[idx].players[data.id].lastUpdated == null ? Date.now() : playerIn[idx].players[data.id].lastUpdated;
      var thenShot = playerIn[idx].players[data.id].lastShot == null ? Date.now() : playerIn[idx].players[data.id].lastShot;
      var delta = (now - then) / 1000;
      var deltaShot = (now - thenShot) / 1000;
    
      //player movement
      var pspeed = playerIn[idx].players[data.id].speed;
      
      if (data.keys.indexOf('up') > -1) {
        playerIn[idx].players[data.id].y -= pspeed * delta;
      }
      if (data.keys.indexOf('down') > -1) {
        playerIn[idx].players[data.id].y += pspeed * delta;
      }
      if (data.keys.indexOf('left') > -1) {
        playerIn[idx].players[data.id].x -= pspeed * delta;
      }
      if (data.keys.indexOf('right') > -1) {
        playerIn[idx].players[data.id].x += pspeed * delta;
      }
      
      //player movement restriction
      if(playerIn[idx].players[data.id].y < 50)
        playerIn[idx].players[data.id].y += pspeed * delta;
      if(playerIn[idx].players[data.id].y + playerIn[idx].players[data.id].h > 400)
        playerIn[idx].players[data.id].y -= pspeed * delta;
      if(playerIn[idx].players[data.id].x < 0)
        playerIn[idx].players[data.id].x += pspeed * delta;
      if(playerIn[idx].players[data.id].x + playerIn[idx].players[data.id].w > 600)
        playerIn[idx].players[data.id].x -= pspeed * delta;
      
      //bullet movement
      for(var i in playerIn[idx].bullets){
        if(arrayHasOwnIndex(playerIn[idx].bullets, i)){
          if(playerIn[idx].bullets[i].owner == data.id){
            playerIn[idx].bullets[i].x += playerIn[idx].bullets[i].speedx * delta;
            playerIn[idx].bullets[i].y += playerIn[idx].bullets[i].speedy * delta;
            
            //if outside bound
            if(
              playerIn[idx].bullets[i].x < 0 ||
              playerIn[idx].bullets[i].x > 600 ||
              playerIn[idx].bullets[i].y < 50 ||
              playerIn[idx].bullets[i].y > 400
            ){
              playerIn[idx].bullets.splice(i, 1);
            }
          }
          else if(
            collisionDetect({
              'x': playerIn[idx].players[data.id].x + playerIn[idx].players[data.id].boundary.x,
              'y': playerIn[idx].players[data.id].y + playerIn[idx].players[data.id].boundary.y,
              'width': playerIn[idx].players[data.id].boundary.w,
              'height': playerIn[idx].players[data.id].boundary.h
            },
            {
              'x': playerIn[idx].bullets[i].x - playerIn[idx].bullets[i].radius/2,
              'y': playerIn[idx].bullets[i].y - playerIn[idx].bullets[i].radius/2,
              'width': playerIn[idx].bullets[i].radius,
              'height': playerIn[idx].bullets[i].radius
            })
          ){
            playerIn[idx].players[data.id].health -= playerIn[idx].bullets[i].damage;
            playerIn[idx].bullets.splice(i, 1);
          }
        }
      }
      
      //bullet creation
      if(
        data.mouses.x != null &&
        data.mouses.y != null &&
        (playerIn[idx].players[data.id].lastShot == null || deltaShot >= 1)
      ){
        var px = playerIn[idx].players[data.id].x;
        var py = playerIn[idx].players[data.id].y;
        var pw = playerIn[idx].players[data.id].w;
        var ph = playerIn[idx].players[data.id].h;
        
        var lx = data.mouses.x - px;
        var ly = data.mouses.y - py;
        
        var deg = Math.atan2(ly, lx);
        
        playerIn[idx].bullets.push({
          'owner': data.id,
          'x': px + pw/2 + 35 * Math.cos(deg),
          'y': py + ph/2 + 35 * Math.sin(deg),
          'radius': 5,
          'speedx': 100 * Math.cos(deg),
          'speedy': 100 * Math.sin(deg),
          'damage': 10
        });
        
        playerIn[idx].players[data.id].lastShot = now;
      }
      
      //update deltatime
      playerIn[idx].players[data.id].lastUpdated = now;
      
      //output
      var end = false;
      //check win condition
      for(i in playerIn[idx].players){
        if(end == false && playerIn[idx].players.hasOwnProperty(i)){
          if(i == data.id && playerIn[idx].players[i].health <= 0){
            socket.emit('serverend', 'lose');
            end = true;
          }
          else if(i != data.id && playerIn[idx].players[i].health <= 0){
            socket.emit('serverend', 'win');
            end = true;
          }
        }
      }
      
      if(end == false) socket.emit('servergame', playerIn[idx]);
    });
  });


});


