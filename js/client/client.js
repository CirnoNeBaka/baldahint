"use strict"

import * as alphabet from '../dictionary/alphabet.js'
import * as Command from '../game/protocol.js'
import { Field } from '../game/field.js'
import { Game } from '../game/game.js'


const serverUrl = 'http://localhost:3000'
const clientID = 'test'

function updateFiledViewHack() {
    // dirty hack to update view cell value
    let old = game.currentCell
    game.currentCell = { x: 0, y: 0 }
    game.currentCell = old
}

function setFieldLetter(letter) {
    game.field.set(game.currentCell.x, game.currentCell.y, letter)
    updateFiledViewHack()
    sendRequest(
        view,
        Command.SetLetter,
        {
            cell: game.currentCell,
            letter: letter,
        },
        function (view, data) {
            console.log('Letter set!')
        }
    )
}

function sendRequest(view, command, data, callback) {
    $.get(
        serverUrl,
        {
            id: clientID,
            command: command,
            data: data,
        },
        function(rawData) {
            const data = JSON.parse(rawData)
            if (!data) {
                console.error(`Invalid server response:`, data)
                return
            }
            if (data.status != "ok") {
                console.error(`Server responded with an error: ${data.error}`)
                return
            }
            console.log(`Server response:`, data)
            callback(view, data.data)
        }
    ).catch(function (error) {
        console.error(`Error:`, error)
    })
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
        startNewGame: function() {
            const word = prompt('Enter initial word:', 'жмудь')
            if (!word || word.length != 5)
            {
                alert('You need to enter a word that is 5 letters long!')
                return
            }
            sendRequest(view, Command.StartGame,
                {
                    initialWord: word,
                    fieldSize: 5,
                },
                function (view, data) {
                    console.log(`Game started!`, view.$data)
                    view.$data.game.load(data.game)
                    view.$data.usedWordsList = view.$data.game.usedWordsList()
                    view.$data.solutionWords = []
                }
            )
        },
        solve: function() {
            console.log(`solve...`)
            sendRequest(view, Command.Solve,
                {},
                function (view, data) {
                    console.log(`Solved!`)
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
        setFieldLetter(event.key)
    } else if (event.code == 'Space') {
        setFieldLetter(alphabet.EmptySymbol)
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