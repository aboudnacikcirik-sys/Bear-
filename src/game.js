const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const message = document.querySelector("#message");
const restartButton = document.querySelector("#restart");

const TILE = 48;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_SPEED = 3.1;
const BEAR_SPEED = 1.72;
const INTERACT_DISTANCE = 54;

const keys = new Set();
let gameState;
let lastTime = 0;

const walls = [
  { x: 0, y: 0, w: WIDTH, h: 28 },
  { x: 0, y: HEIGHT - 28, w: WIDTH, h: 28 },
  { x: 0, y: 0, w: 28, h: HEIGHT },
  { x: WIDTH - 28, y: 0, w: 28, h: HEIGHT },
  { x: 120, y: 104, w: 38, h: 318 },
  { x: 292, y: 28, w: 38, h: 214 },
  { x: 292, y: 350, w: 38, h: 122 },
  { x: 462, y: 128, w: 38, h: 332 },
  { x: 640, y: 28, w: 38, h: 176 },
  { x: 640, y: 304, w: 38, h: 190 },
  { x: 780, y: 104, w: 38, h: 330 },
  { x: 410, y: 68, w: 180, h: 32 },
  { x: 56, y: 484, w: 220, h: 32 },
  { x: 710, y: 504, w: 180, h: 32 },
];

const props = [
  { x: 60, y: 60, w: 52, h: 38, color: "#654321" },
  { x: 180, y: 448, w: 58, h: 34, color: "#5a3d2b" },
  { x: 525, y: 164, w: 48, h: 44, color: "#46392c" },
  { x: 830, y: 462, w: 54, h: 38, color: "#6d4b33" },
];

const puzzlesTemplate = [
  { x: 222, y: 72, label: "A" },
  { x: 548, y: 496, label: "B" },
  { x: 850, y: 74, label: "C" },
];

function circleRectCollision(circle, rect, radius = circle.r) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resetGame() {
  gameState = {
    status: "playing",
    player: { x: 78, y: 536, r: 16, facing: 0 },
    bear: { x: 884, y: 536, r: 25, step: 0, growl: 0 },
    puzzles: puzzlesTemplate.map((puzzle) => ({ ...puzzle, solved: false, progress: 0 })),
    gate: { x: 446, y: 16, w: 76, h: 20, open: false },
    sparks: [],
  };
  message.textContent = "Найди первый пазл. Медведь уже идёт!";
}

function tryMove(entity, dx, dy, radius) {
  const nextX = { ...entity, x: entity.x + dx };
  if (!walls.some((wall) => circleRectCollision(nextX, wall, radius))) {
    entity.x += dx;
  }

  const nextY = { ...entity, y: entity.y + dy };
  if (!walls.some((wall) => circleRectCollision(nextY, wall, radius))) {
    entity.y += dy;
  }
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    dx = (dx / length) * PLAYER_SPEED;
    dy = (dy / length) * PLAYER_SPEED;
    gameState.player.facing = Math.atan2(dy, dx);
    tryMove(gameState.player, dx, dy, gameState.player.r);
  }
}

function updateBear() {
  const { bear, player } = gameState;
  const dx = player.x - bear.x;
  const dy = player.y - bear.y;
  const length = Math.hypot(dx, dy) || 1;
  const huntSpeed = BEAR_SPEED + (gameState.puzzles.filter((p) => p.solved).length * 0.18);

  tryMove(bear, (dx / length) * huntSpeed, (dy / length) * huntSpeed, bear.r);
  bear.step += 0.13;
  bear.growl = Math.max(0, bear.growl - 1);

  if (distance(player, bear) < player.r + bear.r - 3) {
    gameState.status = "lost";
    message.textContent = "Медведь поймал тебя! Нажми 'Начать заново'.";
  }
}

function updateSparks() {
  gameState.sparks = gameState.sparks
    .map((spark) => ({ ...spark, life: spark.life - 1, y: spark.y - 0.6 }))
    .filter((spark) => spark.life > 0);
}

function solveNearbyPuzzle() {
  if (gameState.status !== "playing") return;

  const puzzle = gameState.puzzles.find((item) => !item.solved && distance(gameState.player, item) < INTERACT_DISTANCE);
  if (puzzle) {
    puzzle.progress += 1;
    gameState.sparks.push({ x: puzzle.x, y: puzzle.y, life: 24 });
    message.textContent = `Пазл ${puzzle.label}: ${puzzle.progress}/3. Продолжай нажимать E!`;

    if (puzzle.progress >= 3) {
      puzzle.solved = true;
      const solvedCount = gameState.puzzles.filter((item) => item.solved).length;
      message.textContent = `Пазл ${puzzle.label} решён! Осталось: ${gameState.puzzles.length - solvedCount}.`;

      if (solvedCount === gameState.puzzles.length) {
        gameState.gate.open = true;
        message.textContent = "Все пазлы готовы! Беги к открытым воротам сверху карты.";
      }
    }
    return;
  }

  if (gameState.gate.open && distance(gameState.player, { x: 484, y: 44 }) < 70) {
    gameState.status = "won";
    message.textContent = "Победа! Стикман сбежал от медведя.";
    return;
  }

  message.textContent = "Подойди ближе к светящемуся пазлу или к открытым воротам.";
}

function drawFloor() {
  ctx.fillStyle = "#20272d";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawMap() {
  drawFloor();

  props.forEach((prop) => {
    ctx.fillStyle = prop.color;
    ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(prop.x + 5, prop.y + 5, prop.w - 10, prop.h - 10);
  });

  walls.forEach((wall) => {
    ctx.fillStyle = "#11161a";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(wall.x, wall.y, wall.w, 5);
  });

  const gate = gameState.gate;
  ctx.fillStyle = gate.open ? "#5cff99" : "#ff5964";
  ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
  ctx.fillStyle = "#120f12";
  ctx.font = "bold 14px system-ui";
  ctx.fillText(gate.open ? "EXIT" : "LOCK", gate.x + 19, gate.y + 16);
}

function drawPuzzles() {
  gameState.puzzles.forEach((puzzle) => {
    const pulse = Math.sin(Date.now() / 180) * 4;
    ctx.save();
    ctx.translate(puzzle.x, puzzle.y);
    ctx.fillStyle = puzzle.solved ? "#39e37d" : "#4ed8ff";
    ctx.shadowColor = puzzle.solved ? "#39e37d" : "#4ed8ff";
    ctx.shadowBlur = puzzle.solved ? 18 : 10 + pulse;
    ctx.fillRect(-18, -18, 36, 36);
    ctx.restore();

    ctx.fillStyle = "#101418";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(puzzle.solved ? "✓" : puzzle.label, puzzle.x, puzzle.y + 6);
    ctx.textAlign = "start";
  });

  gameState.sparks.forEach((spark) => {
    ctx.globalAlpha = spark.life / 24;
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.arc(spark.x + Math.sin(spark.life) * 14, spark.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawStickman(player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facing);
  ctx.strokeStyle = "#f8f8ff";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(0, -23, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 12);
  ctx.moveTo(0, -2);
  ctx.lineTo(18, -10);
  ctx.moveTo(0, -2);
  ctx.lineTo(18, 9);
  ctx.moveTo(0, 12);
  ctx.lineTo(16, 28);
  ctx.moveTo(0, 12);
  ctx.lineTo(-14, 28);
  ctx.stroke();

  ctx.fillStyle = "#ffd36e";
  ctx.beginPath();
  ctx.arc(9, -26, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBear(bear) {
  const legSwing = Math.sin(bear.step) * 8;
  ctx.save();
  ctx.translate(bear.x, bear.y);

  ctx.fillStyle = "#8a4f2a";
  ctx.beginPath();
  ctx.ellipse(0, 4, 28, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6d371f";
  ctx.beginPath();
  ctx.arc(-17, -19, 10, 0, Math.PI * 2);
  ctx.arc(17, -19, 10, 0, Math.PI * 2);
  ctx.arc(0, -8, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3a1c13";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, 18);
  ctx.lineTo(-22, 34 + legSwing * 0.18);
  ctx.moveTo(14, 18);
  ctx.lineTo(22, 34 - legSwing * 0.18);
  ctx.moveTo(-24, 2);
  ctx.lineTo(-36, 14 + legSwing);
  ctx.moveTo(24, 2);
  ctx.lineTo(36, 14 - legSwing);
  ctx.stroke();

  ctx.fillStyle = "#f6e0b8";
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-8, -12, 3, 0, Math.PI * 2);
  ctx.arc(8, -12, 3, 0, Math.PI * 2);
  ctx.arc(0, -2, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, 5);
  ctx.quadraticCurveTo(0, 10, 7, 5);
  ctx.stroke();
  ctx.restore();
}

function drawOverlay() {
  const solved = gameState.puzzles.filter((puzzle) => puzzle.solved).length;
  ctx.fillStyle = "rgba(0,0,0,0.44)";
  ctx.fillRect(18, 18, 246, 70);
  ctx.fillStyle = "#fff4df";
  ctx.font = "bold 18px system-ui";
  ctx.fillText(`Пазлы: ${solved}/${gameState.puzzles.length}`, 34, 48);
  ctx.fillStyle = "#ffb23f";
  ctx.fillText(`Медведь: ${Math.round(distance(gameState.player, gameState.bear))} м`, 34, 74);

  if (gameState.status !== "playing") {
    ctx.fillStyle = "rgba(7, 5, 10, 0.68)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = gameState.status === "won" ? "#5cff99" : "#ff5964";
    ctx.font = "900 58px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(gameState.status === "won" ? "ПОБЕДА" : "ПОЙМАН", WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px system-ui";
    ctx.fillText("Нажми кнопку 'Начать заново'", WIDTH / 2, HEIGHT / 2 + 42);
    ctx.textAlign = "start";
  }
}

function draw() {
  drawMap();
  drawPuzzles();
  drawStickman(gameState.player);
  drawBear(gameState.bear);
  drawOverlay();
}

function loop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (gameState.status === "playing" && delta < 80) {
    updatePlayer();
    updateBear();
    updateSparks();
  }

  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) {
    event.preventDefault();
  }
  if (key === "e") {
    solveNearbyPuzzle();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

restartButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
