// JS Game Sample

var WIDTH  = 320;
var HEIGHT = 480;

// -----------------------
// Menu

var MainMenu = function(highscore) {
    // handler = null;
    this.time = 0;
    this.highscore = highscore;
    // var self = this;
    // this.bg = new Image();
    // this.bg.onload = function() { handler = self; };
    // this.bg.src = "bg.jpg";
    handler = this;
}

MainMenu.prototype.tick = function(dt) {
    this.time += dt;
}

MainMenu.prototype.render = function(dt) {
    // ctx.drawImage(this.bg, 0, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FA6";
    ctx.fillText("Colorific!", canvas.width/2, 100);
    ctx.fillStyle = "#FFF";
    ctx.fillText("High:\n"+this.highscore, canvas.width/2, 250);
    if (Math.floor(this.time*2) % 2 == 0) {
        ctx.fillText("Tap to Start", canvas.width/2, 380);
    }
}

MainMenu.prototype.click = function(x, y) {
    new BoardGame(this.highscore);
}

var BOARD_GEMS_W = 7;
var BOARD_GEMS_H = BOARD_GEMS_W;
var GEM_WIDTH    = Math.floor(WIDTH/BOARD_GEMS_W);
var GEM_HEIGHT   = Math.floor(WIDTH/BOARD_GEMS_H);
var GRAVITY      = 10;
var FADESPEED    = 1;
var SHOWSPEED    = 1;
var BOARD_X      = (WIDTH-(GEM_WIDTH*BOARD_GEMS_W))/2;
var BOARD_Y      = 135;

// -----------------------
// Entities
// - tick(dt) where dt is seconds since last frame
// - render(dt) to render

var GemColors = [
    {r: 255, g:0, b:0},
    // {r: 0, g:255, b:0},
    {r: 0, g:200, b:0},
    // {r: 0, g:0, b:255},
    {r: 255, g:255, b:0},
    // {r: 255, g:0, b:255},
    // {r: 0, g:255, b:255},
    {r: 0, g:128, b:255},
];

var BoardGem = function(x, y, i, j, c, vy) {
    this.x        = x;
    this.y        = y;
    this.i        = i;
    this.j        = j;
    this.c        = c;
    this.vy       = vy || 0;
    this.moving   = false;
    this.selected = false;
}

BoardGem.prototype.tick = function(dt, fadeout) {
    var ty = this.i*GEM_HEIGHT;
    if (this.y < ty) {
        this.y += this.vy;
        this.vy += GRAVITY*dt;
        this.moving = true;
    }
    if (this.y >= ty) {
        this.y = ty;
        this.vy = 0;
        this.moving = false;
    }
};

BoardGem.prototype.render = function(dt) {
    var x = this.x + BOARD_X + GEM_WIDTH/2;
    var y = this.y + BOARD_Y + GEM_HEIGHT/2;
    var r = GEM_WIDTH/2;
    if (this.c == -1) {
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        for (var i = 1; i <= 8; ++i) {
            var a = Math.PI*2*i/8;
            var cr = (i & 1)? (r/2) : r;
            ctx.lineTo(x + cr*Math.cos(a), y + cr*Math.sin(a));
        }
        ctx.fill();
    } else {
        var c = GemColors[this.c];
        c = MakeColor(c.r, c.g, c.b);
        ctx.fillStyle = c;
        ctx.fillRect(x-r+2, y-r+2, r+r-4, r+r-4);
        // ctx.beginPath();
        // ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        // ctx.fill();
    }
};

var Explosion = function(x, y, c) {
    this.dead = false;
    this.x    = x;
    this.y    = y;
    this.c    = c;
    this.time = 0;
}

Explosion.prototype.tick = function(dt) {
    this.time += 2*dt;
    var t = 1 - this.time;
    this.dead = (this.time >= 1);
}

Explosion.prototype.render = function(dt) {
    var x = this.x + BOARD_X + GEM_WIDTH/2;
    var y = this.y + BOARD_Y + GEM_HEIGHT/2;
    var r = GEM_WIDTH/2;
    var c = GemColors[this.c];
    ctx.fillStyle = MakeColor(c.r, c.g, c.b);;
    var t = this.time+1;
    ctx.globalAlpha = Math.max(0, 1-this.time);
    ctx.beginPath();
    ctx.arc(x, y, r*t, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// -----------------------
// Game


var BoardGame = function(highscore) {
    handler = this;
    this.time        = 0;
    this.score       = 0;
    this.lastScore   = 0;
    this.highscore   = highscore;
    this.entities    = new EntityManager();
    this.turnsLeft   = 25;
    this.doubleColor = null;
    this.halfColor   = null;
    this.timeLeft    = 2000;

    this.board = [];
    for (var i = 0; i < BOARD_GEMS_H; ++i) {
        var l = [];
        for (var j = 0; j < BOARD_GEMS_W; ++j) {
            l.push(this.createGem(i, j, BOARD_GEMS_H));
        }
        this.board.push(l);
    }
    this.state = BoardGame.States.MOVING;
}

BoardGame.States = { MOVING: 0, PLAYER_TURN: 1, GAMEOVER: 2};

BoardGame.prototype.createGem = function(i, j, maxi) {
    return new BoardGem(j*GEM_WIDTH, (i-maxi)*GEM_HEIGHT - RandomFloat(GEM_HEIGHT), i, j, RandomInt(GemColors.length), RandomFloat(-1, 1));
};

BoardGame.prototype.tick = function(dt) {
    this.time += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);

    this.entities.tick(dt);

    var moving = false;
    for (var i = 0; i < BOARD_GEMS_H; ++i) {
        for (var j = 0; j < BOARD_GEMS_W; ++j) {
            var g = this.board[i][j];
            g.tick(dt, (this.state == BoardGame.States.PLAYER_TURN));
            moving = moving || g.moving;
        }
    }

    if (this.state == BoardGame.States.PLAYER_TURN) {
        if (this.turnsLeft <= 0) {
        // if (this.timeLeft <= 0) {
            this.state = BoardGame.States.GAMEOVER;
            this.highscore = Math.max(this.score, this.highscore);
            new GameOver(this);
        }
    } else if (this.state == BoardGame.States.MOVING) {
        if (!moving) {
            this.doubleColor = RandomInt(GemColors.length);
            do {
                this.halfColor = RandomInt(GemColors.length);
            } while (this.halfColor == this.doubleColor);
            this.state = BoardGame.States.PLAYER_TURN;
        }
    }
}

BoardGame.prototype.render = function(dt) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < BOARD_GEMS_H; ++i) {
        for (var j = 0; j < BOARD_GEMS_W; ++j) {
            var g = this.board[i][j];
            g.render(dt);
        }
    }
    this.entities.render(dt);

    ctx.fillStyle = "#FFF";
    ctx.font = "24px Arial";
    ctx.textAlign = "right";
    ctx.fillText("Score: " + this.score, canvas.width, 30);
    ctx.textAlign = "left";
    ctx.fillText("Turns Left: " + Math.floor(this.turnsLeft), 0, 30);
    // ctx.fillText("Time Left: " + Math.ceil(this.timeLeft), 0, 30);
    ctx.textAlign = "left";
    ctx.fillText("Last Score: " + this.lastScore, 0, HEIGHT-2);

    if (this.doubleColor !== null) {
        var c = GemColors[this.doubleColor];
        ctx.fillStyle = MakeColor(c.r, c.g, c.b);
        ctx.fillRect(30, 50, 120, 50);
        ctx.textAlign = "center";
        ctx.fillStyle = "#000";
        ctx.fillText("2x", 90+2, 80+2);
        ctx.fillStyle = "#FFF";
        ctx.fillText("2x", 90, 80);
    }
    if (this.halfColor !== null) {
        var c = GemColors[this.halfColor];
        ctx.fillStyle = MakeColor(c.r, c.g, c.b);
        ctx.fillRect(170, 50, 120, 50);
        ctx.textAlign = "center";
        ctx.fillStyle = "#000";
        ctx.fillText("1/2", 230+2, 80+2);
        ctx.fillStyle = "#FFF";
        ctx.fillText("1/2", 230, 80);
    }
}

BoardGame.prototype.selectGems = function(series, i, j, color) {
    if (i < 0 || i >= BOARD_GEMS_H || j < 0 || j >= BOARD_GEMS_W) {
        return series;
    }
    var g = this.board[i][j];
    if (g.c != color || g.selected) {
        return series;
    }
    g.selected = true;
    series.push(g);
    this.selectGems(series, i+1, j, color);
    this.selectGems(series, i-1, j, color);
    this.selectGems(series, i, j+1, color);
    this.selectGems(series, i, j-1, color);
    return series;
}

BoardGame.prototype.click = function(x, y) {
    // if (this.state == BoardGame.States.PLAYER_TURN && this.timeLeft > 0) {
    if (this.state == BoardGame.States.PLAYER_TURN && this.turnsLeft > 0) {
        var cj = Math.floor((x - BOARD_X)/GEM_WIDTH);
        var ci = Math.floor((y - BOARD_Y)/GEM_HEIGHT);
        if (ci >= 0 && ci < BOARD_GEMS_H && cj >= 0 && cj < BOARD_GEMS_W) {
            var cg = this.board[ci][cj];

            // Select contiguous gems
            var series = this.selectGems([], ci, cj, cg.c);

            // Check if all pieces of that color are selected
            var foundAll = true;
            for (var i = 0; i < BOARD_GEMS_H; ++i) {
                for (var j = 0; j < BOARD_GEMS_W; ++j) {
                    var g = this.board[i][j];
                    foundAll = foundAll && (g.selected || cg.c != g.c);
                }
            }

            // Set up scoring
            var score = 0;
            var scoreFactor = (series[0].c == this.doubleColor)? 2 : ((series[0].c == this.halfColor)? 0.5 : 1);
            if (foundAll) {
                scoreFactor *= 2;
            }
            // Blow up gems in the series
            for (var i = 0; i < series.length; ++i) {
                var g = series[i];
                score += (i+1);
                // Blow up this gem
                this.entities.add(new Explosion(g.x, g.y, g.c))
                this.board[g.i][g.j] = null;
                // Push downwards all gems above it 
                for (var bi = g.i-1; bi >= 0; --bi) {
                    var bg = this.board[bi][g.j];
                    if (bg) {
                        bg.i++;
                        this.board[bg.i][bg.j] = bg;
                        this.board[bi][g.j] = null;
                        bg.vy = -RandomFloat(1);
                    }
                }
            }
            this.lastScore = Math.floor(score*scoreFactor+0.5);
            this.score += this.lastScore;

            // Create new gems
            for (var i = 0; i < BOARD_GEMS_H; ++i) {
                for (var j = 0; j < BOARD_GEMS_W; ++j) {
                    var g = this.board[i][j];
                    if (g === null) {
                        this.board[i][j] = this.createGem(i, j, BOARD_GEMS_H);
                    }
                }
            }

            // Prepare for next turn
            this.state = BoardGame.States.MOVING;
            this.doubleColor = null;
            this.halfColor = null;
            this.turnsLeft--;
        }
    }
}

// -----------------------
// GameOver

var GameOver = function(game) {
    this.game = game;
    this.time = 0;
    handler = this;
}

GameOver.prototype.tick = function(dt) {
    this.time += dt;
    this.game.tick(dt);
}

GameOver.prototype.render = function(dt) {
    this.game.render(dt);
    ctx.font = "54px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText("Game Over", canvas.width/2+2, canvas.height/2+2);
    ctx.fillStyle = "#F00";
    ctx.fillText("Game Over", canvas.width/2, canvas.height/2);
}

GameOver.prototype.click = function(x, y) {
    if (this.time > 2)
        new MainMenu(this.game.highscore);
}


// -----------------------
// Startup

window.addEventListener("load", function() {
    InitCanvas("gamecontainer", WIDTH, HEIGHT, "canvas", "zoomfit");
    InitMainLoop();
    InitInput();

    new MainMenu(0);
});
