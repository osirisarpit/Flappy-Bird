
// Firebase imports
import { db, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy, limit } from './firebase-config.js';

//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 34; //width/height ratio = 408/228 = 17/12
let birdHeight = 24;
let birdX = boardWidth/8;
let birdY = boardHeight/2;
let birdImg;

let bird = {
    x : birdX,
    y : birdY,
    width : birdWidth,
    height : birdHeight
}

//pipes
let pipeArray = [];
let pipeWidth = 64; //width/height ratio = 384/3072 = 1/8
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -2; //pipes moving left speed
let velocityY = 0; //bird jump speed
let gravity = 0.4;

let gameOver = false;
let score = 0;
let gameStarted = false;

// Audio
let bgMusic;
let sfxWing;
let sfxPoint;
let sfxHit;
let sfxDie;

// Screen elements
let authScreen, loginScreen, createScreen, playScreen;
let currentUser = null;

// Google colors
const googleColors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

function createFloatingCircles() {
    const container = document.getElementById("circles-bg");
    const numCircles = 30;

    for (let i = 0; i < numCircles; i++) {
        const circle = document.createElement("div");
        circle.classList.add("circle");

        const size = Math.random() * 30 + 10; // 10px to 40px
        const color = googleColors[Math.floor(Math.random() * googleColors.length)];
        const left = Math.random() * 100;
        const duration = Math.random() * 15 + 10; // 10s to 25s
        const delay = Math.random() * 10; // 0s to 10s

        circle.style.width = size + "px";
        circle.style.height = size + "px";
        circle.style.backgroundColor = color;
        circle.style.left = left + "%";
        circle.style.animationDuration = duration + "s";
        circle.style.animationDelay = delay + "s";

        container.appendChild(circle);
    }
}

window.onload = function() {
    // Create floating circles
    createFloatingCircles();

    // Get screen elements
    authScreen = document.getElementById("auth-screen");
    loginScreen = document.getElementById("login-screen");
    createScreen = document.getElementById("create-screen");
    playScreen = document.getElementById("play-screen");
    board = document.getElementById("board");

    // Setup canvas
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    // Load images
    birdImg = new Image();
    birdImg.src = "./flappybird.png";

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";

    // Load audio
    bgMusic = new Audio("./bgm_mario.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.4;

    sfxWing = new Audio("./sfx_wing.wav");
    sfxWing.volume = 0.5;

    sfxPoint = new Audio("./sfx_point.wav");
    sfxPoint.volume = 0.5;

    sfxHit = new Audio("./sfx_hit.wav");
    sfxHit.volume = 0.5;

    sfxDie = new Audio("./sfx_die.wav");
    sfxDie.volume = 0.5;

    // Button listeners
    document.getElementById("login-btn").addEventListener("click", showLogin);
    document.getElementById("create-btn").addEventListener("click", showCreate);
    document.getElementById("play-btn").addEventListener("click", startGame);
    document.getElementById("logout-btn").addEventListener("click", logout);

    // Back buttons
    document.querySelectorAll(".back-btn").forEach(btn => {
        btn.addEventListener("click", showAuth);
    });

    // Form submissions
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("create-form").addEventListener("submit", handleCreate);
}

function hideAllScreens() {
    authScreen.classList.add("hidden");
    loginScreen.classList.add("hidden");
    createScreen.classList.add("hidden");
    playScreen.classList.add("hidden");
    board.classList.add("hidden");
}

function showAuth() {
    hideAllScreens();
    authScreen.classList.remove("hidden");
    document.getElementById("login-msg").textContent = "";
    document.getElementById("create-msg").textContent = "";
}

function showLogin() {
    hideAllScreens();
    loginScreen.classList.remove("hidden");
}

function showCreate() {
    hideAllScreens();
    createScreen.classList.remove("hidden");
}

function showPlayScreen(username) {
    currentUser = username;
    hideAllScreens();
    playScreen.classList.remove("hidden");
    document.getElementById("player-greeting").textContent = "Welcome, " + username + "!";
    loadLeaderboard();
}

function logout() {
    currentUser = null;
    showAuth();
}

// Leaderboard functions
async function loadLeaderboard() {
    const listEl = document.getElementById("leaderboard-list");
    listEl.innerHTML = '<p class="loading">Loading...</p>';

    try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const players = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            players.push({
                username: data.username,
                highScore: data.highScore || 0
            });
        });

        // Sort by highScore descending
        players.sort((a, b) => b.highScore - a.highScore);

        // Render
        if (players.length === 0) {
            listEl.innerHTML = '<p class="loading">No players yet</p>';
            return;
        }

        listEl.innerHTML = players.map((p, i) => {
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const userClass = p.username === currentUser ? 'current-user' : '';
            return `<div class="leaderboard-row ${userClass}">
                <span class="leaderboard-rank ${rankClass}">${i + 1}</span>
                <span class="leaderboard-name">${p.username}</span>
                <span class="leaderboard-score">${p.highScore}</span>
            </div>`;
        }).join('');
    } catch (err) {
        console.error("Leaderboard error:", err);
        listEl.innerHTML = '<p class="loading">Failed to load</p>';
    }
}

async function saveHighScore(username, newScore) {
    try {
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            if (newScore > (data.highScore || 0)) {
                await updateDoc(userRef, { highScore: newScore });
            }
        }
    } catch (err) {
        console.error("Save score error:", err);
    }
}

function startGame() {
    hideAllScreens();
    board.classList.remove("hidden");

    // Start background music
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {}); // catch handles autoplay restrictions

    if (!gameStarted) {
        gameStarted = true;
        birdImg.onload = function() {
            context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
        }
        requestAnimationFrame(update);
        setInterval(placePipes, 1500);
        document.addEventListener("keydown", moveBird);
        document.addEventListener("mousedown", moveBird);
        document.addEventListener("touchstart", moveBird);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const msgEl = document.getElementById("login-msg");

    msgEl.style.color = "#5f6368";
    msgEl.textContent = "Logging in...";

    try {
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().password === password) {
            msgEl.style.color = "#34A853";
            msgEl.textContent = "Login successful!";
            setTimeout(() => {
                showPlayScreen(username);
                msgEl.textContent = "";
            }, 500);
        } else {
            msgEl.style.color = "#EA4335";
            msgEl.textContent = "Invalid username or password.";
        }
    } catch (err) {
        console.error("Login error:", err);
        msgEl.style.color = "#EA4335";
        msgEl.textContent = "Login failed. Try again.";
    }
}

async function handleCreate(e) {
    e.preventDefault();
    const username = document.getElementById("create-username").value;
    const password = document.getElementById("create-password").value;
    const confirm = document.getElementById("create-confirm").value;
    const msgEl = document.getElementById("create-msg");

    if (password !== confirm) {
        msgEl.style.color = "#EA4335";
        msgEl.textContent = "Passwords do not match.";
        return;
    }

    msgEl.style.color = "#5f6368";
    msgEl.textContent = "Creating account...";

    try {
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            msgEl.style.color = "#EA4335";
            msgEl.textContent = "Username already exists.";
            return;
        }

        await setDoc(userRef, {
            username: username,
            password: password,
            highScore: 0
        });

        msgEl.style.color = "#34A853";
        msgEl.textContent = "Account created!";
        setTimeout(() => {
            showPlayScreen(username);
            msgEl.textContent = "";
        }, 500);
    } catch (err) {
        console.error("Create error:", err);
        msgEl.style.color = "#EA4335";
        msgEl.textContent = "Failed to create account. Try again.";
    }
}

function update() {
    requestAnimationFrame(update);
    if (gameOver) {
        return;
    }
    context.clearRect(0, 0, board.width, board.height);

    //bird
    velocityY += gravity;
    // bird.y += velocityY;
    bird.y = Math.max(bird.y + velocityY, 0); //apply gravity to current bird.y, limit the bird.y to top of the canvas
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) {
        gameOver = true;
        bgMusic.pause();
        sfxHit.play().catch(() => {});
        sfxDie.play().catch(() => {});
        if (currentUser) saveHighScore(currentUser, score);
    }

    //pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
            pipe.passed = true;
            sfxPoint.currentTime = 0;
            sfxPoint.play().catch(() => {});
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
            bgMusic.pause();
            sfxHit.play().catch(() => {});
            sfxDie.play().catch(() => {});
            if (currentUser) saveHighScore(currentUser, score);
        }
    }

    //clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift(); //removes first element from the array
    }

    //score
    context.fillStyle = "white";
    context.font="45px sans-serif";
    context.fillText(score, 5, 45);

    if (gameOver) {
        context.fillText("GAME OVER", 5, 90);
    }
}

function placePipes() {
    if (gameOver) {
        return;
    }

    //(0-1) * pipeHeight/2.
    // 0 -> -128 (pipeHeight/4)
    // 1 -> -128 - 256 (pipeHeight/4 - pipeHeight/2) = -3/4 pipeHeight
    let randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2);
    let openingSpace = board.height/4;

    let topPipe = {
        img : topPipeImg,
        x : pipeX,
        y : randomPipeY,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(topPipe);

    let bottomPipe = {
        img : bottomPipeImg,
        x : pipeX,
        y : randomPipeY + pipeHeight + openingSpace,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    if (e.type === "keydown") {
        if (e.code !== "Space" && e.code !== "ArrowUp" && e.code !== "KeyX") {
            return;
        }
        e.preventDefault();
    }

    // jump
    velocityY = -6;

    // Play wing sound
    sfxWing.currentTime = 0;
    sfxWing.play().catch(() => {});

    // reset game
    if (gameOver) {
        bird.y = birdY;
        pipeArray = [];
        score = 0;
        gameOver = false;
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => {});
    }
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&   //a's top left corner doesn't reach b's top right corner
           a.x + a.width > b.x &&   //a's top right corner passes b's top left corner
           a.y < b.y + b.height &&  //a's top left corner doesn't reach b's bottom left corner
           a.y + a.height > b.y;    //a's bottom left corner passes b's top left corner
}