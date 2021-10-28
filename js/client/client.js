"use strict"

import * as alphabet from '../dictionary/alphabet.js'
import { Field } from '../game/field.js'
import { Game } from '../game/game.js'

function updateFiledViewHack() {
    // dirty hack to update view cell value
    let old = game.currentCell
    game.currentCell = { x: 0, y: 0 }
    game.currentCell = old
}

const fieldSize = 5
let game = new Game(alphabet.Russian, fieldSize)
game.currentCell = { x: 0, y: 0 }

game.setInitialWord("жмудь")

game.addUsedWord("хуй")
game.addUsedWord("пизда")
game.addUsedWord("джигурда")

let gameFieldView = new Vue({
    el: '#mainContainer',
    data: {
        game: game,
        field: game.field,
        usedWordsList: game.usedWordsList(),
        solutionWords: [ "aaa", "bbb", "ccc" ],
        hoveredIndexUsed: -1,
        hoveredIndexSolutions: -1,
    },
    methods: {
        isSelectedCell: function(x, y) {
            return this.game.currentCell.x == x && this.game.currentCell.y == y
        },
        selectCell: function(x, y) {
            this.game.currentCell = { x: x, y: y }
        },
        getCellValue: function(x, y) {
            const value = this.field.get(x, y)
            return value != alphabet.EmptySymbol ? value.toUpperCase() : ' '
        },
        addUsedWord: function() {
            const word = prompt("Add used word:", "")
            if (!word)
                return
            if (!this.game.alphabet.containsWord(word)) {
                alert(`Invalid word: ${word}`)
                return
            }
            this.game.addUsedWord(word)
            this.usedWordsList = this.game.usedWordsList()
        },
        addToWhitelist: function(word) {
            console.log("Add to whitelist:", word)
        },
        addToBlacklist: function(word) {
            console.log("Add to blacklist:", word)
        },
    }
})

document.onkeydown = function(event) {
    event = event || window.event
    console.log(`${event.key} ${event.code} pressed`)

    if (game.alphabet.containsLetter(event.key)) {
        game.field.set(game.currentCell.x, game.currentCell.y, event.key)
        updateFiledViewHack()
    } else if (event.code == 'Space') {
        game.field.set(game.currentCell.x, game.currentCell.y, alphabet.EmptySymbol)
        updateFiledViewHack()
    } else if (event.code == 'ArrowLeft') {
        if (game.currentCell.y > 0)
            game.currentCell = { x: game.currentCell.x, y: game.currentCell.y - 1 }
    } else if (event.code == 'ArrowRight') {
        if (game.currentCell.y < game.field.size - 1)
            game.currentCell = { x: game.currentCell.x, y: game.currentCell.y + 1 }
    } else if (event.code == 'ArrowUp') {
        if (game.currentCell.x > 0)
            game.currentCell = { x: game.currentCell.x - 1, y: game.currentCell.y }
    } else if (event.code == 'ArrowDown') {
        if (game.currentCell.x < game.field.size - 1)
            game.currentCell = { x: game.currentCell.x + 1, y: game.currentCell.y }
    } else if (event.code == 'Enter') {

    }
}