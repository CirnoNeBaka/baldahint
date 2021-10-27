
//import * as alphabet from "../js/dictionary/alphabet.js"
//import Field from "../js/game/field.js"
import { Game } from "../js/game/game.js"
//const Game = require('../js/game/game.js')

const fieldSize = 5
let game = new Game(fieldSize)

game.setInitialWord("жмудь")

game.addUsedWord("хуй")
game.addUsedWord("пизда")
game.addUsedWord("джигурда")

var app = new Vue({
    el: '#app',
    data: {
        message: 'Hello Vue!',
        usedWords: game.usedWords
    }
})