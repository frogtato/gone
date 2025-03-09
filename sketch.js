/*!
 * Project Name: Gone
 * Description: A visual experiment with shapes, particles, and generative patterns.

 * Licensed under the CC BY 4.0 License
 * You may obtain a copy of the License at https://creativecommons.org/licenses/by/4.0/

 * Copyright (c) 2025 Frogtato - https://github.com/frogtato
 */


// Flow field variables
let flowField = [];
let cols, rows;
let scl = 100;  // size of each cell in the flow field
let zOff = 0;
let inc = 0.1; 

// particles
let particles = [];
let numParticles = 6000; 

// glitch control
let glitching = false;
let glitchStartTime = 0;
let glitchDuration = 1000; // 1 second

// normal scene (offscreen buffer)
let normalScene;

// UI 
let shapeToggleButton, mouseFollowButton, freezeButton, resetButton;
let toggleShapes = true;      // toggles polygons
let followMouse = false;      // toggle particles following mouse
let particleSizeSlider, particleSizeLabel;
let menuPanel;                // container for UI
let menuToggleButton;         // arrow to hide/show the menu
let menuOpen = true;
let freezeMode = false;       // freeze screen flag

let whatTexts = [];

let bgHue = 0, bgSat = 0, bgBri = 0;

// ---- globals for collective shape mode ----
let collectiveMode = false; 
let collectiveShapeMode = 0;
const collectiveShapeNames = [
  '5-Point Star', 
  'Circle', 
  'Spiral', 
  'Fibonacci Spiral', 
  'Fractal Tree'
];
let collectiveToggleButton, collectiveCycleButton, collectiveShapeLabel;

// 1) Star Outline
let starOutline = null;
let starOutlineLengths = [];
let starTotalLength = 0;

// 2) Fibonacci Spiral Outline (polyline)
let fibSpiralOutline = null;
let fibSpiralLengths = [];
let fibSpiralTotalLength = 0;

// 3) Fractal Tree Outline
let treeOutline = null;
let treeOutlineLengths = [];
let treeTotalLength = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  
  // offscreen graphics buffer
  normalScene = createGraphics(width, height);
  normalScene.colorMode(HSB, 360, 100, 100, 100);
  
  // setup flow field
  cols = floor(width / scl);
  rows = floor(height / scl);
  flowField = new Array(cols * rows);
  
  // create particles
  for (let i = 0; i < numParticles; i++) {
    let p = new Particle();
    p.index = i; // assign an index to each particle for collective mode targeting
    particles.push(p);
  }
  
  // random text points
  for (let i = 0; i < 5; i++) {
    whatTexts.push({
      x: random(width),
      y: random(height)
    });
  }
  
  // Create the UI menu panel
  menuPanel = createDiv('');
  menuPanel.id('menuPanel');
  menuPanel.style('display', 'flex');
  
  // toggle shapes button 
  shapeToggleButton = createButton("Toggle Shapes");
  shapeToggleButton.parent(menuPanel);
  shapeToggleButton.class("menuButton");
  shapeToggleButton.mousePressed(() => { flashButton(shapeToggleButton); toggleShapesVisibility(); });
  
  // toggle mouse button 
  mouseFollowButton = createButton("Toggle Mouse Follow");
  mouseFollowButton.parent(menuPanel);
  mouseFollowButton.class("menuButton");
  mouseFollowButton.mousePressed(() => { flashButton(mouseFollowButton); toggleMouseFollow(); });
  
  // slider/label for particle size
  particleSizeLabel = createSpan("Particle Size:");
  particleSizeLabel.parent(menuPanel);
  particleSizeLabel.class("menuLabel");
  
  particleSizeSlider = createSlider(0.5, 5, 1, 0.1);
  particleSizeSlider.parent(menuPanel);
  particleSizeSlider.class("menuSlider");
  
  // Freeze button
  freezeButton = createButton("Freeze");
  freezeButton.parent(menuPanel);
  freezeButton.class("menuButton");
  freezeButton.mousePressed(() => { flashButton(freezeButton); toggleFreeze(); });
  
  // Reset button
  resetButton = createButton("Reset");
  resetButton.parent(menuPanel);
  resetButton.class("menuButton");
  resetButton.mousePressed(() => { flashButton(resetButton); resetPage(); });
  
  // Collective Shape Mode toggle button
  collectiveToggleButton = createButton("Collective Shape: OFF");
  collectiveToggleButton.parent(menuPanel);
  collectiveToggleButton.class("menuButton");
  collectiveToggleButton.mousePressed(() => { flashButton(collectiveToggleButton); toggleCollectiveMode(); });
  
  // Collective Shape Cycle button
  collectiveCycleButton = createButton("Cycle Collective Shape");
  collectiveCycleButton.parent(menuPanel);
  collectiveCycleButton.class("menuButton");
  collectiveCycleButton.style('display', 'none');
  collectiveCycleButton.mousePressed(() => {
    flashButton(collectiveCycleButton);
    collectiveShapeMode = (collectiveShapeMode + 1) % collectiveShapeNames.length;
    collectiveShapeLabel.html("Current: " + collectiveShapeNames[collectiveShapeMode]);
  });
  
  // Label to show current collective shape mode
  collectiveShapeLabel = createSpan("Current: " + collectiveShapeNames[collectiveShapeMode]);
  collectiveShapeLabel.parent(menuPanel);
  collectiveShapeLabel.class("menuLabel");
  collectiveShapeLabel.style('display', 'none');
  
  // menu hide arrow
  menuToggleButton = createButton("▲");
  menuToggleButton.id("menuToggleButton");
  menuToggleButton.mousePressed(() => { flashButton(menuToggleButton); toggleMenu(); });
}

// =================== Star Outline ===================
function computeStarOutline() {
  let center = createVector(width / 2, height / 2);
  let outerRadius = min(width, height) / 3;
  let innerRadius = outerRadius / 2;
  let vertices = [];
  let pointsCount = 10; // 5 outer and 5 inner points
  let startAngle = -PI / 2; 
  for (let i = 0; i < pointsCount; i++) {
    let angle = startAngle + i * TWO_PI / pointsCount;
    let r = (i % 2 === 0) ? outerRadius : innerRadius;
    vertices.push(createVector(center.x + r * cos(angle), center.y + r * sin(angle)));
  }
  // Cclode by adding first vertex at end
  vertices.push(vertices[0].copy());
  starOutline = vertices;
  
  // precompute segment lengths
  starOutlineLengths = [];
  starTotalLength = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    let segLength = p5.Vector.dist(vertices[i], vertices[i + 1]);
    starOutlineLengths.push(segLength);
    starTotalLength += segLength;
  }
  const frogtatoMeta = {
    author: "Frogtato",
    project: "Gone",
    year: 2025
  };  
}
function getStarPoint(t) {
  if (!starOutline) {
    computeStarOutline();
  }
  let targetDist = t * starTotalLength;
  let distSoFar = 0;
  for (let i = 0; i < starOutline.length - 1; i++) {
    if (distSoFar + starOutlineLengths[i] >= targetDist) {
      let remaining = targetDist - distSoFar;
      let lerpAmt = remaining / starOutlineLengths[i];
      return p5.Vector.lerp(starOutline[i], starOutline[i + 1], lerpAmt);
    }
    distSoFar += starOutlineLengths[i];
  }
  return starOutline[starOutline.length - 1].copy();
}

// =================== Fibonacci Spiral ===================
function computeFibSpiralOutline() {
  //   r(theta) = a * e^(b*theta), 
  // with b = ln(phi). 
  //  find maxTheta to keep in the screen
  
  let outline = [];
  let center = createVector(width/2, height/2);
  
  let phi = (1 + sqrt(5)) / 2; 
  let b = log(phi);
  // 'a' chosen so that spiral starts near center 
  let a = 1.0; 
  
  let maxR = 0.5 * min(width, height);
  // guess maxTheta until r exceeds maxR
  let theta = 0;
  let dTheta = 0.02; 
  while (true) {
    let r = a * exp(b * theta);
    if (r > maxR) break;
    // convert polar -> cartesian
    let x = center.x + r * cos(theta);
    let y = center.y + r * sin(theta);
    outline.push(createVector(x, y));
    theta += dTheta;
    if (theta > 50) break; //break if too large
  }
  
  fibSpiralOutline = outline;

  fibSpiralLengths = [];
  fibSpiralTotalLength = 0;
  for (let i = 0; i < outline.length - 1; i++) {
    let segLen = p5.Vector.dist(outline[i], outline[i+1]);
    fibSpiralLengths.push(segLen);
    fibSpiralTotalLength += segLen;
  }
}

function getFibSpiralPoint(t) {
  if (!fibSpiralOutline) {
    computeFibSpiralOutline();
  }
  // t in [0..1]
  let targetDist = t * fibSpiralTotalLength;
  let distSoFar = 0;
  for (let i = 0; i < fibSpiralOutline.length - 1; i++) {
    if (distSoFar + fibSpiralLengths[i] >= targetDist) {
      let remaining = targetDist - distSoFar;
      let lerpAmt = remaining / fibSpiralLengths[i];
      return p5.Vector.lerp(fibSpiralOutline[i], fibSpiralOutline[i + 1], lerpAmt);
    }
    distSoFar += fibSpiralLengths[i];
  }
  return fibSpiralOutline[fibSpiralOutline.length - 1].copy();
}

// =================== Fractal Tree ===================
function computeFractalTreeOutline() {
//5 levels of branching
// store all line segments in array -- param sampling
  treeOutline = [];
  
  let start = createVector(width/2, height); 
  let len = min(width, height)/4; // trunk length
  let dir = createVector(0, -1);  // trunk points upward
  
  //direction vector and level
  
  function branch(pos, dir, length, level) {
    if (level <= 0) return;
    // endpoint
    let end = p5.Vector.add(pos, p5.Vector.mult(dir, length));
    // store the segment
    treeOutline.push([pos.copy(), end.copy()]);
    // branch out
    let newLen = length * 0.67;
    let leftDir = dir.copy().rotate(-PI/4);
    let rightDir = dir.copy().rotate(PI/4);
    branch(end, leftDir, newLen, level-1);
    branch(end, rightDir, newLen, level-1);
  }
  
  branch(start, dir, len, 5);
  
  // flatten into 1 polyline path 
  let path = [];
  for (let seg of treeOutline) {
    path.push(seg[0]);
    path.push(seg[1]);
  }
  //  remove duplicates in consecutive pairs
  let cleaned = [path[0]];
  for (let i=1; i<path.length; i++){
    if (!path[i].equals(path[i-1])) {
      cleaned.push(path[i]);
    }
  }
  
  treeOutline = cleaned;
  
  // measure lengths
  treeOutlineLengths = [];
  treeTotalLength = 0;
  for (let i = 0; i < treeOutline.length - 1; i++) {
    let segLen = p5.Vector.dist(treeOutline[i], treeOutline[i+1]);
    treeOutlineLengths.push(segLen);
    treeTotalLength += segLen;
  }
}

function getFractalTreePoint(t) {
  if (!treeOutline) {
    computeFractalTreeOutline();
  }
  let targetDist = t * treeTotalLength;
  let distSoFar = 0;
  for (let i = 0; i < treeOutline.length - 1; i++) {
    if (distSoFar + treeOutlineLengths[i] >= targetDist) {
      let remaining = targetDist - distSoFar;
      let lerpAmt = remaining / treeOutlineLengths[i];
      return p5.Vector.lerp(treeOutline[i], treeOutline[i + 1], lerpAmt);
    }
    distSoFar += treeOutlineLengths[i];
  }
  return treeOutline[treeOutline.length - 1].copy();
}

// =================== Main draw loop, etc. ===================
function draw() {
  normalScene.clear();
  drawNormalScene(normalScene);
  
  if (glitching) {
    let elapsed = millis() - glitchStartTime;
    if (elapsed < glitchDuration) {
      for (let i = 0; i < 5; i++) {
        push();
        let offsetX = random(-20, 20);
        let offsetY = random(-20, 20);
        tint(255, random(120, 255));
        image(normalScene, offsetX, offsetY);
        pop();
      }
    } else {
      glitching = false;
      image(normalScene, 0, 0);
    }
  } else {
    image(normalScene, 0, 0);
  }
}

function drawNormalScene(pg) {
  pg.noStroke();
  pg.fill(bgHue, bgSat, bgBri, 5);
  pg.rect(0, 0, width, height);
  
  if (toggleShapes) {
    drawWhatText(pg);
  }
  
  // Update flow field
  let yOff = 0;
  for (let y = 0; y < rows; y++) {
    let xOff = 0;
    for (let x = 0; x < cols; x++) {
      let index = x + y * cols;
      let angle = noise(xOff, yOff, zOff) * TWO_PI * 2;
      let v = p5.Vector.fromAngle(angle);
      v.setMag(1);
      flowField[index] = v;
      xOff += inc;
    }
    yOff += inc;
  }
  zOff += 0.003;
  
  // Update and draw particles
  for (let p of particles) {
    if (collectiveMode) {
      p.collectiveUpdate();
    } else {
      if (followMouse) {
        p.followMouse();
      } else {
        p.follow(flowField);
      }
    }
    p.update();
    p.edges();
    p.show(pg);
  }
  
  // Draw random polygons only if shapes are enabled
  if (toggleShapes) {
    drawRandomPolygons(pg);
  }
}

function drawRandomPolygons(pg) {
  let polyCount = 2; 
  for (let i = 0; i < polyCount; i++) {
    let cx = random(width);
    let cy = random(height);
    let sides = floor(random(3, 8));
    let radius = random(10, 50);
    let hueVal = (frameCount * 2 + random(100)) % 360;
    
    pg.push();
    pg.translate(cx, cy);
    pg.rotate(random(TWO_PI));
    pg.noFill();
    pg.stroke(hueVal, 90, 100);
    pg.strokeWeight(random(1, 3));
    pg.beginShape();
    for (let s = 0; s < sides; s++) {
      let angle = map(s, 0, sides, 0, TWO_PI);
      let x = cos(angle) * radius + random(-10, 10);
      let y = sin(angle) * radius + random(-10, 10);
      pg.vertex(x, y);
    }
    pg.endShape(CLOSE);
    pg.pop();
  }
}

function drawWhatText(pg) {
  pg.push();
  pg.textSize(15);
  pg.textAlign(CENTER, CENTER);
  for (let i = 0; i < whatTexts.length; i++) {
    let t = whatTexts[i];
    // slowly move text pos.
    t.x += random(-0.5, 0.5);
    t.y += random(-0.5, 0.5);
    t.x = constrain(t.x, 0, width);
    t.y = constrain(t.y, 0, height);
    
    let hueVal = (frameCount * 0.5 + i * 50) % 360;
    pg.fill(hueVal, 80, 100, 80);
    pg.text("What?", t.x, t.y);
  }
  pg.pop();
}

// ---- Collective mode ----
function getCollectiveTarget(idx, mode) {
  let center = createVector(width / 2, height / 2);
  let t = (idx % numParticles) / (numParticles - 1); // 0..1
  
  switch (mode) {
    case 0: // Star
      return getStarPoint(t);
    case 1: // Circle
      {
        let angle = t * TWO_PI;
        let r = min(width, height) / 4;
        return createVector(
          center.x + r * cos(angle),
          center.y + r * sin(angle)
        );
      }
    case 2: // Archimedean Spiral
      {
        let angle = t * 8 * PI; // up to 4 full turns
        let r = t * (min(width, height)/2);
        return createVector(
          center.x + r * cos(angle),
          center.y + r * sin(angle)
        );
      }
    case 3: // Fibonacci (Golden) Spiral
      return getFibSpiralPoint(t);
    case 4: // Fractal Tree
      return getFractalTreePoint(t);
  }
}

function toggleCollectiveMode() {
  collectiveMode = !collectiveMode;
  if (collectiveMode) {
    collectiveToggleButton.html("Collective Shape: ON");
    collectiveCycleButton.style('display', 'block');
    collectiveShapeLabel.style('display', 'block');
  } else {
    collectiveToggleButton.html("Collective Shape: OFF");
    collectiveCycleButton.style('display', 'none');
    collectiveShapeLabel.style('display', 'none');
  }
}

// Particle class
class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 4;
    this.hue = random(360);
  }
  
  follow(field) {
    let x = floor(this.pos.x / scl);
    let y = floor(this.pos.y / scl);
    let index = x + y * cols;
    let force = field[index];
    if (force) {
      this.applyForce(force);
    }
  }
  
  followMouse() {
    let mouseVec = createVector(mouseX, mouseY);
    let desired = p5.Vector.sub(mouseVec, this.pos);
    desired.setMag(0.5);
    this.applyForce(desired);
  }
  
  collectiveUpdate() {
    let target = getCollectiveTarget(this.index, collectiveShapeMode);
    let desired = p5.Vector.sub(target, this.pos);
    desired.setMag(0.5);
    this.applyForce(desired);
  }
  
  applyForce(force) {
    this.acc.add(force);
  }
  
  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }
  
  edges() {
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }
  
  show(pg) {
    this.hue = (this.hue + 0.2) % 360;
    pg.stroke(this.hue, 80, 100, 80);
    pg.strokeWeight(1.5 * particleSizeSlider.value());
    pg.point(this.pos.x, this.pos.y);
  }
}

// prevent glitching when clicking ui
function mousePressed() {
  let menuRect = menuPanel.elt.getBoundingClientRect();
  let arrowRect = menuToggleButton.elt.getBoundingClientRect();
  if (
    (mouseX >= menuRect.left && mouseX <= menuRect.right && mouseY >= menuRect.top && mouseY <= menuRect.bottom) ||
    (mouseX >= arrowRect.left && mouseX <= arrowRect.right && mouseY >= arrowRect.top && mouseY <= arrowRect.bottom)
  ) {
    return;
  }
  
  // check if "what?"s are clicked
  let clickedOnWhat = false;
  for (let i = 0; i < whatTexts.length; i++) {
    let t = whatTexts[i];
    let textW = textWidth("What?");
    let textH = 15;
    if (
      mouseX > t.x - textW/2 && mouseX < t.x + textW/2 &&
      mouseY > t.y - textH/2 && mouseY < t.y + textH/2
    ) {
      clickedOnWhat = true;
      break;
    }
  }
  
  if (clickedOnWhat) {
    bgHue = random(360);
    bgSat = random(50, 100);
    bgBri = random(0, 40);
  } else {
    glitching = true;
    glitchStartTime = millis();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  normalScene.resizeCanvas(windowWidth, windowHeight);
  cols = floor(width / scl);
  rows = floor(height / scl);
  // clear outlines so they recompute
  starOutline = null;
  fibSpiralOutline = null;
  treeOutline = null;
}

function toggleShapesVisibility() {
  toggleShapes = !toggleShapes;
}

function toggleMouseFollow() {
  followMouse = !followMouse;
}

function toggleFreeze() {
  freezeMode = !freezeMode;
  if (freezeMode) {
    noLoop();
    freezeButton.html("Unfreeze");
  } else {
    loop();
    freezeButton.html("Freeze");
  }
}

function resetPage() {
  window.location.reload();
}

function toggleMenu() {
  menuOpen = !menuOpen;
  if (menuOpen) {
    menuPanel.style('display', 'flex');
    menuToggleButton.html("▲");
  } else {
    menuPanel.style('display', 'none');
    menuToggleButton.html("▼");
  }
}

// flash a button in a lighter purple on click then go back
function flashButton(btn) {
  btn.style('background', '#9C27B0');
  setTimeout(() => {
    btn.style('background', '#4A148C');
  }, 200);
}
