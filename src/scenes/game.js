import Phaser from 'phaser';

import sky from '../assets/sky.png';
import ground from '../assets/platform.png';
import dude from '../assets/dude.png';

import firebase from 'firebase/app';
import 'firebase/database';
import _ from 'lodash';

// Add your firebase configs here
var config = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: ""
};


class Game extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
    firebase.initializeApp(config);
    this.database = firebase.database();
    this.playerNumber = Math.random().toString().split('.')[1];
    this.previousX = 0;
    this.previousY = 0;
    this.updatePlayerPositions.bind(this.updatePlayerPositions);
    this.allPlayers = {};
  }

  preload() {
    this.load.image('sky', sky);
    this.load.image('ground', ground);
    this.load.spritesheet('dude', dude, { frameWidth: 32, frameHeight: 48 });
    console.log(this.database);
  }

  create() {
    // add Sky background sprit
    this.add.image(400, 300, 'sky');

    // Create ground platforms
    this.allPlayersGroup = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.platforms
      .create(400, 568, 'ground')
      .setScale(2)
      .refreshBody();
    this.platforms.create(600, 400, 'ground');
    this.platforms.create(50, 250, 'ground');
    this.platforms.create(750, 220, 'ground');

    // Create Player
    this.player = this.physics.add.sprite(100, 450, 'dude');
    this.player.body.setGravityY(300);
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);

    // Create player animation
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'turn',
      frames: [{ key: 'dude', frame: 4 }],
      frameRate: 20,
    });

    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });

    // set collides between Player and grounds
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.allPlayersGroup);

    var thisPlayerRef = firebase.database().ref('players/' + this.playerNumber);
    thisPlayerRef.onDisconnect().set({});
    var playersRef = firebase.database().ref('players');
    playersRef.on('value', (snapshot) => {
      this.updatePlayerPositions(snapshot.val());
    });
    
  }

  updatePlayerPositions(data) {
    Object.keys(this.allPlayers).forEach(characterKey => {
      if (!data[characterKey]) {
        this.allPlayers[characterKey].destroy();
      }
    })

    Object.keys(data).forEach(characterKey => {
      if (this.allPlayers[characterKey] && characterKey != this.playerNumber) {
        const incomingData = data[characterKey];
        const existingCharacter = this.allPlayers[characterKey];
        existingCharacter.x = incomingData.x;
        existingCharacter.y = incomingData.y;
        existingCharacter.body.velocity.x = 0;
        existingCharacter.body.velocity.y = 0;
        existingCharacter.anims.play(incomingData.animation, true);
      } else if (!this.allPlayers[characterKey] && characterKey != this.playerNumber) {
        const newCharacterData = data[characterKey];
        var newCharacter = this.physics.add.sprite(newCharacterData.x, newCharacterData.y, 'dude');
        this.physics.add.collider(newCharacter, this.platforms);
        this.physics.add.collider(this.player, newCharacter);
        this.allPlayers[characterKey] = newCharacter;
      } else {
      }
    })
    
  }

  update() {
    // Create movement controller
    this.cursors = this.input.keyboard.createCursorKeys();
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play('left', true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play('right', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('turn');
    }

    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-450);
    }

    if (Math.round(this.player.x) != this.previousX || Math.round(this.player.Y) != this.previousY) {
      firebase.database().ref('players/' + this.playerNumber).set({playerNumber: this.playerNumber, x: Math.round(this.player.x), y: Math.round(this.player.y), animation: this.player.anims.currentAnim.key});
    }
    this.previousX = Math.round(this.player.x);
    this.previousY = Math.round(this.player.y);
  }
}

export default Game;
