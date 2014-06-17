//keystrokes buffer
var keys = [];
var mouses = {
    state: 'up',
    x: null,
    y: null
};

//images
var images = {
    files: {},
    list: {
        'white': 'images/white.png',
        'black': 'images/black.png'
    }
}

function keydown(e){
    keys[e.keyCode] = true;
}

function keyup(e){
    delete keys[e.keyCode];
}

function collisionDetect(boundA, boundB){
    return ! ( 
        (boundA.y + boundA.height < boundB.y) || 
        (boundA.y > boundB.y + boundB.height) || 
        (boundA.x > boundB.x + boundB.width) || 
        (boundA.x + boundA.width < boundB.x)
    );
}

function getOffsetX(e){
    e = e || window.event;

    var target = e.target || e.srcElement;
    var rect = target.getBoundingClientRect();
    
    return offsetX = e.clientX - rect.left;
}

function getOffsetY(e){
    e = e || window.event;

    var target = e.target || e.srcElement;
    var rect = target.getBoundingClientRect();

    return e.clientY - rect.top;
}

function arrayHasOwnIndex(array, prop) {
    return array.hasOwnProperty(prop) && /^0$|^[1-9]\d*$/.test(prop) && prop <= 4294967294; // 2^32 - 2
}

$(document).ready(function(){

    var canvas = $('<canvas width="600" height="400" />')
        .addClass('gameboard')
        .appendTo('body')
        .off('click')
        .off('mousedown')
        .off('mouseup')
        .off('mousemove');
    var ctx = canvas.get(0).getContext('2d');
    
    var board = {
        'width': canvas.width(),
        'height': canvas.height()-50,
        'x': 0,
        'y': 50,
        'bg': canvas.css('background-color')
    };

    var socket = null;
    var id = null;
    var players = null;
    var bullets = {
        'self': null,
        'enemy': null
    };
    
    $.each(images.list, function(idx, res){
        var img = new Image();
        img.src = res;
        img.onload = function(){
            images.files[idx] = this;
            if(Object.keys(images.files).length == Object.keys(images.list).length){
                start();
            }
        }
        img.onerror = function(){
            clearScreen();
            drawText(145, (board.height/2), 24, 'Failed to load game resources');
        }
    });
	
    //screen utilities
    function clearScreen(){
        ctx.beginPath();
        ctx.rect(0, 0, canvas.get(0).width, canvas.get(0).height);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.closePath();
    }

    function drawText(x, y, size, text){
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.font = size + 'px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
    }

    //game logic
    function start(){
        clearScreen();
        drawText(140, 20, 36, 'Websocket Shooter');

		//draw button
        ctx.beginPath();
        ctx.rect((board.width/2 - 150/2), 300, 150, 40);
        ctx.fillStyle = '#0088ff';
        ctx.fill();
        ctx.strokeStyle = '#efefef';
        ctx.stroke();
        ctx.fillStyle = 'rgb(1,1,1)';
        ctx.font = 'bold 15px Arial';
        ctx.style = 'bold';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Connect', (board.width/2 - 150/2) + (150/2 - ((('Connect').length*8)/2)), 300 + (40/2 - 15/2));
        ctx.closePath();
        
        canvas.on('click', function(e){
            if(collisionDetect(
                {'x': getOffsetX(e), 'y': getOffsetY(e), 'width': 0, 'height': 0},
                {'x': (board.width/2 - 150/2), 'y': 300, 'width': 150, 'height': 40}
            )){
                canvas.off('click');
                login();
            }
        });
    }

    function login(){
        if(typeof io === 'undefined'){
            clearScreen();
            drawText(135, (board.height/2), 24, 'Failed to connect to game server');
        }
        else{
            socket = io.connect('http://localhost:7228');
            id = Math.floor(Math.random() * 50000000);
            
            socket.emit('clientlogin', id);
            
            socket.on('serverloginsuccess', function(data){
                socket.emit('clientattempt', id);
            });
            
            socket.on('serverplayerstatus', function (data){
                if(data.status == 'wait'){
                    clearScreen();
                    drawText(170, (board.height/2), 24, 'Waiting for other player');
                    window.setTimeout(function(){ socket.emit('clientattempt', id); }, 500);
                }
                else if(data.status == 'ready'){
                    var whitemage = {
                        'x': (board.width/2)-(50/2), 'y': (board.height/2)-(69),
                        'width': 50, 'height': 69,
                        'boundary': {'x':19, 'y':17, 'width':24, 'height':52},
                        'image': images.files.white,
                        'speed': 70                
                    };
                    
                    var blackmage = {
                        'x': (board.width/2)-(50/2), 'y': (board.height/2)-(69),
                        'width': 50, 'height': 69,
                        'boundary': {'x':14, 'y':4, 'width':24, 'height':52},
                        'image': images.files.black,
                        'speed': 70
                    };
                    
                    players = {};
                    
                    if(data.players[id].type == 1){
                        players.self = whitemage;
                        players.enemy = blackmage;
                    }
                    else if(data.players[id].type == 2){
                        players.self = blackmage;
                        players.enemy = whitemage;
                    }
                    
                    clearScreen();
                    ctx.drawImage(players.self.image, players.self.x, players.self.y);
                    drawText(175, (board.height/2) + 12, 24, 'Get ready to rumble!');
                    drawText(90, (board.height/2) + 48, 24, 'Arrow keys to move, mouse click to shoot');
                    
                    window.setTimeout(main, 5000);
                }
            });
        }
    }

    function main(){
        clearScreen();
        document.addEventListener("keydown", keydown, false);
        document.addEventListener("keyup", keyup, false);
        
        socket.emit('clientgame', id);
        
        socket.on('servergame', function(data){
            for(i in data.players){
                if(data.players.hasOwnProperty(i)){
                    if(i == id){
                        players.self.x = data.players[i].x;
                        players.self.y = data.players[i].y;
                        players.self.health = data.players[i].health;
                    }
                    else{
                        players.enemy.x = data.players[i].x;
                        players.enemy.y = data.players[i].y;
                        players.enemy.health = data.players[i].health;
                    }
                }
            }

            bullets.self = [];
            bullets.enemy = [];
            
            for(i in data.bullets){
                if(arrayHasOwnIndex(data.bullets, i)){
                    if(data.bullets[i].owner == id) bullets.self.push(data.bullets[i]);
                    else bullets.enemy.push(data.bullets[i]);
                }
            }
        });
        
        socket.on('serverend', function(data){
            clearScreen();
            window.clearInterval(gameinterval);
            drawText((board.width/2) - 80, (board.height/2) + 12, 24, 'You ' + data + '!');
            //disconnect from game
            socket.disconnect();
        });
        
        canvas.on('mousedown', function(e){
            if(mouses.state == 'up'){
                mouses.state = 'down';
                mouses.x = getOffsetX(e);
                mouses.y = getOffsetY(e);
            }
        });
        canvas.on('mouseup', function(e){
            if(mouses.state == 'down'){
                mouses.state = 'up';
                mouses.x = null;
                mouses.y = null;
            }
        });
        canvas.on('mousemove', function(e){
            if(mouses.state == 'down'){
                mouses.x = getOffsetX(e);
                mouses.y = getOffsetY(e);
            }
        });
    
        var gameinterval = window.setInterval(function(){ update(); render(); }, 1000/24);
    }

    function render(){
        clearScreen();
        //draw players
        for(i in players){
            if(players.hasOwnProperty(i)){
                var p = players[i];
                ctx.drawImage(p.image, p.x, p.y);
            }
        }
        //draw bullets - self and enemy
        for(i in bullets.self){
            if(arrayHasOwnIndex(bullets.self, i)){
                ctx.beginPath();
                ctx.arc(bullets.self[i].x, bullets.self[i].y, bullets.self[i].radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'yellow';
                ctx.fill();
            }
        }
        for(i in bullets.enemy){
            if(arrayHasOwnIndex(bullets.enemy, i)){
                ctx.beginPath();
                ctx.arc(bullets.enemy[i].x, bullets.enemy[i].y, bullets.enemy[i].radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.closePath();
            }
        }
        //draw HUD
        ctx.beginPath();
        ctx.moveTo(0,50);
        ctx.lineTo(600,50);
        ctx.fillStyle = 'white';
        ctx.stroke();
        ctx.closePath();
        //draw health
        drawText(50, 1, 20,  'Self');
        drawText(50, 25, 20, 'Enemy');
        drawText(180, 1, 20,  players.self.health);
        drawText(180, 25, 20, players.enemy.health);
    }
    
    function update(){
        var sendKey = new Array();
        
        if (38 in keys) { // Player holding up
            sendKey.push('up');
        }
        if (40 in keys) { // Player holding down
            sendKey.push('down');
        }
        if (37 in keys) { // Player holding left
            sendKey.push('left');
        }
        if (39 in keys) { // Player holding right
            sendKey.push('right');
        }
        
        socket.emit('clientupdate', {
            id: id,
            keys: sendKey,
            mouses: mouses
        });
    }

});
