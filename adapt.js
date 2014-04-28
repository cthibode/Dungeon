/*
 * The Metrics function object keeps track of the player metrics that can be
 * used to determine the player's play style and create a new room/level
 * based on that play style.
 */
var metrics = new function() {
   this.gameInit = function() {
      this.numLevel = 0;
   }

   /*
    * Initializes the metrics at the beginning of each level.
    * Parameters:
    *    playerStr = initial strength stat of the player
    *    playerDef = initial defense stat of the player
    *    playerHealth = initial health of the player
    *    numPotions = initial number of health potions held by the player
    */
   this.levelInit = function(playerStr, playerDef, playerHealth, numPotions) {
      /* Raw data metrics that should be collected during gameplay */
      this.str = playerStr;            // NEEDED?
      this.strAtStart = playerStr;     // NEEDED?
      this.def = playerDef;            // NEEDED?
      this.defAtStart = playerDef;     // NEEDED?
      this.dmgDealt = 0;
      this.dmgTaken = 0;
      this.enemiesKilled = 0;
      this.enemyHits = 0;
      this.enemyMisses = 0;
      this.fastEnemyEncounters = 0;    //NEW
      this.strongEnemyEncounters = 0;  //NEW
      this.totalFastEnemies = 0;       //NEW
      this.totalStrongEnemies = 0;     //NEW
      this.potionsHeld = numPotions;   //NEEDED?
      this.potionsUsed = 0;            //NEEDED?
      this.maxHealth = playerHealth;
      this.minHealth = playerHealth;
      this.avgHealth = playerHealth;   // NOT USED CURRENTLY
      this.roomsVisited = 1;
      this.doorsEntered = 0;  
      this.stepsTaken = 0;
      
      /* Average/other metrics that should not be altered manually */
      this.time = 0;
      this.timeWithOrb = 0;
      this.timePerRoom = 0;
      this.dmgDealtPerRoom = 0;
      this.dmgTakenPerRoom = 0;
      this.dmgDealtPerEnemy = 0;
      this.dmgTakenPerEnemy = 0;
      this.dmgDealtPerEncounter = 0;
      this.dmgTakenPerEncounter = 0;
      this.enemiesFoughtRatio = 0;
      this.killedToEncounteredRatio = 0;
      this.hitsPerKill = 0;
      this.accuracy = 0;
      this.stepsPerRoom = 0;
      // Add more metrics about number of rooms visited in relation to the minimum number of rooms
      // Add metrics relating to number of keys held, total chests, chests opened
      
      /* The misfortune variable determines how well things go for the player. It increases as the
         player holds the orb and decreases as the player is not holding the orb (0-1) */
      this.misfortune = 0;
      
      this.clock = setInterval(function() {
         ++metrics.time;
      }, 1000);
      
      this.numLevel++;
   };
   
   /* Starts to slowly increase misfortune. Call when the player picks up the orb */
   this.takeOrb = function() {
      clearInterval(this.clockOrb);
      this.clockOrb = setInterval(function() {
         ++metrics.timeWithOrb;
         if (metrics.misfortune < 1)
            metrics.misfortune += 0.02;
      }, 1000);
   }
   
   /* Starts to slowly decrease misfortune. Call when the player drops the orb */
   this.dropOrb = function() {
      clearInterval(this.clockOrb);
      this.clockOrb = setInterval(function() {
         if (metrics.misfortune > 0)
            metrics.misfortune -= 0.02;
      }, 1000);
   }
   
   /* ======================================================================= */
   /* Below are the functions that return modified values based on misfortune */
   /* ======================================================================= */
   
   /* Returns the interpolated enemy sight radius (# of tiles) */
   this.getSightRadius = function() {
      var min = 3;      /* Default Value */
      var max = 14;
      return Math.floor((max-min) * this.misfortune + min);
   }
   
   /* Returns the interpolated enemy accuracy (0-1) */
   this.getEnemyAccuracy = function() {
      var min = 0.8;    /* Default Value */
      var max = 1;
      return (max-min) * this.misfortune + min;
   }
   
   /* Returns the interpolated player accuracy (0-1) */
   this.getPlayerAccuracy = function() {
      var min = 0.75;
      var max = 0.9;    /* Default Value */
      return (max-min) * (1-this.misfortune) + min;
   }
   
   /* Returns the interpolated sword/shield break chance (0-1) */
   this.getBreakChance = function() {
      var min = 0.01;   /* Default Value */
      var max = 0.1;
      return (max-min) * this.misfortune + min;
   }
   
   /* Returns the interpolated player attack speed (# of frames) */
   this.getPlayerAttackSpeed = function() {
      var min = 5;      /* Default Value */
      var max = 9;
      return Math.floor((max-min) * this.misfortune + min);
   }
   
   /* Returns the interpolated chance that an enemy will drop an item (0-1) */
   this.getEnemyDropChance = function() {
      var min = 0.15;
      var max = 0.25;   /* Default Value */
      return (max-min) * (1-this.misfortune) + min;
   }
   
   /* Returns the interpolated stress value for AUD music generator */
   this.getAudStress = function() {
      var min = 0.3;    /* Default Value */
      var max = 0.9;
      return (max-min) * this.misfortune + min;
   }
   
   /* Returns the interpolated energy value for AUD music generator */
   this.getAudEnergy = function() {
      var min = 0.2;    /* Default Value */
      var max = 0.8;
      return (max-min) * this.misfortune + min;
   }
   /* ======================================================================= */
   /* Below are the functions that return modified values based on (previous) */
   /* level averages                                                          */
   /* ======================================================================= */
   
   /* Returns the probability of a wall being placed on any given tile. (0-1). 
      The chance is less for the first level. */
   this.getObstacleChance = function() {
      this.calculateAverages();
      var chance = 1/this.timePerRoom + 0.15;   // Comes out to a value between 0.2 - 0.45
      if (this.numLevel == 1)
         chance -= 0.15;
      return chance;
   };
   /* ======================================================================= */
   
   /* 
    * Updates the running average health and increments the time. Must be called once
    * per second to get a correct value for average health and time.
    * Parameters:
    *    curHealth = the health value to add to the average
    */
//    this.updateAvgHealthPerSec = function() {
//       var curHealth = 100;
//       this.avgHealth += (curHealth - this.avgHealth) / ++this.time;
//       this.avgHealth = Math.round(this.avgHealth * 10) / 10;
//    };
   
   /* 
    * Calculate running average values across all previous levels. Call when the 
    * level is over to add the just completed level to the average.
    */
   this.calculateTotalAverages = function() {
      this.TAdmgDealtPerRoom += (this.dmgDealtPerRoom - this.TAdmgDealtPerRoom) / this.numLevel;
   }
   
   /*
    * Calculate the metrics for averages based on the raw data collected.
    */
   this.calculateAverages = function() {
      var totEncounters = this.strongEnemyEncounters + this.fastEnemyEncounters;
      var totEnemies = this.totalStrongEnemies + this.totalFastEnemies;
   
      this.dmgDealtPerRoom = Math.round(this.dmgDealt / this.roomsVisited * 10) / 10;
      this.dmgTakenPerRoom = Math.round(this.dmgTaken / this.roomsVisited * 10) / 10;
      this.dmgDealtPerEnemy = Math.round(this.dmgDealt / totEnemies * 10) / 10;
      this.dmgTakenPerEnemy = Math.round(this.dmgTaken / totEnemies * 10) / 10;
      if (totEncounters == 0) {
         this.dmgDealtPerEncounter = 0;
         this.dmgTakenPerEncounter = 0;
         this.killedToEncounteredRatio = 0;
      }
      else {
         this.dmgDealtPerEncounter = Math.round(this.dmgDealt / totEncounters * 10) / 10;
         this.dmgTakenPerEncounter = Math.round(this.dmgTaken / totEncounters * 10) / 10;
         this.killedToEncounteredRatio = Math.round(this.enemiesKilled / totEncounters * 100) / 100;
      }
      this.enemiesFoughtRatio = Math.round(totEncounters / totEnemies * 100)/ 100;
      this.hitsPerKill = this.enemiesKilled == 0 ? 0 : Math.round(this.enemyHits / this.enemiesKilled * 10) / 10;
      this.accuracy = this.enemyHits == 0 && this.enemyMisses == 0 ? 0 : Math.round(this.enemyHits / (this.enemyHits + this.enemyMisses) * 100) / 100;
      this.timePerRoom = Math.round(this.time / this.roomsVisited * 10) / 10;
      this.stepsPerRoom = Math.round(this.stepsTaken / this.roomsVisited * 10) / 10;
   };

   /*
    * End the level: stop the clocks and print the metric values to the console.
    */
   this.endLevel = function() {
      clearInterval(this.clock);
      clearInterval(this.clockOrb);
   
      console.log("---LEVEL METRICS---");
//       console.log("Strength: " + this.str);
//       console.log("Strength change: " + (this.str-this.strAtStart));
//       console.log("Defense: " + this.def);
//       console.log("Defense change: " + (this.def-this.defAtStart));
//       console.log("Damage dealt: " + this.dmgDealt);
//       console.log("Damage taken: " + this.dmgTaken);
      console.log("Total Strong Enemies: " + this.totalStrongEnemies);
      console.log("Total Fast Enemies: " + this.totalFastEnemies);
      console.log("Enemies killed: " + this.enemiesKilled + " out of " + (this.totalStrongEnemies + this.totalFastEnemies));
      console.log("Enemy hits: " + this.enemyHits);
      console.log("Enemy misses: " + this.enemyMisses);
      console.log("Strong Enemy Encounters: " + this.strongEnemyEncounters);
      console.log("Fast Enemy Encounters: " + this.fastEnemyEncounters);
//       console.log("Potions held: " + this.potionsHeld);
//       console.log("Potions used: " + this.potionsUsed);
//       console.log("Max health: " + this.maxHealth);
//       console.log("Min health: " + this.minHealth);
//       console.log("Avg health: " + this.avgHealth);
//       console.log("Rooms visited: " + this.roomsVisited);
      console.log("Steps taken: " + this.stepsTaken);
      console.log("Total time (seconds): " + this.time);
      console.log("Time with orb (seconds): " + this.timeWithOrb);
      console.log("Misfortune: " + this.misfortune);
      console.log("---LEVEL AVERAGES---");
      console.log("Damage dealt per Room: " + this.dmgDealtPerRoom);
      console.log("Damage taken per Room: " + this.dmgTakenPerRoom);
      console.log("Damage dealt per Enemy: " + this.dmgDealtPerEnemy);
      console.log("Damage taken per Enemy: " + this.dmgTakenPerEnemy);
      console.log("Damage dealt per Encounter: " + this.dmgDealtPerEncounter);
      console.log("Damage taken per Encounter: " + this.dmgTakenPerEncounter);
      console.log("Percentage of enemies fought: " + this.enemiesFoughtRatio * 100 + "%");
      console.log("Percentage of encountered enemies killed: " + this.killedToEncounteredRatio * 100 + "%");
      console.log("Sword hits per kill: " + this.hitsPerKill);
      console.log("Accuracy: " + this.accuracy * 100 + "%");
      console.log("Time per Room: " + this.timePerRoom);
//       console.log("Steps per Room: " + this.stepsPerRoom);
   }

};