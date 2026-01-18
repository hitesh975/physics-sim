const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const PXM = 200;
const gravity = 9.81;
const epsilon = 0.07;
let last_time = performance.now();
const canvasHeight = canvas.height - 40; //accounting for command panel height
const floor_Y = canvasHeight / PXM;
const ground_friction = 1;
const RightWall = canvas.width / PXM;
const ground_mode = true;
ball_mode = true;

function handleCommand(command) {
  const args = command.split(" ");

  if (args[0] !== "spawn" || args[1] !== "circle") return;

  function valueOf(key, fallback) {
    const i = args.indexOf(key);
    return i !== -1 ? parseFloat(args[i + 1]) : fallback;
  }

  function wordOf(key, fallback) {
    const i = args.indexOf(key);
    return i !== -1 ? args[i + 1] : fallback;
  }

  balls.push(
    createBall(
      valueOf("x", 2),
      valueOf("y", 2),
      valueOf("r", 0.2),
      valueOf("vx", 0),
      valueOf("vy", 0),
      valueOf("mass", 1),
      wordOf("color", "white"),
      wordOf("name", "ball")
    )
  );

  console.log("Ball spawned:", balls[balls.length - 1]);
}

function listenForEnter() {
  const commandInput = document.getElementById("command_input");
  commandInput.addEventListener("keydown", (Event) => {
    console.log(Event.key);
    if (Event.key === "Enter") {
      handleCommand(commandInput.value);
      commandInput.value = "";
    }
  });
}

function createBall(x, y, r, vx, vy, mass, color, Name) {
  return {
    x: x,
    y: y,
    r: r,
    vx: vx,
    vy: vy,
    mass: mass,
    color: color,
    name: Name,
    onground: false,
  };
}

let balls = [];

function draw_ball(ball1) {
  ctx.beginPath();
  ctx.arc(ball1.x * PXM, ball1.y * PXM, ball1.r * PXM, 0, Math.PI * 2);
  ctx.fillStyle = ball1.color;
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (ball_mode) {
    for (let i = 0; i < balls.length; i++) {
      console.log("drawing ball:", balls[i]);
      draw_ball(balls[i]);
    }
  }
}

function isOnGround(a) {
  if (a.y + a.r > floor_Y) {
    a.y = floor_Y - a.r;
    a.vy *= -0.7;
    a.onground = true;
  }
  return a.onground;
}

function bounce_off_walls(a, dt) {
  //apply forces
  a.vy += gravity * dt;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  a.vx *= 1 - 0.1 * dt;
  a.vy *= 1 - 0.1 * dt;
  //apply forces end

  //bounce off edges
  if (a.y - a.r < 0) {
    a.y = a.r;
    a.vy *= -0.7;
  }
  if (a.x + a.r > RightWall) {
    a.x = RightWall - a.r;
    a.vx *= -0.7;
  }
  if (a.x - a.r < 0) {
    a.x = a.r;
    a.vx *= -0.7;
  }
  if (a.y + a.r > floor_Y) {
    a.y = floor_Y - a.r;
    a.vy *= -0.7;
  }

  if (Math.abs(a.vy) <= epsilon && a.y === floor_Y - a.r) {
    a.vy = 0;
  }
  //bounce off edges end

  //calculate and apply ground friction
  a.onground = isOnGround(a);

  if (a.onground && a.vy === 0) {
    a.vx *= 1 - ground_friction * dt;
    if (Math.abs(a.vx) <= epsilon) {
      a.vx = 0;
    }
  }

  //calculate and apply ground friction end
}

function update(dt) {
  for (let i = 0; i < balls.length; i++) {
    bounce_off_walls(balls[i], dt);
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      collision_detect(balls[i], balls[j]);
    }
  }
}

//calculate position, distance and direction
function velocities(ball1, ball2) {
  const dx = ball1.x - ball2.x;
  const dy = ball1.y - ball2.y;
  const distance = Math.hypot(dx, dy) || 0.0001;
  const nx = dx / distance;
  const ny = dy / distance;
  return [dx, dy, distance, nx, ny];
}
//calculate position, distance and direction end

function collision_detect(ball1, ball2) {
  [dx, dy, distance, nx, ny] = velocities(ball1, ball2);
  // i dont remember (skull emoji)
  if (distance === 0) {
    dx = 0.0001;
    dy = 0; //everything breaks if i remove this so pls dont
    distance = 0.001;
  }
  //i dont remember (skull emoji) end

  if (distance < ball1.r + ball2.r) {
    console.log("collision detected");
    [dx, dy, distance, nx, ny] = velocities(ball1, ball2); // get position, distance and direction

    //half overlap to each ball
    const overlap = 0.5 * (distance - ball1.r - ball2.r);
    ball1.x -= overlap * nx;
    ball1.y -= overlap * ny;
    ball2.x += overlap * nx;
    ball2.y += overlap * ny;
    //half overlap to each ball end

    //calculate new velocities
    const kx = ball1.vx - ball2.vx;
    const ky = ball1.vy - ball2.vy;
    const p = (2 * (nx * kx + ny * ky)) / (ball1.mass + ball2.mass);
    ball1.vx = ball1.vx - p * ball2.mass * nx;
    ball1.vy = ball1.vy - p * ball2.mass * ny;
    ball2.vx = ball2.vx + p * ball1.mass * nx;
    ball2.vy = ball2.vy + p * ball1.mass * ny;
    //calculate new velocities end
  }
}

//not in use yet
function gravitational_attraction(ball1, ball2, dt) {
  //calculate velocity
  const G = 0.1;
  const dx = ball2.x - ball1.x;
  const dy = ball2.y - ball1.y;
  const distance = Math.hypot(dx, dy) || 0.0001;
  const force = (G * ball1.mass * ball2.mass) / (distance * distance);
  const ax1 = (force / ball1.mass) * (dx / distance);
  const ay1 = (force / ball1.mass) * (dy / distance);
  const ax2 = (force / ball2.mass) * (-dx / distance);
  const ay2 = (force / ball2.mass) * (-dy / distance);
  //calculate velocity end

  //apply velocity
  ball1.vx += ax1 * dt;
  ball1.vy += ay1 * dt;
  ball2.vx += ax2 * dt;
  ball2.vy += ay2 * dt;
  //apply velocity end
}

listenForEnter();
function loop(currentTime) {
  let dt = (currentTime - last_time) / 1000;
  last_time = currentTime;
  dt = Math.min(dt, 0.033);
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
