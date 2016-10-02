var debugFlag = false;
var debugDrawFlag = false;

function debugLog() {
    console.log("Debug Logged!");
}

function setupCanvas() {
    var canvas = document.getElementById("cvs");
    var width = getWidth() - 7;
    var height = getHeight() - 7;

    if (debugFlag) {
        console.log("Window height found to be: " + height)
        console.log("Window width found to be: " + width)
    }
    canvas.width = width;
    canvas.height = height;

    return canvas;
}

function gameController(canvas) {
    this.gameRunning = true;
    this.canvas = canvas;
    this.wpm = 30;
    this.wordContainer = [];
    this.currentWord = '';
    this.buffer = '';
    this.score = 0;
    this.health = 100;
    this.clears = 0;
    this.clearChance = 5;
    this.modChance = 5;
    this.scoreMultiplier = 1;

    this.doubleTime = false;
    this.slowMo = false;
    this.downpour = false;
    this.cascade = false;
    this.overload = false;
    this.blur = false;
    this.upPour = false;

}

function wordObj(text, x, y) {
    this.text = text;
    this.value = text.length;
    this.x = x;
    this.y = y;
    this.speed = (Math.random() * (controller.score / 100)) + 1; //Using globals again... (Laziness > desire for good practice) : True
    if (Math.random() > 0.5) {
        this.cascadeDir = 3;
    } else {
        this.cascadeDir = -3;
    }
}
gameController.prototype.resetModifiers = function () {
    this.doubleTime = false;
    this.slowMo = false;
    this.downpour = false;
    this.overload = false;
    this.blur = false;
    this.cascade = false;
    this.upPour = false;
    downpour(false);
}

gameController.prototype.addWord = function () {
    if (this == window) {
        var that = controller; //SUPER HOKEY way to avoid setTimeout from using global window context...
    } else {
        var that = this;
    }

    var timeUntilNextWord = ((60 / that.wpm) * 1000)

    if (Math.random() < (that.clearChance / 100)) { //Roll for clear chance
        var word = new wordObj("CLEAR", Math.floor(Math.random() * (that.canvas.width - 300)), 30);
        that.wordContainer.push(word);
        window.setTimeout(that.addWord, timeUntilNextWord);
        return word;
    }
    if (Math.random() < (that.modChance / 100)) { //Roll for modifier. If failed, up the chance!
        var word = new wordObj("MODIFIER", Math.floor(Math.random() * (that.canvas.width - 300)), 30);
        that.wordContainer.push(word);
        window.setTimeout(that.addWord, timeUntilNextWord);
        return word;
    } else { that.modChance++; }

    var lengthOfArr = fullWordListArr.length;
    var text = fullWordListArr[Math.floor(Math.random() * lengthOfArr)]; //Grab a random word from wordlist in words.js

    var x = Math.floor(Math.random() * (that.canvas.width - 300)); //Grab random x coordinate within canvas

    var word = new wordObj(text, x, 30);

    that.wordContainer.push(word);

    //Override time if not special
    timeUntilNextWord = ((60 / that.wpm) * 1000) + (100 * word.text.length); //In milliseconds, so 60 seconds / words per minute, * 1000 milliseconds/sec

    if (that.gameRunning) {
        window.setTimeout(that.addWord, timeUntilNextWord); //Break our timer if game is over
    }

    if (debugFlag) { console.log("Pushing word: " + word.text + " to gameController.") }
    return word;
}

/* -------------- Game Logic ---------------- */

//Main program loop
function mainLoop() {
    requestAnimationFrame(mainLoop);

    now = Date.now();
    elapsed = now - then; // if enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {
        // Get ready for next frame by setting then=now, but also adjust for 
        // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
        then = now - (elapsed % fpsInterval);

        updatePositions(controller); //Update all word locations!
        updateWords(controller); //Checks for completed words
        draw(controller); //Draw to the screen!
        if (controller.health <= 0) { gameOver(); } //Run game over if health is 0

        if (controller.gameRunning) {
            requestAnimationFrame(mainLoop); //Loop again when browser is ready. 60FPS if possible
        }
    }
}

function updatePositions(gameController) {
    var wordsArr = gameController.wordContainer;
    var multiplier = 1.0;
    if (gameController.doubleTime) { multiplier = multiplier * 1.25; }
    if (gameController.slowMo) { multiplier = multiplier / 2; }

    for (var i = 0; i < wordsArr.length; i++) {
        var currentWord = wordsArr[i];
        if (currentWord === undefined) { //Catch errors
            return;
        }

        currentWord.y += currentWord.speed * multiplier;

        if (gameController.cascade) {
            currentWord.x += currentWord.cascadeDir;
            if (currentWord.x > gameController.canvas.width - 100 || currentWord.x < 10) {
                currentWord.cascadeDir = (currentWord.cascadeDir * -2);
                if (currentWord.cascadeDir > 20 || currentWord.cascadeDir < -20) {
                    currentWord.cascadeDir = currentWord.cascadeDir * 0.5;
                }
            }
        }

        if (currentWord.y >= gameController.canvas.height - 10) {
            gameController.health -= currentWord.value;
            wordsArr.splice(i, 1);
            if (currentWord.text.startsWith(gameController.buffer)) { gameController.buffer = ''; } //Only reset buffer if it is current word
        }
    }
}

function updateWords(gameController) {
    var wordsArr = gameController.wordContainer;

    for (var i = 0; i < wordsArr.length; i++) {
        var currentWord = wordsArr[i];
        if (currentWord === undefined) {
            return;//Catch errors
        }
        if (currentWord.text == gameController.buffer) { // If complete buffer word found in array
            wordsArr.splice(i, 1);
            gameController.score += currentWord.value * gameController.scoreMultiplier;
            gameController.wpm += (currentWord.value / 10);
            if (gameController.buffer == "CLEAR") {
                gameController.clears++;
            }
            if (gameController.buffer == "MODIFIER") {
                gameController.modChance = 0;
                randomModifier(gameController);
            }
            gameController.buffer = ''; //Reset buffer
            return;
        }
    }
}

function draw(gameController) {
    var canvas = gameController.canvas;
    clear(canvas, '#111111'); //Clear the canvas

    var ctx = canvas.getContext('2d');
    ctx.font = "30px Arial";
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FF0000';

    if (gameController.blur) { canvas.style.webkitFilter = "blur(2px)"; } //Blur effect!
    else{
        canvas.style.webkitFilter = "blur(0px)";  //Blur effect!
    }

    var wordsArr = gameController.wordContainer;
    for (var i = 0; i < wordsArr.length; i++) {
        var currentWord = wordsArr[i];
        if (currentWord === undefined) { //Catch errors
            return;
        }
        var text = currentWord.text;

        ctx.strokeText(currentWord.text, currentWord.x, currentWord.y);

        if (currentWord.text == "CLEAR") {
            ctx.fillStyle = '#0000FF';
            ctx.fillText(currentWord.text, currentWord.x, currentWord.y);
            ctx.fillStyle = '#FF0000';
        }
        if (currentWord.text.startsWith(gameController.buffer)) { //Fill characters of words matching buffer...
            ctx.fillText(gameController.buffer, currentWord.x, currentWord.y);
        }

        if (debugDrawFlag) {
            console.log("Drawing " + currentWord.text + " @ " + currentWord.x + " , " + currentWord.y)
        }

    }

    //Health bar
    ctx.fillStyle = "#00DD11";
    ctx.fillRect(10, gameController.canvas.height - 75, (gameController.health / 100) * (gameController.canvas.width - 40), 35);
    ctx.fillStyle = "#111111"; //Set back for clearing screen? Doesn't work if we dont do this...
    //

    if (debugFlag) {
        ctx.strokeText(gameController.buffer, 10, gameController.canvas.height - 100);
        ctx.strokeText("Score: " + String(gameController.score), 200, gameController.canvas.height - 100)
    } else {
        ctx.strokeText("Score: " + String(gameController.score), 10, gameController.canvas.height - 100)
    }
    ctx.strokeText("Clears: " + String(gameController.clears), 10, gameController.canvas.height - 150)

    // Modifiers
    ctx.strokeStyle = '#FFFF00';
    var pad = 200;
    var padPer = 50;
    if (gameController.doubleTime) { ctx.strokeText("Double Time", pad, gameController.canvas.height - 100); }
    pad += ctx.measureText('Double Time').width+ padPer;
    if (gameController.slowMo) { ctx.strokeText("Slow Mo", pad, gameController.canvas.height - 100); }
    pad += ctx.measureText('Slow Mo').width+ padPer;
    if (gameController.downpour) { ctx.strokeText("Downpour", pad, gameController.canvas.height - 100); }
    pad += ctx.measureText('Downpour').width+ padPer;
    if (gameController.cascade) { ctx.strokeText("Cascade", pad, gameController.canvas.height - 100); }
    pad += ctx.measureText('Cascase').width+ padPer;
    if (gameController.overload) { ctx.strokeText("Overload", pad, gameController.canvas.height - 100); }
    pad += ctx.measureText('Overload').width+ padPer;
    if (gameController.blur) { ctx.strokeText("Blur", pad, gameController.canvas.height - 100); }
    pad += ctx.measureText('Blur').width+ padPer;
    if (gameController.upPour) { ctx.strokeText("UpPour", pad, gameController.canvas.height - 100); }
    pad += ctx.measureText('YpPour').width+ padPer;

    if (debugDrawFlag) { console.log("Draw Complete.") }

    rainDraw();
}

function gameOver() {
    clear(controller.canvas, '#111111');
    var canvas = controller.canvas;
    clear(canvas, '#111111'); //Clear the canvas

    var ctx = canvas.getContext('2d');
    ctx.font = "60px Arial";
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#BBBBBB';

    var xCenter = (canvas.width / 2) - 250;
    var yCenter = canvas.height / 2;
    ctx.fillText("Game Over!", xCenter, yCenter)
    ctx.fillText("Score: " + controller.score, xCenter, yCenter + 75)
    ctx.fillText("Press <Spacebar> to continue", xCenter - 250, yCenter + 150)

    controller.gameRunning = false;

}
function resetGame() {
    controller = new gameController(canvas);
    controller.resetModifiers();
    setTimeout(controller.addWord, 1000);
    requestAnimationFrame(mainLoop);

    document.getElementById("menu-text").className = "menu-text text-center fadeOut"
}
function useClear(gameController) {
    gameController.clearChance = gameController.clearChance / 2;
    gameController.clears--;
    controller.wordContainer = []; //Empty the whole dang container
    gameController.buffer = ''; //Reset buffer
    gameController.resetModifiers();
}


/* =========== Start of Code ==================*/
var fps, fpsInterval, startTime, now, then, elapsed;
fps = 60;
var canvas = setupCanvas();
var controller = new gameController(canvas);
controller.gameRunning = false;

fpsInterval = 1000 / fps;
then = Date.now();
startTime = then;

mainLoop();



/* ----------------- Utility Functions ----------------*/

function getWidth() { //This function finds the width of the browser window... since it is different for all browsers
    if (self.innerWidth) {
        return self.innerWidth;
    }

    if (document.documentElement && document.documentElement.clientWidth) {
        return document.documentElement.clientWidth;
    }

    if (document.body) {
        return document.body.clientWidth;
    }
}

function getHeight() {//This function finds the height of the browser window... since it is different for all browsers
    if (self.innerHeight) {
        return self.innerHeight;
    }

    if (document.documentElement && document.documentElement.clientHeight) {
        return document.documentElement.clientHeight;
    }

    if (document.body) {
        return document.body.clientHeight;
    }
}

function clear(canvas, fillstyle) {
    var ctx = canvas.getContext("2d");
    ctx.fillstyle = fillstyle;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}


document.onkeypress = function (evt) { // This function will run when any k ey is pressed!
    evt = evt || window.event;
    var charCode = evt.keyCode || evt.which;
    var charStr = String.fromCharCode(charCode);

    if (debugFlag) { console.log("Key pressed: " + charStr); }

    addKeyToBuffer(charStr);

    if ((!controller.gameRunning) && charCode == 32) { //spacebar
        resetGame();
    }

    if ((controller.gameRunning) && charCode == 32 && controller.clears > 0) { //spacebar
        useClear(controller);;
    }
};

function addKeyToBuffer(char) {
    var wordsArr = controller.wordContainer;
    for (var i = 0; i < wordsArr.length; i++) {
        var currentWord = wordsArr[i];
        if (currentWord.text.startsWith(controller.buffer + char)) { //If we drop in here, we have found a matching word to the buffer
            controller.buffer += char;
            if (debugFlag) { console.log("Adding: " + char + " to the buffer. Buffer now: " + controller.buffer); }
            return controller.buffer;
        }
    }

    if (debugFlag) { console.log("Not adding: " + char + " to the buffer;"); }
}

function rain() {
    this.drops = [];
}
function drop(x, y) {
    this.x = x;
    this.y = y;
}


/* ------------------ Modifiers!!! -------------------*/
function randomModifier(gameController) {
    var modifierAmt = 7;

    var selection = Math.random() * modifierAmt;

    if (selection <= 1) { // Doubletime!
        gameController.doubleTime = !gameController.doubleTime;
    }
    if (selection > 1 && selection <= 2) { // Slow Mo!
        gameController.slowMo = !gameController.slowMo;
    }
    if (selection > 2 && selection <= 3) { // Downpour!
        gameController.downpour = !gameController.downpour;
        if (gameController.downpour) { downpour(true); }
        else { downpour(false); }
    }
    if (selection > 3 && selection <= 4) { // Cascade!
        gameController.cascade = !gameController.cascade;
    }
    if (selection > 4 && selection <= 5) { // Overload!
        gameController.overload = !gameController.overload;
    }
    if (selection > 5 && selection <= 6) { // Blur!!
        gameController.blur = !gameController.blur;
    }
    if (selection > 6 && selection <= 7) { // upPour!!
        gameController.upPour = !gameController.upPour;
    }
}



// Rain functions
if (canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.strokeStyle = 'rgba(174,194,224,0.5)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';


    var init = [];
    var maxParts = 200;
    for (var a = 0; a < maxParts; a++) {
        init.push({
            x: Math.random() * w,
            y: Math.random() * h,
            l: Math.random() * 1,
            xs: -4 + Math.random() * 4 + 2,
            ys: Math.random() * 10 + 10
        })
    }

    function downpour(boolean) {
        if (boolean) {
            for (var a = 0; a < 1000; a++) {
                init.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    l: Math.random() * 1,
                    xs: -4 + Math.random() * 4 + 2,
                    ys: Math.random() * 10 + 10
                })
            }
            particles = [];
            for (var b = 0; b < 1000; b++) {
                particles[b] = init[b];
            }
        } else {
            if (init.length > 200) {
                for (var a = 0; a < 1000; a++) {
                    init.pop();
                }
            }

            particles = [];
            for (var b = 0; b < maxParts; b++) {
                particles[b] = init[b];
            }
        }

    }


    var particles = [];
    for (var b = 0; b < maxParts; b++) {
        particles[b] = init[b];
    }

    function rainDraw() {
        for (var c = 0; c < particles.length; c++) {
            var p = particles[c];
            ctx.strokeStyle = "#0055FF";
            if (controller.overload) {
                ctx.strokeStyle = '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
            }
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            if(controller.upPour){
                ctx.lineTo(p.x + p.l * p.xs, p.y + p.l * (-1 * p.ys));
            }else{
               ctx.lineTo(p.x + p.l * p.xs, p.y + p.l * p.ys); 
            }
            ctx.stroke();
        }
        rainMove();
    }

    function rainMove() {
        for (var b = 0; b < particles.length; b++) {
            var p = particles[b];
            p.x += p.xs;
            
            if(controller.upPour){
                p.y -= p.ys;
                if (p.x > w || p.y < 0) {
                    p.x = Math.random() * w;
                    p.y = h + 20;
                }
            }else{
                p.y += p.ys;
                if (p.x > w || p.y > h) {
                    p.x = Math.random() * w;
                    p.y = -20;
                }
            }
            
        }
    }
}













