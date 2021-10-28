"use strict"

import * as alphabet from '../dictionary/alphabet.js'
import { Field } from '../game/field.js'
import { Game } from '../game/game.js'

const serverUrl = 'http://localhost:3000'

function updateFiledViewHack() {
    // dirty hack to update view cell value
    let old = game.currentCell
    game.currentCell = { x: 0, y: 0 }
    game.currentCell = old
}

function handleServerResponse(data) {

}

const fieldSize = 5
const initialWord = "жмудь"
let game = new Game(alphabet.Russian, fieldSize)
game.currentCell = { x: 0, y: 0 }

game.setInitialWord(initialWord)

game.addUsedWord("хуй")
game.addUsedWord("пизда")
game.addUsedWord("джигурда")

let view = new Vue({
    el: '#mainContainer',
    data: {
        game: game,
        field: game.field,
        usedWordsList: game.usedWordsList(),
        solutionWords: [ "атмта", "ололо", "трололо" ],
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
        solve: function() {
            console.log(`solve...`)
            $.get(
                serverUrl,
                {
                    command: "solve",
                    data: this.game.save()
                },
                function(rawData) {
                    const data = JSON.parse(rawData)
                    if (!data || !data.words)
                    {
                        console.log(`Invalid server response:`, data)
                        return
                    }
                    console.log(`Server response:`, data)
                    view.$data.solutionWords = data.words.slice(0, 10)
                }
            )
        }
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

$.get(
    serverUrl,
    {
        command: 'hello',
        data: initialWord,
    },
    function(data) {
       console.log('response: ' + data);
    }
)