enchant();

var GRID = 32;
var WINDOW = 352;
var ROOM_WID = 11; /* Keep these two values odd */
var ROOM_HIG = 9;
var NORTH = 8;    /* These are the tile numbers for the different exits */
var SOUTH = 9;
var EAST = 10;
var WEST = 11;
var DOWN = 4;
var UP = 5;
var NEXT_LEVEL = 7;
var P_UP = 3;     /* These are the directions for the player */
var P_DOWN = 0;
var P_LEFT = 1;
var P_RIGHT = 2;
var ENEMIES = 3   /* Index of the EnemyGroup child in the scene */

/* These variables keep track of the current room's info. These are updated
 * when the room changes */
var map;
var curScene;

var player;
var sceneList = Array();
var minRooms = 10; // Make this value an input from the user                                                          //***VARY***
var exitPlaced = false; // Keeps track if the exit portal has been placed in the level

var metrics = new Metrics();

/* Generic function that creates a label */
var createLabel = function(text, x, y, font, color) {
   var newLabel = new Label(text);
   newLabel.x = x;
   newLabel.y = y;
   newLabel.font = typeof(font) !== "undefined" ? font : "14px sans-serif";
   newLabel.color = typeof(color) !== "undefined" ? color : "white";
   return newLabel;
};

/* 
 * The Hud class displays the player's stats (health, # of potions) 
 * on the bottom of the screen
 */
Hud = Class.create(Group, {
   initialize: function() {
      Group.call(this);
      this.bg = new Sprite(WINDOW, GRID*2);
      this.bg.image = game.assets["assets/images/hud.png"];
      this.bg.x = 0;
      this.bg.y = game.height - GRID*2;
      
      this.health = createLabel("Health: " + player.health + "/" + player.maxHealth, 5, this.bg.y+5);
      this.numPotions = createLabel("Health Potions x " + player.numPotions, 5, this.bg.y+25);
      this.attack = createLabel("Str: " + player.strength, 245, game.height - GRID*2 + 10, "10px sans-serif");
      this.defense = createLabel("Def: " + player.defense, 245, this.attack.y + 15, "10px sans-serif");
      
      this.weapon = new Sprite(GRID, GRID);
      this.weapon.image = game.assets["assets/images/items.png"];
      this.weapon.frame = player.sword;
      this.weapon.x = 150;
      this.weapon.y = game.height - GRID*2 + 10;
      
      this.shield = new Sprite(GRID, GRID);
      this.shield.image = game.assets["assets/images/items.png"];
      this.shield.frame = player.shield;
      this.shield.x = 200;
      this.shield.y = game.height - GRID*2 + 10;
      
      this.addChild(this.bg);
      this.addChild(this.health);
      this.addChild(this.numPotions);
      this.addChild(this.weapon);
      this.addChild(this.shield);
      this.addChild(this.attack);
      this.addChild(this.defense);
   },
   
   onenterframe: function() {
      this.health.text = "Health: " + player.health + "/" + player.maxHealth;
      this.numPotions.text = "Health Potions x " + player.numPotions;
      this.weapon.frame = player.sword;
      this.shield.frame = player.shield;
      this.attack.text = "Str: " + player.strength;
      this.defense.text = "Def: " + player.defense;
   }
});


/*
 * The Player class keeps track of the character stats and animates and moves
 * the character sprite.
 * Parameters:
 *    x = x coordinate of the sprite
 *    y = y coordinate of the sprite
 */
Player = Class.create(Sprite, {
   initialize: function(x, y) {
      Sprite.call(this, 32, 32);
      this.image = game.assets["assets/images/player.png"];
      this.x = x; /* Relative to the whole map, not the window */
      this.y = y;
      this.frame = 0;
      
      this.isMoving = false;
      this.direction = P_DOWN;
      this.walk = 1;
      this.isAttacking = false;
      this.attackCounter = 0;
      this.cooldown = 0;
      
      /* Character stats */
      this.sword = 1;                                                                                                //***VARY***
      this.strength = 5;
      this.shield = -1;
      this.defense = 0;
      this.accuracy = 80; // Out of 100
      this.health = 100;
      this.maxHealth = 100;
      this.numPotions = 0;
   },
   
   onenterframe: function() {
      if (!this.isAttacking)
         this.move();
      if (!this.isMoving)
         this.attack();
      if (!this.isAttacking && !this.isMoving)
         this.checkItem();
         
      /* Update average health and total time metrics */
      if (this.age % game.fps == 0)
         metrics.updateAvgHealthPerSec(this.health);
   },
   
   checkItem: function() {
      /* Check if picked up potion */
      var tileContents = map.items.checkTile(this.x, this.y);
      if (this.cooldown == 0 && game.input.swapItem && tileContents > 0 || 
          tileContents == 0) {
         game.processPickup(tileContents);
         metrics.str = player.strength;
         metrics.def = player.defense;
         metrics.potionsHeld = player.numPotions;
         this.cooldown = 5;
      }
      if (this.cooldown == 0 && game.input.usePotion && player.numPotions > 0 && 
          player.health != player.maxHealth) {
         player.numPotions--;
         player.health = player.health+20 > player.maxHealth ? player.maxHealth : player.health+20;                  //***CHANGE***
         
         metrics.potionsUsed++;
         metrics.potionsHeld = player.numPotions;
         if (player.health > metrics.maxHealth)
            metrics.maxHealth = player.health;
            
         this.cooldown = 5;                                                                                          //***VARY***
      }
      if (this.cooldown > 0)
         this.cooldown--;
   },
   
   attack: function() {   
      if (!this.isAttacking) {
         if (game.input.attackLeft) {
            this.direction = P_LEFT;
            this.isAttacking = true;
         }
         else if (game.input.attackRight) {
            this.direction = P_RIGHT;
            this.isAttacking = true;
         }
         else if (game.input.attackUp) {
            this.direction = P_UP;
            this.isAttacking = true;
         }
         else if (game.input.attackDown) {
            this.direction = P_DOWN;
            this.isAttacking = true;
         }
      }

      if (this.isAttacking) {
         this.frame = this.direction * 9 + 6 + (this.attackCounter > 2 ? 2 : this.attackCounter);
         if (++this.attackCounter > 5) {
            this.attackCounter = 0;
            this.isAttacking = false;
         }
      }
   },
   
   move: function() {
      this.frame = this.direction * 9 + (this.walk == 3 ? 1 : this.walk);
      if (this.isMoving) {
         this.moveBy(this.vx, this.vy);

         if (!(game.frame % 2)) {
            this.walk++;
            this.walk %= 4;
         }
         if ((this.vx && (this.x) % this.width == 0) || (this.vy && this.y % this.height == 0)) { /* 32x32 grid */
            this.isMoving = false;
            metrics.stepsTaken++;

            /* Check if player went through a door */
            var dir = map.checkTile(this.x, this.y);
            if (dir == NORTH || dir == SOUTH || dir == EAST || dir == WEST || dir == UP || dir == DOWN)
               game.changeRoom(dir);
            else if (dir == NEXT_LEVEL)   /* End the level */
               game.endLevel(false);
         }
      } 
      else {
         this.vx = this.vy = 0;
         if (game.input.left) {
            this.direction = P_LEFT;
            if (!map.hitTest(this.x + this.width/2 - GRID, this.y))
               this.vx = -4;
         } 
         else if (game.input.right) {
            this.direction = P_RIGHT;
            if (!map.hitTest(this.x + this.width/2 + GRID, this.y))
               this.vx = 4;
         } 
         else if (game.input.up) {
            this.direction = P_UP;
            if (!map.hitTest(this.x, this.y + this.height/2 - GRID))
               this.vy = -4;
         }
         else if (game.input.down) {
            this.direction = P_DOWN;
            if (!map.hitTest(this.x, this.y + this.height/2 + GRID))
               this.vy = 4;
         }
         else {
            this.walk = 1;
         }
         if (this.vx || this.vy) {
            var x = this.x + (this.vx ? this.vx / Math.abs(this.vx) * 16 : 0) + 16;
            var y = this.y + (this.vy ? this.vy / Math.abs(this.vy) * 16 : 0) + 16;
            if (0 <= x && x < map.width && 0 <= y && y < map.height) {
               this.isMoving = true;
               arguments.callee.call(this);
            }
         }
      }
   },
   
   takeDamage: function(dmg) {
      this.health -= dmg;
      if (this.health <= 0) {
         metrics.dmgTaken += dmg + this.health;
         metrics.minHealth = 0;
         map.dmgTaken += dmg + this.health;
         this.health = 0;
         game.endLevel(true);
      }
      else {
         metrics.dmgTaken += dmg;
         map.dmgTaken += dmg;
         if (player.health < metrics.minHealth)
            metrics.minHealth = player.health;
      }
   }
});

/* 
 * The Room class creates the layout of each dungeon room 
 * Parameters:
 *    dir = The direction that the player went to get to this room
 *    scene = The scene of the room that should be stored as the previous room
 */
Room = Class.create(Map, {
   initialize: function(dir, scene, x, y, z) {
      Map.call(this, GRID, GRID);
      this.image = game.assets["assets/images/map.png"];
      this.tiles = new Array(ROOM_HIG);
      this.collision = new Array(ROOM_HIG);
      
      this.items = new Map(GRID, GRID);
      this.items.image = game.assets["assets/images/items.png"];
      this.items.tiles = new Array(ROOM_HIG);
      
      /* Set base tiles (floor and walls) */
      var countRow, countCol;
      for (countRow = 0; countRow < ROOM_HIG; countRow++) {
         this.tiles[countRow] = new Array(ROOM_WID);
         this.collision[countRow] = new Array(ROOM_WID);
         this.items.tiles[countRow] = new Array(ROOM_WID);
         for (countCol = 0; countCol < ROOM_WID; countCol++) {
            this.tiles[countRow][countCol] = 0;
            this.items.tiles[countRow][countCol] = -1;
            if (countRow == 0)
               this.tiles[countRow][countCol] = 2;
            if (countRow == ROOM_HIG-1 || countCol == 0 || countCol == ROOM_WID-1)
               this.tiles[countRow][countCol] = 1;
         }
      }
      /* Add exits and obstacles to the room */
      this.findExits(dir, scene);
      this.makeObstacles();
      
      /* Set collision data */
      for (countRow = 0; countRow < ROOM_HIG; countRow++) {
         for (countCol = 0; countCol < ROOM_WID; countCol++) {
            if (this.tiles[countRow][countCol] == 1 || this.tiles[countRow][countCol] == 2)
               this.collision[countRow][countCol] = 1;
            else {
               this.collision[countRow][countCol] = 0;
               if (this.tiles[countRow][countCol] == 0 && Math.floor(Math.random() * 100) == 0) {                    //***VARY***
                  this.items.tiles[countRow][countCol] = game.getRandomItem();
               }
            }
         }
      }

      this.loadData(this.tiles);
      this.collisionData = this.collision;
      this.items.loadData(this.items.tiles);
      
      /* These three fields keep track of the map topology */
      this.xRoom = x;
      this.yRoom = y;
      this.zRoom = z;
   },
   
   onenterframe: function() {
      if (this.age % game.fps == 0)
         this.time++;
   },
   
   /* Change the collision data of one tile. col and row are tile indexes, not pixels. */
   editCollision: function(col, row, newVal) {
      if (col >= 0 && col < ROOM_WID && row >= 0 && row < ROOM_HIG) {
         this.collision[row][col] = newVal;
         this.collisionData = this.collision;
      }
   },
   
   /* Change the frame of one tile. col and row are tile indexes, not pixels. */
   editTile: function(col, row, newVal) {
      if (col >= 0 && col < ROOM_WID && row >= 0 && row < ROOM_HIG) {
         this.tiles[row][col] = newVal;
         this.loadData(this.tiles);
      }
   },
   
   fixObstacleBlocks: function() {
      var countRow, countCol;
      for (countRow = 0; countRow < ROOM_HIG; countRow++) {
         for (countCol = 0; countCol < ROOM_WID; countCol++) {
            if (countRow > 0 && this.tiles[countRow-1][countCol] == 2 &&
                (this.tiles[countRow][countCol] == 1 || this.tiles[countRow][countCol] == 2))
               this.tiles[countRow-1][countCol] = 1;
            if (countRow > 0 && this.tiles[countRow-1][countCol] == 1 && this.tiles[countRow][countCol] == 0)
               this.tiles[countRow-1][countCol] = 2;
         }
      }
   },
   
   /* Randomly create room exits, making sure doors connect. */
   findExits: function(dir, scene) {
      this.North = Math.floor(Math.random() * 3) > 0 ? true : false;
      this.South = Math.floor(Math.random() * 3) > 0 ? true : false;
      this.East = Math.floor(Math.random() * 3) > 0 ? true : false;
      this.West = Math.floor(Math.random() * 3) > 0 ? true : false;
      this.Up = this.Down = false;
      if (Math.floor(Math.random() * 5) == 0 && sceneList.length > 1) {
         if (Math.floor(Math.random() * 2) == 0)
            this.Up = true;
         else
            this.Down = true;
      }
      if (!this.North && !this.South && !this.East && !this.West) {
         this.North = true;
      }
      
      if (sceneList.length > minRooms && exitPlaced == true) { /* If base # of rooms visited, make all new rooms dead ends */
         this.North = this.South = this.East = this.West = false;
      }
      else if (sceneList.length >= minRooms && exitPlaced == false && dir != UP && dir != DOWN) {
         this.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2] = NEXT_LEVEL;
         exitPlaced = true;
      }
            
      if (this.North == true || dir == SOUTH) {
         this.tiles[0][(ROOM_WID-1)/2] = NORTH;
         if (dir == SOUTH) 
            this.North = scene;
      }
      if (this.South == true || dir == NORTH) {
         this.tiles[ROOM_HIG-1][(ROOM_WID-1)/2] = SOUTH;
         if (dir == NORTH)
            this.South = scene;
      }
      if (this.East == true || dir == WEST) {
         this.tiles[(ROOM_HIG-1)/2][ROOM_WID-1] = EAST;
         this.tiles[(ROOM_HIG-1)/2 - 1][ROOM_WID-1] = 2;
         if (dir == WEST)
            this.East = scene;
      }
      if (this.West == true || dir == EAST) {
         this.tiles[(ROOM_HIG-1)/2][0] = WEST;
         this.tiles[(ROOM_HIG-1)/2 - 1][0] = 2;
         if (dir == EAST)
            this.West = scene;
      }
      if ((this.Up == true && dir != UP) || dir == DOWN) {
         console.log("Creating stairs UP");
         this.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2] = UP;
         this.tiles[(ROOM_HIG-1)/2-1][(ROOM_WID-1)/2] = 1;
         this.tiles[(ROOM_HIG-1)/2-1][(ROOM_WID-1)/2+1] = 1;
         this.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2+1] = 1;
         this.tiles[(ROOM_HIG-1)/2+1][(ROOM_WID-1)/2+1] = 2;
         this.tiles[(ROOM_HIG-1)/2+1][(ROOM_WID-1)/2] = 2;
         if (dir == DOWN) {
            console.log("dir == DOWN");
            this.Up = scene;
            this.Down = false;
         }
      }
      if ((this.Down == true && dir != DOWN) || dir == UP) {
         console.log("Creating stairs DOWN");
         this.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2] = DOWN;
         this.tiles[(ROOM_HIG-1)/2-1][(ROOM_WID-1)/2] = 2;
         this.tiles[(ROOM_HIG-1)/2-1][(ROOM_WID-1)/2-1] = 1;
         this.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2-1] = 1;
         this.tiles[(ROOM_HIG-1)/2+1][(ROOM_WID-1)/2-1] = 2;
         this.tiles[(ROOM_HIG-1)/2+1][(ROOM_WID-1)/2] = 2;
         if (dir == UP) {
            console.log("dir == UP");
            this.Down = scene;
            this.Up = false;
         }
      }
   }, 
   
   makeObstacles: function() {
      var countRow, countCol;
      var isPath, startX, startY, endX, endY;
      var exitCoords = Array();
      var pathFinder = new EasyStar.js();
      var retry = {Value: false};
      var tempTiles = Array(ROOM_HIG);
      var numAttempt = -1;
      
      pathFinder.setAcceptableTiles([0, NEXT_LEVEL, NORTH, SOUTH, EAST, WEST, UP, DOWN]);
      do {
         retry.Value = false;
         numAttempt++;
         
         /* Populate the map with obstacles */
         for (countRow = 0; countRow < ROOM_HIG; countRow++) {
            tempTiles[countRow] = Array(ROOM_WID);
            for (countCol = 0; countCol < ROOM_WID; countCol++) {
               tempTiles[countRow][countCol] = this.tiles[countRow][countCol];
               if (tempTiles[countRow][countCol] == 0 && Math.floor(Math.random() * (10+numAttempt)) == numAttempt) {   //***VARY***
                  tempTiles[countRow][countCol] = 2;
               }
               if (countRow > 0 && tempTiles[countRow-1][countCol] == 2 &&
                   (tempTiles[countRow][countCol] == 1 || tempTiles[countRow][countCol] == 2))
                  tempTiles[countRow-1][countCol] = 1;
            }
         }
         
         pathFinder.setGrid(tempTiles);
         
         /* Establishing the tiles that can't be blocked */
         if (this.North != false) {
            exitCoords.push((ROOM_WID-1)/2);
            exitCoords.push(0);
         }
         if (this.South != false) {
            exitCoords.push((ROOM_WID-1)/2);
            exitCoords.push(ROOM_HIG-1);
         }
         if (this.East != false || (this.Down != false && exitPlaced)) {
            exitCoords.push(ROOM_WID-1);
            exitCoords.push((ROOM_HIG-1)/2);
         }
         if (this.West != false || (this.Up != false && exitPlaced)) {
            exitCoords.push(0);
            exitCoords.push((ROOM_HIG-1)/2);
         }
         if (exitCoords.length <= 2 || sceneList.length == minRooms || sceneList.length == 0 ||
             this.Up != false || this.Down != false) {
            exitCoords.push((ROOM_WID-1)/2);
            exitCoords.push((ROOM_HIG-1)/2);
         }
         
         /* Make sure there is a path to each exit */
         startX = exitCoords.shift();
         startY = exitCoords.shift();
                  
         while (exitCoords.length > 0) {
            endX = exitCoords.shift();
            endY = exitCoords.shift();
            /* The callback makes the loop run again if the open paths weren't found */
            pathFinder.findPath(startX, startY, endX, endY, function(path) {
               if (path == null)
                  retry.Value = true;
            });
            pathFinder.calculate();
         }
         exitCoords.length = 0;
      } while (retry.Value && numAttempt < 5);

      if (numAttempt < 5)     /* Only add the obstacles if a path was found */
         this.tiles = tempTiles;
   }
   
});

/*
 * The EnemyGroup class keeps track of all of the enemies in a single room.
 * Parameters:
 *    maxEnemies = The maximum amount of enemies to be in the room
 *    room = A Room object to check for collisions
 */
EnemyGroup = Class.create(Group, {
   initialize: function(maxEnemies, room, dir) {
      Group.call(this);
      this.numEnemies = 0;
      
      var count, x, y, timeout, valid;
      for (count = 0; count < maxEnemies; count++) {
         if (Math.floor(Math.random() * 2) == 0) {                                                                   //***VARY***
            timeout = 50;
            valid = true;
            do {
               x = GRID * (Math.floor(Math.random() * (ROOM_WID-2)) + 1);
               y = GRID * (Math.floor(Math.random() * (ROOM_HIG-2)) + 1);
               if (room.checkTile(x, y) != 0)
                  valid = false;
               else if (room.collision[y/GRID][x/GRID] != 0)
                  valid = false;
               else if (dir == NORTH && room.checkTile(x, y+GRID) == SOUTH)
                  valid = false;
               else if (dir == SOUTH && room.checkTile(x, y-GRID) == NORTH)
                  valid = false;
               else if (dir == EAST && room.checkTile(x-GRID, y) == WEST)
                  valid = false;
               else if (dir == WEST && room.checkTile(x+GRID, y) == EAST)
                  valid = false;
               else if (dir == UP && room.checkTile(x-GRID, y) == DOWN)
                  valid = false;
               else if (dir == DOWN && room.checkTile(x+GRID, y) == UP)
                  valid = false;
            } while (--timeout > 0 && !valid);
            
            if (timeout > 0) {
               /* Determine which enemy type to place */
               if (Math.floor(Math.random() * 2) == 0)                                                                  //***VARY***
                  this.addChild(new Enemy(x, y, room, "monster1.gif"));
               else
                  this.addChild(new Enemy(x, y, room, "monster2.gif"));
               this.numEnemies++;
               metrics.totalEnemies++;
            }               
         }
      } 
      this.numAlive = this.numEnemies;
   },
   
   removeEnemy: function(toRemove) {
      this.removeChild(toRemove);
      this.numAlive--;
   }, 

});


/* 
 * The Enemy class keeps track of an enemy's stats and responds to the player's
 * actions. It consists of a sprite and a label displaying the enemy's HP.
 * This class assumes that all enemy types have the same animation frames.
 * Parameters:
 *    x = x coordinate of the sprite
 *    y = y coordinate of the sprite
 *    room = the Room object to add the enemies to
 *    type = name of the image file to use for the sprite
 */
Enemy = Class.create(Group, {
   initialize: function(x, y, room, type) {
      Group.call(this);
      
      this.sprite = new Sprite(GRID, GRID);
      this.sprite.image = game.assets["assets/images/" + type];
      this.sprite.x = x;
      this.sprite.y = y;
      this.sprite.frame = [2, 2, 3, 3, 4, 4, 3, 3];
      room.editCollision(this.sprite.x/GRID, this.sprite.y/GRID, 2);
      
      /* Enemy stats (speed must evenly divide the grid length) */
      if (type == "monster1.gif") {                                                                                        //***VARY***
         this.health = this.maxHealth = 20;
         this.strength = 5;
         this.defense = 1;  
         this.turnTimeMax = 32;
         this.speed = 4;
         this.hpDisplay = createLabel(this.health + "/" + this.maxHealth, this.sprite.x, 
                                   this.sprite.y, "10px sans-serif", "rgb(200,200,200)");
      }
      else if (type == "monster2.gif") {                                                                                   //***VARY***
         this.health = this.maxHealth = 15;                                                                                
         this.strength = 3;
         this.defense = 0;   
         this.turnTimeMax = 15;
         this.speed = 8;
         this.hpDisplay = createLabel(this.health + "/" + this.maxHealth, this.sprite.x, 
                                   this.sprite.y+20, "10px sans-serif", "rgb(200,200,200)");
      }
      
      /* Real time movement fields */
      this.turnTime = Math.floor(Math.random() * this.turnTimeMax/2);
      this.isMoving = false;
      this.dx = this.dy = 0;
      
      /* Add sprite and label to group */
      this.addChild(this.sprite);
      this.addChild(this.hpDisplay);

      /* Initialize A* object, used in onTurn to locate the player and move */
      this.pathFinder = new EasyStar.js();
      this.pathFinder.setAcceptableTiles([0]);

      /* Metric helper fields */
      this.hadEncounter = false;
   },
   
   onenterframe: function() {
      if (this.parentNode.parentNode == curScene) { /* Preventing action after the scene has changed */
         if (this.isMoving) {
            this.sprite.x += this.dx;
            this.hpDisplay.x += this.dx;
            this.sprite.y += this.dy;
            this.hpDisplay.y += this.dy;
            if (this.sprite.x % GRID == 0 && this.sprite.y % GRID == 0) {
               if (this.dx == this.speed)
                  map.editCollision(this.sprite.x/GRID - 1, this.sprite.y/GRID, 0);
               else if (this.dx == -this.speed)
                  map.editCollision(this.sprite.x/GRID + 1, this.sprite.y/GRID, 0);
               else if (this.dy == this.speed)
                  map.editCollision(this.sprite.x/GRID, this.sprite.y/GRID - 1, 0);
               else if (this.dy == -this.speed)
                  map.editCollision(this.sprite.x/GRID, this.sprite.y/GRID + 1, 0);
               this.dx = this.dy = 0;
               this.isMoving = false;
            }
         }
         else if (this.health >= 0) {    
            this.turnTime++;
            this.checkHit();
            this.hpDisplay.text = this.health + "/" + this.maxHealth;
            if (this.turnTime >= this.turnTimeMax && player.isMoving == false) {
               this.onTurn();
               this.turnTime -= this.turnTimeMax;
            }
         }
   
         /* On death */
         if (this.health <= 0 && this.sprite.opacity != 0) {
            this.health = -1;
            this.sprite.frame = this.sprite.opacity > 0.8 ? 1 : 0;
            this.sprite.opacity = (this.sprite.opacity - 0.04).toFixed(2);
            this.hpDisplay.opacity = (this.hpDisplay.opacity - 0.04).toFixed(2);
            if (this.sprite.opacity == 0) {
               map.editCollision(this.sprite.x/GRID, this.sprite.y/GRID, 0);
               if (Math.floor(Math.random() * 8) == 0) { // 1/8 chance of an item drop                                  //***VARY***
                  map.items.tiles[this.sprite.y/GRID][this.sprite.x/GRID] = game.getRandomItem();
                  map.items.loadData(map.items.tiles);
               }
               this.parentNode.removeEnemy(this);
            }
         }
      }
   },
   
   onTurn: function() {
      var pathFound = {nextx: null, nexty: null};
      var randomDir;
      
      if (this.parentNode.parentNode != curScene) 
         return;
            
      /* If the player is in range of the enemy's sight, try to find a path to the player */
      if (this.sprite.within(player, GRID*4) && this.health > 0) {                                                      //***VARY***
         this.pathFinder.setGrid(map.collision);
         this.pathFinder.findPath(this.sprite.x/GRID, this.sprite.y/GRID, player.x/GRID, player.y/GRID, function(path) {
            if (path != null && path.length > 1) {
               pathFound.nextx = path[1].x;
               pathFound.nexty = path[1].y;
            }
         });
         this.pathFinder.calculate();         
      
         if (pathFound.nextx != null && pathFound.nexty != null) {   
            /* If the enemy is next to the player, attack */
            if (pathFound.nextx == player.x/GRID && pathFound.nexty == player.y/GRID) {
               if (this.sprite.x > player.x)
                  this.sprite.scaleX = 1;
               else if (this.sprite.x < player.x)
                  this.sprite.scaleX = -1;
               if (!this.hadEncounter) {
                  metrics.enemyEncounters++;
                  this.hadEncounter = true;
               }
               player.takeDamage(game.getDamage(this.strength, player.defense, 100));
            }
            /* Otherwise, move towards player */
            else {
               this.isMoving = true;
               if (this.sprite.x < pathFound.nextx * GRID) {
                  this.dx = this.speed;
                  map.editCollision(this.sprite.x/GRID + 1, this.sprite.y/GRID, 2);
               }
               else if (this.sprite.x > pathFound.nextx * GRID) {
                  this.dx = -this.speed;
                  map.editCollision(this.sprite.x/GRID - 1, this.sprite.y/GRID, 2);
               }
               else if (this.sprite.y < pathFound.nexty * GRID) {
                  this.dy = this.speed;
                  map.editCollision(this.sprite.x/GRID, this.sprite.y/GRID + 1, 2);
               }
               else if (this.sprite.y > pathFound.nexty * GRID) {
                  this.dy = -this.speed;
                  map.editCollision(this.sprite.x/GRID, this.sprite.y/GRID - 1, 2);
               }
               
               if (this.dx < 0 || (this.dx == 0 && this.sprite.x > player.x))
                  this.sprite.scaleX = 1;
               else if (this.dx > 0 || (this.dx == 0 && this.sprite.x < player.x))
                  this.sprite.scaleX = -1;
            }
         }
      }
      /* Otherwise wander around */
      else if (this.health > 0) {   
         randomDir = Math.floor(Math.random() * 4);
         if (randomDir == 0 && map.collision[this.sprite.y/GRID-1][this.sprite.x/GRID] == 0 &&
             map.tiles[this.sprite.y/GRID-1][this.sprite.x/GRID] == 0) {   /* North */
               this.dy = -this.speed;
               this.isMoving = true;
               map.editCollision(this.sprite.x/GRID, this.sprite.y/GRID - 1, 2);
         }
         else if (randomDir == 1 && map.collision[this.sprite.y/GRID+1][this.sprite.x/GRID] == 0 &&
                  map.tiles[this.sprite.y/GRID+1][this.sprite.x/GRID] == 0) {    /* South */
               this.dy = this.speed;
               this.isMoving = true;
               map.editCollision(this.sprite.x/GRID, this.sprite.y/GRID + 1, 2);
         }
         else if (randomDir == 2 && map.collision[this.sprite.y/GRID][this.sprite.x/GRID-1] == 0 &&
                  map.tiles[this.sprite.y/GRID][this.sprite.x/GRID-1] == 0) {    /* West */
            this.dx = -this.speed;
            this.isMoving = true;
            map.editCollision(this.sprite.x/GRID - 1, this.sprite.y/GRID, 2);
            this.sprite.scaleX = 1;
         }
         else if (randomDir == 3 && map.collision[this.sprite.y/GRID][this.sprite.x/GRID+1] == 0 &&
                  map.tiles[this.sprite.y/GRID][this.sprite.x/GRID+1] == 0) {    /* East */
            this.dx = this.speed;
            this.isMoving = true;
            map.editCollision(this.sprite.x/GRID + 1, this.sprite.y/GRID, 2);
            this.sprite.scaleX = -1;
         }
      }

   },
   
   checkHit: function() {
      var dmg = -1;
      if (player.attackCounter == 1 && this.sprite.within(player, GRID*3/2)) {
         if ((player.direction == P_LEFT && this.sprite.x == player.x-GRID && this.sprite.y == player.y) ||
             (player.direction == P_RIGHT && this.sprite.x == player.x+GRID && this.sprite.y == player.y) ||
             (player.direction == P_UP && this.sprite.x == player.x && this.sprite.y == player.y-GRID) ||
             (player.direction == P_DOWN && this.sprite.x == player.x && this.sprite.y == player.y+GRID)) {
            dmg = game.getDamage(player.strength, this.defense, player.accuracy);
            this.health -= dmg
            if (dmg == 0) 
               metrics.enemyMisses++;
            else
               metrics.enemyHits++;
            if (!this.hadEncounter) {
               metrics.enemyEncounters++;
               this.hadEncounter = true;
            }
         }
         if (this.health <= 0) {
            metrics.dmgDealt += dmg + this.health;
//             map.dmgDealt += dmg + this.health;
            this.health = 0;
            metrics.enemiesKilled++;
         }
         else if (dmg != -1) {
            metrics.dmgDealt += dmg;
//             map.dmgDealt += dmg;
         }
            
      }
   }
});

/* On window load */
window.onload = function() {
   game = new Game(WINDOW, WINDOW);
   game.fps = 16;
   game.rootScene.backgroundColor = "black";
   game.preload("assets/images/map.png",
                "assets/images/player.png",
                "assets/images/hud.png",
                "assets/images/items.png",
                "assets/images/monster1.gif",
                "assets/images/monster2.gif");
                
   /* Bind keys (the numbers are ASCII values of the keys) */
   game.keybind(65, 'left');
   game.keybind(68, 'right');
   game.keybind(87, 'up');
   game.keybind(83, 'down');
   game.keybind(74, 'attackLeft');
   game.keybind(76, 'attackRight');
   game.keybind(73, 'attackUp');
   game.keybind(75, 'attackDown');
   game.keybind(77, 'swapItem');
   game.keybind(78, 'usePotion');
   game.keybind(32, 'select');
   
   game.onload = function() {
      var title = createLabel("DUNGEON<br> <br>ADVENTURE", 50, 50, "32px sans-serif");
      var newGame = createLabel("New Game", 50, 150, "14px sans-serif", "red");
      var controls = createLabel("Controls", 50, 175, "14px sans-serif");
      var credits = createLabel("Credits", 50, 200, "14px sans-serif");
      
      game.rootScene.addChild(title);
      game.rootScene.addChild(newGame);
      game.rootScene.addChild(controls);
      game.rootScene.addChild(credits);
      
      /* Creating the controls screen */
      var controlsScene = new Scene();
      controlsScene.backgroundColor = "black";
      
      var controlsTitle = createLabel("CONTROLS", 50, 50, "28px sans-serif");
      var controlsDetails = createLabel("W,A,S,D - Move<br>" +
                                        "I,J,K,L - Attack<br>" +
                                        "N - Use health potion<br>" +
                                        "M - Swap item",
                                        50, 110, "14px sans-serif");
      var controlsToMenu = createLabel("Press space to return to menu", 50, WINDOW-50, "14px sans-serif");
      
      controlsScene.addChild(controlsTitle);
      controlsScene.addChild(controlsDetails);
      controlsScene.addChild(controlsToMenu);
      
      controlsScene.addEventListener(Event.INPUT_START, function() {
         if (game.input.select)
            game.popScene();
      });
      
      /* Creating the credits screen */
      var creditsScene = new Scene();
      creditsScene.backgroundColor = "black";
      
      var creditsTitle = createLabel("CREDITS", 50, 50, "28px sans-serif");
      var creditsDetails = createLabel("Senior Project by Cameron Thibodeaux <br>2014",
                                       50, 110, "14px sans-serif");
      var creditsToMenu = createLabel("Press space to return to menu", 50, WINDOW-50, "14px sans-serif");
      
      creditsScene.addChild(creditsTitle);
      creditsScene.addChild(creditsDetails);
      creditsScene.addChild(creditsToMenu);
      
      creditsScene.addEventListener(Event.INPUT_START, function() {
         if (game.input.select)
            game.popScene();
      });
      
      /* Adding event listeners */
      game.rootScene.addEventListener(Event.INPUT_START, function() {
         if (game.input.select) {
            if (newGame.color == "red")
               game.initLevel(true);
            else if (controls.color == "red")
               game.pushScene(controlsScene);
            else if (credits.color == "red") 
               game.pushScene(creditsScene);
         }
         else if (game.input.up || game.input.left) {
            if (newGame.color == "red") {
               newGame.color = "white";
               credits.color = "red";
            }
            else if (controls.color == "red") {
               controls.color = "white";
               newGame.color = "red";
            }
            else if (credits.color == "red") {
               credits.color = "white";
               controls.color = "red";
            }
         }
         else if (game.input.down || game.input.right) {
            if (newGame.color == "red") {
               newGame.color = "white";
               controls.color = "red";
            }
            else if (controls.color == "red") {
               controls.color = "white";
               credits.color = "red";
            }
            else if (credits.color == "red") {
               credits.color = "white";
               newGame.color = "red";
            }
         }
      });
   };
      
   /*
    * Initializes a new level and creates the first room 
    * Parameters:
    *    fromMenu = True if coming from the main menu, False if coming from another level.
    */
   game.initLevel = function(fromMenu) {
      curScene = new Scene();
      map = new Room(0, null, 0, 0, 0);
      
      if (fromMenu)
         player = new Player(GRID*(ROOM_WID-1)/2, GRID*(ROOM_HIG-1)/2);
         
      curScene.addChild(map);
      curScene.addChild(new Hud());
      curScene.addChild(map.items);
      curScene.addChild(new EnemyGroup(0, map, UP));
      curScene.addChild(player);      
      sceneList.push(curScene);
      metrics.levelInit(player.strength, player.defense, player.health, player.numPotions);
      player.age = 0;
      exitPlaced = false;
      
      if (fromMenu) {
         game.pushScene(curScene);
      }
      else {
         game.replaceScene(curScene);
         player.direction = P_DOWN;
      }
   }
   
   /* 
    * Changes the scene to a different room. If the room already exists, the
    * corresponding scene will be used. If the room has not been visited,
    * a new room and scene will be created and used.
    * Parameters:
    *    dir = The direction the player moves in to get to the new room 
    */
   game.changeRoom = function(dir) {
      var nextScene = curScene;
      var nextRoom;
      var isNewRoom = false;
      var toCheck;
      var count;
      
      curScene.removeChild(player);
      if ((dir == NORTH && map.North == true) || (dir == SOUTH && map.South == true) ||
          (dir == EAST && map.East == true) || (dir == WEST && map.West == true) ||
          (dir == UP && map.Up == true) || (dir == DOWN && map.Down == true)) {
         if (dir == NORTH)
            nextRoom = new Room(dir, curScene, map.xRoom, map.yRoom+1, map.zRoom);
         else if (dir == SOUTH)
            nextRoom = new Room(dir, curScene, map.xRoom, map.yRoom-1, map.zRoom);
         else if (dir == EAST)
            nextRoom = new Room(dir, curScene, map.xRoom+1, map.yRoom, map.zRoom);
         else if (dir == WEST)
            nextRoom = new Room(dir, curScene, map.xRoom-1, map.yRoom, map.zRoom);
         else if (dir == UP)
            nextRoom = new Room(dir, curScene, map.xRoom, map.yRoom, map.zRoom+1);
         else
            nextRoom = new Room(dir, curScene, map.xRoom, map.yRoom, map.zRoom-1);
            
         nextScene = new Scene();
         nextScene.addChild(nextRoom);
         nextScene.addChild(new Hud());
         nextScene.addChild(nextRoom.items);
         nextScene.addChild(new EnemyGroup(5, nextRoom, dir));                                                          //***VARY***
         
         /* Check other rooms for map consistency */
         for (count = 0; count < sceneList.length; count++) {
            toCheck = sceneList[count].firstChild;
            if (toCheck.xRoom == nextRoom.xRoom && toCheck.yRoom == nextRoom.yRoom+1 &&
                toCheck.zRoom == nextRoom.zRoom) { /* Existing room to the north */
               if (toCheck.South == true) {
                  nextRoom.North = sceneList[count];
                  nextRoom.editTile((ROOM_WID-1)/2, 0, NORTH);
                  nextRoom.editCollision((ROOM_WID-1)/2, 0, 0);
                  if (nextRoom.tiles[1][(ROOM_WID-1)/2] == 1 || nextRoom.tiles[1][(ROOM_WID-1)/2] == 2) {
                     nextRoom.editTile((ROOM_WID-1)/2, 1, 0);
                     nextRoom.editCollision((ROOM_WID-1)/2, 0, 0);
                  }
                  toCheck.South = nextScene;
               }
               else {
                  nextRoom.North = false;
                  if (nextRoom.tiles[(ROOM_WID-1)/2][1] == 1 || nextRoom.tiles[(ROOM_WID-1)/2][1] == 2)
                     nextRoom.editTile((ROOM_WID-1)/2, 0, 1)
                  else
                     nextRoom.editTile((ROOM_WID-1)/2, 0, 2)
                  nextRoom.editCollision((ROOM_WID-1)/2, 0, 1);
               }
            }
            if (toCheck.xRoom == nextRoom.xRoom && toCheck.yRoom == nextRoom.yRoom-1 &&
                toCheck.zRoom == nextRoom.zRoom) { /* Existing room to the south */
               if (toCheck.North == true) {
                  nextRoom.South = sceneList[count];
                  nextRoom.editTile((ROOM_WID-1)/2, ROOM_HIG-1, SOUTH);
                  nextRoom.editCollision((ROOM_WID-1)/2, ROOM_HIG-1, 0);
                  if (nextRoom.tiles[ROOM_HIG-2][(ROOM_WID-1)/2] == 1 || nextRoom.tiles[ROOM_HIG-2][(ROOM_WID-1)/2] == 2) {
                     nextRoom.editTile((ROOM_WID-1)/2, ROOM_HIG-2, 0);
                     nextRoom.editCollision((ROOM_WID-1)/2, ROOM_HIG-2, 0);
                  }
                  toCheck.North = nextScene;
               }
               else {
                  nextRoom.South = false;
                  nextRoom.editTile((ROOM_WID-1)/2, ROOM_HIG-1, 1)
                  nextRoom.editCollision((ROOM_WID-1)/2, ROOM_HIG-1, 1);
               }
            }
            if (toCheck.xRoom == nextRoom.xRoom+1 && toCheck.yRoom == nextRoom.yRoom &&
                toCheck.zRoom == nextRoom.zRoom) { /* Existing room to the east */
               if (toCheck.West == true) {
                  nextRoom.East = sceneList[count];
                  nextRoom.editTile(ROOM_WID-1, (ROOM_HIG-1)/2, EAST);
                  nextRoom.editTile(ROOM_WID-1, (ROOM_HIG-1)/2 - 1, 2);
                  nextRoom.editCollision(ROOM_WID-1, (ROOM_HIG-1)/2, 0);
                  if (nextRoom.tiles[(ROOM_HIG-1)/2][ROOM_WID-2] == 1 || nextRoom.tiles[(ROOM_HIG-1)/2][ROOM_WID-2] == 2) {
                     nextRoom.editTile(ROOM_WID-2, (ROOM_HIG-1)/2, 0);
                     nextRoom.editCollision(ROOM_WID-2, (ROOM_HIG-1)/2, 0);
                  }
                  toCheck.West = nextScene;
               }
               else {
                  nextRoom.East = false;
                  nextRoom.editTile(ROOM_WID-1, (ROOM_HIG-1)/2, 1)
                  nextRoom.editTile(ROOM_WID-1, (ROOM_HIG-1)/2 - 1, 1)
                  nextRoom.editCollision(ROOM_WID-1, (ROOM_HIG-1)/2, 1);
               }
            }
            if (toCheck.xRoom == nextRoom.xRoom-1 && toCheck.yRoom == nextRoom.yRoom &&
                toCheck.zRoom == nextRoom.zRoom) { /* Existing room to the west */
               if (toCheck.East == true) {
                  nextRoom.West = sceneList[count];
                  nextRoom.editTile(0, (ROOM_HIG-1)/2, WEST)
                  nextRoom.editTile(0, (ROOM_HIG-1)/2 - 1, 2)
                  nextRoom.editCollision(0, (ROOM_HIG-1)/2, 0);
                  if (nextRoom.tiles[(ROOM_HIG-1)/2][1] == 1 || nextRoom.tiles[(ROOM_HIG-1)/2][1] == 2) {
                     nextRoom.editTile((ROOM_HIG-1)/2, 1, 0);
                     nextRoom.editCollision((ROOM_HIG-1)/2, 1, 0);
                  }
                  toCheck.East = nextScene;
               }
               else {
                  nextRoom.West = false;
                  nextRoom.editTile(0, (ROOM_HIG-1)/2, 1)
                  nextRoom.editTile(0, (ROOM_HIG-1)/2 - 1, 1)
                  nextRoom.editCollision(0, (ROOM_HIG-1)/2, 1);
               }
            }
            if (toCheck.xRoom == nextRoom.xRoom && toCheck.yRoom == nextRoom.yRoom &&
                toCheck.zRoom == nextRoom.zRoom+1) { /* Existing room above */
               if (toCheck.Down == true) {
                  console.log("Existing room above, connected");
                  nextRoom.Up = sceneList[count];
                  
                  nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2, UP);
                  nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2-1, 1);
                  nextRoom.editTile((ROOM_WID-1)/2+1, (ROOM_HIG-1)/2-1, 1);
                  nextRoom.editTile((ROOM_WID-1)/2+1, (ROOM_HIG-1)/2, 1);
                  nextRoom.editTile((ROOM_WID-1)/2+1, (ROOM_HIG-1)/2+1, 2);
                  nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2+1, 2);
                  nextRoom.fixObstacleBlocks();
                  
                  nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2, 0);
                  nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2-1, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2+1, (ROOM_HIG-1)/2-1, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2+1, (ROOM_HIG-1)/2, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2+1, (ROOM_HIG-1)/2+1, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2+1, 1);

                  if (nextRoom.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2-1] == 1 || 
                      nextRoom.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2-1] == 2) {
                     nextRoom.editTile((ROOM_HIG-1)/2, (ROOM_WID-1)/2-1, 0);
                     nextRoom.editCollision((ROOM_HIG-1)/2, (ROOM_WID-1)/2-1, 0);
                  }

                  toCheck.Down = nextScene;
               }
               else {
                  console.log("Existing room above, not connected");
                  nextRoom.Up = false;
                  if (nextRoom.Down == false && nextRoom.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2] != NEXT_LEVEL) {
                     nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2, 0);
                     nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2, 0);
                  }
               }
            }
            if (toCheck.xRoom == nextRoom.xRoom && toCheck.yRoom == nextRoom.yRoom &&
                toCheck.zRoom == nextRoom.zRoom-1) { /* Existing room below */
               if (toCheck.Up == true) {
                  console.log("Existing room below, connected");
                  nextRoom.Down = sceneList[count];
                     
                  nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2, DOWN);
                  nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2-1, 2);
                  nextRoom.editTile((ROOM_WID-1)/2-1, (ROOM_HIG-1)/2-1, 1);
                  nextRoom.editTile((ROOM_WID-1)/2-1, (ROOM_HIG-1)/2, 1);
                  nextRoom.editTile((ROOM_WID-1)/2-1, (ROOM_HIG-1)/2+1, 2);
                  nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2+1, 2);
                  nextRoom.fixObstacleBlocks();
                     
                  nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2, 0);
                  nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2-1, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2-1, (ROOM_HIG-1)/2-1, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2-1, (ROOM_HIG-1)/2, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2-1, (ROOM_HIG-1)/2+1, 1);
                  nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2+1, 1);

                  if (nextRoom.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2+1] == 1 || 
                      nextRoom.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2+1] == 2) {
                     nextRoom.editTile((ROOM_HIG-1)/2, (ROOM_WID-1)/2+1, 0);
                     nextRoom.editCollision((ROOM_HIG-1)/2, (ROOM_WID-1)/2+1, 0);
                  }

                  toCheck.Up = nextScene;
               }
               else {
                  console.log("Existing room below, not connected");
                  nextRoom.Down = false;
                  if (nextRoom.Up == false && nextRoom.tiles[(ROOM_HIG-1)/2][(ROOM_WID-1)/2] != NEXT_LEVEL) {
                     nextRoom.editTile((ROOM_WID-1)/2, (ROOM_HIG-1)/2, 0);
                     nextRoom.editCollision((ROOM_WID-1)/2, (ROOM_HIG-1)/2, 0);
                  }
               }
            }
         }
         
         sceneList.push(nextScene);
         isNewRoom = true;
         metrics.roomsVisited++;
         console.log("New Room #" + sceneList.length);
      }
      
      if (dir == NORTH) {
         if (!isNewRoom) {
            nextScene = map.North;
            nextRoom = nextScene.firstChild;
            console.log("Is old Room");
         }
         player.x = GRID * (ROOM_WID-1)/2;
         player.y = GRID * (ROOM_HIG-2);
      }
      else if (dir == SOUTH) {
         if (!isNewRoom) {
            nextScene = map.South;
            nextRoom = nextScene.firstChild;
            console.log("Is old Room");
         }
         player.x = GRID * (ROOM_WID-1)/2;
         player.y = GRID;
      }
      else if (dir == EAST) {
         if (!isNewRoom) {
            nextScene = map.East;
            nextRoom = nextScene.firstChild;
            console.log("Is old Room");
         }
         player.x = GRID;
         player.y = GRID * (ROOM_HIG-1)/2;
      }
      else if (dir == WEST) {
         if (!isNewRoom) {
            nextScene = map.West;
            nextRoom = nextScene.firstChild;
            console.log("Is old Room");
         }
         player.x = GRID * (ROOM_WID-2);
         player.y = GRID * (ROOM_HIG-1)/2;
      }
      else if (dir == UP) {
         if (!isNewRoom) {
            nextScene = map.Up;
            nextRoom = nextScene.firstChild;
            console.log("Is old Room");
         }
         player.x = GRID * ((ROOM_WID-1)/2 + 1);
         player.y = GRID * (ROOM_HIG-1)/2;
         player.direction = P_RIGHT;
      }
      else if (dir == DOWN) {
         if (!isNewRoom) {
            nextScene = map.Down;
            nextRoom = nextScene.firstChild;
            console.log("Is old Room");
         }
         player.x = GRID * ((ROOM_WID-1)/2 - 1);
         player.y = GRID * (ROOM_HIG-1)/2;
         player.direction = P_LEFT;
      }
      
      nextScene.addChild(player);
      game.replaceScene(nextScene);
      curScene = nextScene;
      map = nextRoom;
      
      metrics.doorsEntered++;
   }, 
   
   /* 
    * Adjusts the player's stats according to what item was picked up.
    * Parameters:
    *    item = frame number of the item that was picked up
    */
   game.processPickup = function(item) {
      if (item == 0) {
         map.items.tiles[player.y/GRID][player.x/GRID] = -1;
         player.numPotions++;
      }
      else if (item == 1)
         player.strength = 5;
      else if (item == 7)
         player.strength = 6;
      else if (item == 8)
         player.strength = 8;
      else if (item == 9)
         player.strength = 10;
      else if (item == 10)
         player.strength = 12;
      else if (item == 11)
         player.strength = 15;
      else if (item == 12)
         player.strength = 18;
      else if (item == 13)
         player.strength = 21;
      else if (item == 14)
         player.defense = 1;
      else if (item == 15)
         player.defense = 2;
      else if (item == 16)
         player.defense = 4;
      else if (item == 17)
         player.defense = 6;
      else if (item == 18)
         player.defense = 9;
      else if (item == 19)
         player.defense = 12;
      else if (item == 20)
         player.defense = 15;
         
      if (item >= 7 && item < 14 || item == 1) {
         map.items.tiles[player.y/GRID][player.x/GRID] = player.sword;
         player.sword = item;
      }
      else if (item >= 14 && item < 21) {
         map.items.tiles[player.y/GRID][player.x/GRID] = player.shield;
         player.shield = item;
      }
      
      map.items.loadData(map.items.tiles);
   }, 
   
   /*
    * Returns the frame of a random item (change constants to vary probability)
    */
   game.getRandomItem = function() {                                                                                 //***VARY***
      var itemFrame;
      itemFrame = Math.floor(Math.random() * 14) + 7;
      itemFrame = Math.floor(itemFrame/7) * 7 + 0 + itemFrame % 2; // Change the itemFrame % # for a different range
      itemFrame = Math.random() < 0.5 ? itemFrame : 0;
      return itemFrame;
   },
   
   /*
    * Returns a random damage value based on the strength of the attacker and
    * the defense of the defender.
    * Parameters:
    *    str = strength stat of the attacker
    *    def = defense stat of the defender
    *    accuracy = chance that the attacker will hit (out of 100)
    */
   game.getDamage = function(str, def, accuracy) {
      var dmg = 0;
      var range = str/2 < 3 ? 3 : str/2;
      if (Math.random() * 100 < accuracy) {
         if (str > def)
            dmg = str + Math.floor(Math.random() * range) - def;
         else 
            dmg = Math.floor(Math.random() * range/2) + 1;
      }
      return dmg;
   },
   
   /* 
    * End the current level and display the metrics.
    * Parameters:
    *    died = True if the level was ended by the player dying.
    */
   game.endLevel = function(died) {
      metrics.calculateAverages();
      metrics.printMetrics();
   
      var results = new Scene();
      results.backgroundColor = "black"
      
      var title;
      if (died) {
         title = createLabel("GAME OVER", 130, 10, "16px sans-serif");
      }
      else {
         title = createLabel("LEVEL COMPLETE", 100, 10, "16px sans-serif");
      }
      
      
      var metricLabel = createLabel("Strength: " + metrics.str + "<br>" +
                                    "Strength change: " + (metrics.str-metrics.strAtStart) + "<br>" +
                                    "Defense: " + metrics.def + "<br>" +
                                    "Defense change: " + (metrics.def-metrics.defAtStart) + "<br>" +
                                    "Damage dealt: " + metrics.dmgDealt + "<br>" +
                                    "Damage taken: " + metrics.dmgTaken + "<br>" +
                                    "Enemies killed: " + metrics.enemiesKilled + " out of " + metrics.totalEnemies + "<br>" +
                                    "Potions held: " + metrics.potionsHeld + "<br>" +
                                    "Potions used: " + metrics.potionsUsed + "<br>" +
                                    "Max health: " + metrics.maxHealth + "<br>" +
                                    "Min health: " + metrics.minHealth + "<br>" +
                                    "Avg health: " + metrics.avgHealth + "<br>" +
                                    "Rooms visited: " + metrics.roomsVisited + "<br>" +
                                    "Doors entered: " + metrics.doorsEntered + "<br>" +
                                    "Total time (seconds): " + metrics.time + "<br>"  +
                                    " <br>" +
                                    "Press space to continue",
                                    30, 40, "10px sans-serif");
      
      results.addChild(title);
      results.addChild(metricLabel);
      
      results.addEventListener(Event.INPUT_START, function() {
         if (game.input.select) {
            curScene = null;
            map = null;
            sceneList.splice(0, sceneList.length);
            
            if (died)
               game.popScene();
            else
               game.initLevel(false);
         }
      });
      
      game.replaceScene(results);
   }
   
   game.start();
};

