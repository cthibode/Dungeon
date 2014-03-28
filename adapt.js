/*
 * The Metrics function object keeps track of the player metrics that can be
 * used to determine the player's play style and create a new room/level
 * based on that play style.
 */
var Metrics = function() {
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
      this.str = playerStr;
      this.strAtStart = playerStr;
      this.def = playerDef;
      this.defAtStart = playerDef;
      this.dmgDealt = 0;
      this.dmgTaken = 0;
      this.enemiesKilled = 0;
      this.enemyHits = 0;
      this.enemyMisses = 0;
      this.enemyEncounters = 0;
      this.totalEnemies = 0;
      this.potionsHeld = numPotions;
      this.potionsUsed = 0;
      this.maxHealth = playerHealth;
      this.minHealth = playerHealth;
      this.avgHealth = playerHealth;
      this.roomsVisited = 1;
      this.doorsEntered = 0;  
      this.stepsTaken = 0;
      this.time = 0;
      
      /* Average metrics that are computed using the previous values */
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
   };
   
   /* 
    * Updates the running average health and increments the time. Must be called once
    * per second to get a correct value for average health and time.
    * Parameters:
    *    curHealth = the health value to add to the average
    */
   this.updateAvgHealthPerSec = function(curHealth) {
      this.avgHealth += (curHealth - this.avgHealth) / ++this.time;
      this.avgHealth = Math.round(this.avgHealth * 10) / 10;
   };
   
   /*
    * Calculate the metrics for averages based on the raw data collected.
    */
   this.calculateAverages = function() {
      this.dmgDealtPerRoom = Math.round(this.dmgDealt / this.roomsVisited * 10) / 10;
      this.dmgTakenPerRoom = Math.round(this.dmgTaken / this.roomsVisited * 10) / 10;
      this.dmgDealtPerEnemy = Math.round(this.dmgDealt / this.totalEnemies * 10) / 10;
      this.dmgTakenPerEnemy = Math.round(this.dmgTaken / this.totalEnemies * 10) / 10;
      this.dmgDealtPerEncounter = Math.round(this.dmgDealt / this.enemyEncounters * 10) / 10;
      this.dmgTakenPerEncounter = Math.round(this.dmgTaken / this.enemyEncounters * 10) / 10;
      this.enemiesFoughtRatio = Math.round(this.enemyEncounters / this.totalEnemies *100)/ 100;
      this.killedToEncounteredRatio = Math.round(this.enemiesKilled / this.enemyEncounters * 100) / 100;
      this.hitsPerKill = this.enemiesKilled == 0 ? 0 : Math.round(this.enemyHits / this.enemiesKilled * 10) / 10;
      this.accuracy = this.enemyHits == 0 && this.enemyMisses == 0 ? 0 : Math.round(this.enemyHits / (this.enemyHits + this.enemyMisses) * 100) / 100;
      this.timePerRoom = Math.round(this.time / this.roomsVisited * 10) / 10;
      this.stepsPerRoom = Math.round(this.stepsTaken / this.roomsVisited * 10) / 10;
   };

   /*
    * Print the metric values to the console.
    */
   this.printMetrics = function() {
      console.log("---LEVEL METRICS---");
      console.log("Strength: " + this.str);
      console.log("Strength change: " + (this.str-this.strAtStart));
      console.log("Defense: " + this.def);
      console.log("Defense change: " + (this.def-this.defAtStart));
      console.log("Damage dealt: " + this.dmgDealt);
      console.log("Damage taken: " + this.dmgTaken);
      console.log("Enemies killed: " + this.enemiesKilled + " out of " + this.totalEnemies);
      console.log("Enemy hits: " + this.enemyHits);
      console.log("Enemy misses: " + this.enemyMisses);
      console.log("Enemy encounters: " + this.enemyEncounters);
      console.log("Potions held: " + this.potionsHeld);
      console.log("Potions used: " + this.potionsUsed);
      console.log("Max health: " + this.maxHealth);
      console.log("Min health: " + this.minHealth);
      console.log("Avg health: " + this.avgHealth);
      console.log("Rooms visited: " + this.roomsVisited);
      console.log("Steps taken: " + this.stepsTaken);
      console.log("Total time (seconds): " + this.time);
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
      console.log("Steps per Room: " + this.stepsPerRoom);
   }

};