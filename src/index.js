import Phaser from "phaser";
import "./styles.css";
import bg from "./assets/background.png";
import bgFlipped from "./assets/backgroundFlipped.png";
import koalaSprites from "./assets/koala_sprites.png";
import ground from "./assets/ground.png";
import obstacle from "./assets/obstacle.png";
import bearSprites from "./assets/bear.png";
import winScreen from "./assets/winscreen.jpg";

let player;
let platforms;
let background1;
let background2;
let text;
let scrollSpeed = 0.5;
let numberingFixed = false;
let framesSinceLastObstacle = 0;
let obstaclesSpawned = 0;
let obstaclesQueue = [];
let pastObstacles = [];
let gameBeaten = false;
let finaleCalled = false;
let bear;

// The config object is how you configure your Phaser Game. There are lots of options that can be placed in this object
let config = {
  // type property can be either Phaser.CANVAS, Phaser.WEBGL, or Phaser.AUTO
  // This is the rendering context that you want to use for your game
  // The recommended value is Phaser.AUTO
  // which automatically tries to use WebGL, but if the browser or device doesn't support it it'll fall back to Canvas
  type: Phaser.AUTO,
  // width & height properties set the size of the canvas element that Phaser will create (resolution)
  width: 350,
  height: 510,
  // This is the ID of the parent element
  parent: "gameContainer",
  // This is the ID you want to give to the game canvas
  canvasID: "gameCanvas",
  // requiring the physics system, setting it to arcade
  physics: { default: "arcade", arcade: { gravity: { y: 300 }, debug: false } },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

// An instance of a Phaser.Game object is assigned to a local variable called game and the configuration object is passed to it.
let game = new Phaser.Game(config);

// Let's load the assets we need for our game. You do this by putting calls to the Phaser Loader inside of a Scene function called preload.
// Phaser will automatically look for this function when it starts and load anything defined within
function preload() {
  this.load.image("bg1", bg);
  this.load.image("bg2", bgFlipped);
  this.load.image("ground", ground);
  this.load.image("obstacle", obstacle);
  this.load.spritesheet("koalaSprites", koalaSprites, {
    frameWidth: 20,
    frameHeight: 12,
  });
  this.load.spritesheet("bearSprites", bearSprites, {
    frameWidth: 173,
    frameHeight: 120,
  });
  this.load.image("winScreen", winScreen);
}

function create() {
  // values 400 and 300 are the x and y coordinates of the image.
  // Why 400 and 300? It's because in Phaser 3 all Game Objects are positioned based on their center by default.
  // You can use setOrigin to change this: this.add.image(0, 0, 'sky').setOrigin(0, 0) resets drawing position to top-left.
  // order in which game objects are displayed matches the order in which you create them!
  background1 = this.add.image(0, 0, "bg1").setOrigin(0, 0);
  background2 = this.add.image(background1.width, 0, "bg2").setOrigin(0, 0);

  // a call to this.physics. This means we're using the Arcade Physics system (need to say that we require it in config)
  // creates a new Static Physics Group and assigns it to the local variable platforms
  // In Arcade Physics there are two types of physics bodies:
  // Dynamic (can move around / collide / gravity) and Static (only position and size)
  // Group = a way to group together similar objects and control them all as one single unit (like Layers in Unity)
  platforms = this.physics.add.staticGroup();

  platforms.create(10, 508, "ground");
  platforms.create(110, 508, "ground");
  platforms.create(210, 508, "ground");
  platforms.create(310, 508, "ground");
  platforms.create(410, 508, "ground");
  platforms.create(510, 508, "ground");
  platforms.create(610, 508, "ground");
  platforms.create(710, 508, "ground");
  platforms.create(740, 508, "ground");
  platforms.create(840, 508, "ground");
  platforms.create(940, 508, "ground");
  platforms.create(1040, 508, "ground");
  platforms.create(1140, 508, "ground");

  // creates a new sprite called player, positioned at 100 x 450 pixels
  // Dynamic body by default
  player = this.physics.add.sprite(100, 450, "koalaSprites").setScale(1.7, 1.7);
  // when it lands after jumping it will bounce ever so slightly
  player.setBounce(0.2);
  // set to collide with the world bounds / window dimensions
  player.setCollideWorldBounds(true);

  // Animation Manager is a global system. Animations created within it are globally available to all Game Objects.
  // They share the base animation data while managing their own timelines.
  // This allows you to define a single animation once and apply it to as many Game Objects as you require
  this.anims.create({
    key: "run",
    frames: this.anims.generateFrameNumbers("koalaSprites", {
      start: 0,
      end: 11,
    }),
    frameRate: 10,
    // tells the animation to loop.
    repeat: -1,
  });

  this.anims.create({
    key: "bearRunLeft",
    frames: this.anims.generateFrameNumbers("bearSprites", {
      start: 0,
      end: 4,
    }),
    frameRate: 10,
    repeat: -1,
  });

  player.anims.play("run", true);

  // takes two objects and tests for collision and performs separation against them
  this.physics.add.collider(player, platforms);

  text = this.add.text(75, 100, "Obstacles beaten: 0", {
    fontFamily: "Arial",
    fontSize: 24,
    color: "#ffffff",
  });
}

function update() {
  // Move background images to the left
  if (finaleCalled == false) {
    background1.x -= scrollSpeed;
    background2.x -= scrollSpeed;

    // Check if the first background image has moved off-screen to the left
    if (background1.x <= -background1.width) {
      // Move it to the right of the second background image
      background1.x = background2.x + background2.width;
    }

    // Check if the second background image has moved off-screen to the left
    if (background2.x <= -background2.width) {
      // Move it to the right of the first background image
      background2.x = background1.x + background1.width;
    }
  }

  // controls
  let cursors = this.input.keyboard.createCursorKeys();
  if (cursors.space.isDown && player.body.touching.down) {
    player.setVelocityY(-230);
  }

  // mobile controls
  let jumpButton = document.getElementById("jumpButton");
  jumpButton.addEventListener("click", function () {
    if (player.body.touching.down) {
      player.setVelocityY(-230);
    }
  });

  // spawn obstacles
  if (framesSinceLastObstacle == 360 && obstaclesSpawned < 5) {
    obstaclesQueue.push(addObstacle(this));
    obstaclesSpawned += 1;
    framesSinceLastObstacle = 0;
  } else {
    framesSinceLastObstacle += 1;
  }

  // update text
  if (obstaclesQueue.length !== 0) {
    if (player.x >= obstaclesQueue[0].x) {
      if (numberingFixed == false) {
        text.setText("Obstacles beaten: 1");
        numberingFixed = true;
      } else {
        text.setText("Obstacles beaten: " + (obstaclesSpawned - 1));
      }
      pastObstacles.push(obstaclesQueue.splice(0, 1));
    }
  }

  // finale trigger
  if (obstaclesSpawned == 5 && gameBeaten == false) {
    gameBeaten = true;
    setTimeout(() => finale(this), 5000);
  }
}

function addObstacle(scene) {
  let obstacle = scene.physics.add
    .sprite(800, 470, "obstacle")
    .setScale(0.8, 0.8);
  obstacle.body.setAllowGravity(false);
  obstacle.body.setImmovable(true);
  obstacle.setVelocityX(-200);
  scene.physics.add.collider(player, obstacle, () => {
    // Game over logic
    alert("Game Over!");
    location.reload(true);
  });
  return obstacle;
}

function finale(scene) {
  console.log("finale called");
  finaleCalled = true;
  // [change this later!!!]
  player.setVelocityX(10);

  bear = scene.physics.add.sprite(450, 435, "bearSprites");
  bear.anims.play("bearRunLeft", true);
  bear.setVelocityX(-20);
  bear.body.setAllowGravity(false);
  bear.body.setImmovable(true);

  scene.physics.add.collider(player, bear, () => {
    setTimeout(() => {
      winScreen = scene.add.image(-75, 0, "winScreen").setOrigin(0, 0);
    }, 500);
  });
}
