// ------------------------------------------------
// JavaScript canvas game / prototype microlibrary
//   Copyright (c) 2011-2014 Javier Arevalo

// This software is released under the MIT license: 
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// ------------------------------------------------
// Helpers
// ------------------------------------------------

function LOG(a) {console.log((typeof a != "object")? a : JSON.stringify(a));}
function DeepClone(o) { return JSON.parse(JSON.stringify(o)); }
function MakeColor(r,g,b) { return "rgb("+Math.floor(Clamp(r, 0, 255))+","+Math.floor(Clamp(g, 0, 255))+","+Math.floor(Clamp(b, 0, 255))+")"; }
function MakeColorRGBA(r,g,b,a) { return "rgba("+Math.floor(Clamp(r, 0, 255))+","+Math.floor(Clamp(g, 0, 255))+","+Math.floor(Clamp(b, 0, 255))+","+Clamp(a, 0, 1)+")"; }
function MakeColorFactor(r,g,b, f) { return "rgb("+Math.floor(Clamp(r*f, 0, 255))+","+Math.floor(Clamp(g*f, 0, 255))+","+Math.floor(Clamp(b*f, 0, 255))+")"; }
function Sign(v) { return (v < 0)? -1 : ((v > 0)? 1 : 0); }
function Signx(v) { return (v < 0)? -1 : 1; }
function Modx(a, b) { var c = a % b; if (c < 0) c = b+c; return c; }
function Pow2(v) { return v*v; }
function Lerp(a,b,t) { return a+(b-a)*t; }
function Clamp(v,a,b) { return Math.max(a,Math.min(v,b)); }
function Wrap(v,a,b) { return v<a? (v+(b-a)) : (v>b? (v-(b-a)) : v); }
function RandomInt(v) { return Math.floor(Math.random()*v); }
function RandomIntRange(a,b) { return Math.floor(Math.random()*(b-a)+a); }
function RandomFloat(v) { return Math.random()*v; }
function RandomFloatRange(a,b) { return Math.random()*(b-a)+a; }
function RandomFloatRangeSym(a,b) { var v = Math.random()*2-1; return (v > 0)? (v*(b-a)+a) : (v*(b-a)-a); }
function RandomColor(min, max) { return MakeColor(RandomIntRange(min, max), RandomIntRange(min, max), RandomIntRange(min, max)); }
function RandomAngle() { return Math.random()*3.1415*2; }
function PointInRect(x, y, rx, ry, rw, rh) { return x >= rx && x < (rx+rw) && y >= ry && y < (ry+rh);}
function ArraySwap(a, i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; }
function CheckDistance(x,y,r) { return (x*x + y*y < r*r); }

// ------------------------------------------------
// Number / array / string utils
// ------------------------------------------------

var d2h = function(d) { return d.toString(16);}
var h2d = function(h) { return parseInt(h, 16);}

function ZeroPadNumber(n, l) {
    var s = n.toString();
    var len = l - s.length;
    return len > 0 ? new Array(len + 1).join('0') + s : s;
}

function NewFilledArray(length, val) {
    var array = [];
    for (var i = 0; i < length; i++) {
        array[i] = val;
    }
    return array;
}

function StringFormat(fmt, args) {
  return fmt.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
}

// ------------------------------------------------
// Browser stuff & compat
// ------------------------------------------------

// Helper to provides requestAnimationFrame in a cross browser way.
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
if ( !window.requestAnimationFrame ) {
    window.requestAnimationFrame = ( function() {
        return window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
            window.setTimeout( callback, 1000 / 60 );
        };
    } )();
}

// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
function GetParameterByName(name, defvalue)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return defvalue;
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

// ------------------------------------------------
// Game microengine
// ------------------------------------------------

var canvas, ctx; // Rendering

// Assign to this object to receive callbacks:
// - tick(dt) where dt is seconds since last frame
// - render(dt) conveniently separated from tick()
// - click(x, y) where x, y are click coordinates in canvas space
var handler;

// sizePolicy can be: "none", "zoomfit", "resizefit", "resizefill"
var InitCanvas = function(container, width, height, className, sizePolicy) {
    var containerElement = document.getElementById(container) || document.body;
    sizePolicy = sizePolicy || "zoomfit";
    canvas = document.createElement('canvas');
    // Handle error here for old browsers
    canvas.width = width;
    canvas.height = height;
    canvas.className = className;
    ctx = canvas.getContext("2d");
    containerElement.appendChild(canvas);

    if (sizePolicy != "none") {
        function resize() {
            var ww = window.document.body.clientWidth;
            var wh = window.document.body.clientHeight;
            var wr = ww/wh;
            var cr = width/height;
            var csw = width, csh = height;
            if (sizePolicy == "zoomfit") {
                if (wr > cr) {
                    csw = Math.floor(wh*cr);
                    csh = wh;
                } else {
                    csw = ww;
                    csh = Math.floor(ww/cr);
                }
            } else if (sizePolicy == "resizefill") {
                csw = ww;
                csh = wh;
                canvas.width = csw;
                canvas.height = csh;
            } else  if (sizePolicy == "resizefit") {
                if (wr > cr) {
                    csw = Math.floor(wh*cr);
                    csh = wh;
                } else {
                    csw = ww;
                    csh = Math.floor(ww/cr);
                }
                canvas.width = csw;
                canvas.height = csh;
            }
            canvas.style.width = "" + csw + "px";
            canvas.style.height = "" + csh + "px";
            // Leave positioning to the CSS engine
            //canvas.style.top = "0";
            //canvas.style.left = "" + Math.floor((ww-csw)/2) + "px";
        }
        resize();
        window.addEventListener("resize", resize);
        document.addEventListener("orientationChanged", resize);
    }
}

var InitMainLoop = function() {
    var oldTime = Date.now();
    (function tick() {
        var newTime = Date.now();
        var dt = (newTime-oldTime)/1000;
        if (handler && handler.tick) {
            handler.tick.call(handler, dt);
        }
        if (handler && handler.render) {
            handler.render.call(handler, dt);
        }
        oldTime = newTime;
        window.requestAnimationFrame(tick);
    })();
}

var ClientToCanvas = function(x,y) {
    var r = canvas.getBoundingClientRect();
    return [(x-r.left)*canvas.width/r.width,
            (y-r.top)*canvas.height/r.height];
}

var InitInput = function() {
    var hasTouch = false; // Touch devices also emulate click(). Avoid duplicates.
    var handleMouse = function(evt) {
        if (hasTouch)
            return;
        if (handler && handler.click)
            handler.click.apply(handler, ClientToCanvas(evt.clientX, evt.clientY));
    }
    var handleTouch = function(evt) {
        hasTouch = true;
        if (handler && handler.click)
            handler.click.apply(handler, ClientToCanvas(evt.touches[0].pageX, evt.touches[0].pageY));
        evt.preventDefault();
    }
    window.addEventListener("click", handleMouse);
    window.addEventListener("touchstart", handleTouch);
}

// ------------------------------------------------
// Entity microengine
// ------------------------------------------------

// Entities are regular objects that may optionally have:
//   layer: for rendering order, lower == below
//   dead: true if entity should be removed
//   tick(dt): logic
//   render(dt): rendering

// Call the manager:
//   add(entity): add a new entity to the manager
//   tick(dt): run logic on entities and refresh
//   refresh(dt): add newly created entities, kill dead entities
//   You only may need to manually call refresh() if you create/kill entities after tick()

var EntityManager = function() {
    this.entities = [];
    this.newEntities = [];
}

EntityManager.prototype.add = function(e) {
    this.newEntities.push(e);
}

EntityManager.prototype.refresh = function(dt) {
    while (this.newEntities.length > 0) {
        var newe = this.newEntities;
        this.newEntities = [];
        for (var i = 0; i < newe.length; ++i) {
            var e = newe[i];
            if (!e.dead) {
                this.entities.push(e)
                if (e.tick)
                    e.tick(dt);
            }
        }
    }

    for (var i = this.entities.length-1; i >= 0; --i) {
        if (this.entities[i].dead)
            this.entities.splice(i, 1);
    }
}

EntityManager.prototype.tick = function(dt) {
    for (var i = 0; i < this.entities.length; ++i) {
        var e = this.entities[i];
        if (e.tick)
            e.tick(dt);
    }
    this.refresh(dt);
}

EntityManager.prototype.render = function(dt) {
    // Naive sorting of entities in layers
    var layersDict = {};
    var layers = [];
    for (var i = 0; i < this.entities.length; ++i) {
        var e = this.entities[i];
        if (!e.dead && e.render) {
            if (typeof e.layer == "undefined") {
                e.render(dt); // No layer, render below everything with layers
            } else {
                l = layersDict[e.layer];
                if (l) {
                    l.push(e);
                } else {
                    layersDict[e.layer] = [e];
                    layers.push(e.layer);
                }
            }
        }
    }
    layers.sort();
    for (var i = 0; i < layers.length; ++i) {
        var layer = layersDict[layers[i]];
        for (var j = 0; j < layer.length; ++j) {
            layer[j].render(dt);
        }
    }
}
