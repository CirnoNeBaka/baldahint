"use strict"

import * as alphabet from '../dictionary/alphabet.js'
import * as Command from '../game/protocol.js'
import { Field } from '../game/field.js'
import { Game } from '../game/game.js'

function clamp(min, x, max) {
    return Math.min(max, Math.max(x, min))
}

const serverUrl = 'http://localhost:3000'
const clientID = 'test'

const PageStart = 'start'
const PageGame = 'game'

class Client {
    constructor() {
        this.id = clientID
        this.data = {}
        this.view = null
        this.reset()
    }

    reset() {
        this.data = {
            client: this,
            game: new Game(alphabet.Russian, 5),
            currentPage: PageStart,
            currentCell: { x: 0, y: 0 },
            solutionWords: [],
            solutionVariants: [],
            solutionVariantsNextSteps: [],
            usedWordsList: [],
            hoveredIndexUsed: -1,
            hoveredSolutionIndex: -1,
            selectedSolutionIndex: -1,
            hoveredVariantIndex: -1,
            selectedVariantIndex: -1,
        }
    }

    setupView() {
        this.view = new Vue({
            el: '#mainContainer',
            data: this.data,
            methods: {
                isSelectedCell: function(x, y) {
                    return this.$data.currentCell.x == x && this.$data.currentCell.y == y
                },
                isVariantCell: function(x, y) {
                    if (this.$data.selectedVariantIndex == -1)
                        return false
                    let variant = this.$data.solutionVariants[this.$data.selectedVariantIndex]
                    return variant.cell.x == x && variant.cell.y == y
                },
                selectCell: function(x, y) {
                    this.$data.currentCell = { x: x, y: y }
                },
                getCellValue: function(x, y) {
                    if (this.$data.selectedVariantIndex != -1)
                    {
                        let variant = this.$data.solutionVariants[this.$data.selectedVariantIndex]
                        if (x == variant.cell.x && y == variant.cell.y)
                            return variant.letter.toUpperCase()
                    }
                    const value = this.$data.game.field.get(x, y)
                    return value != alphabet.EmptySymbol ? value.toUpperCase() : ' '
                },
                addUsedWord: function() {
                    const word = prompt("Add used word:", "")
                    if (!word)
                        return
                    if (!this.$data.game.alphabet.containsWord(word)) {
                        alert(`Invalid word: ${word}`)
                        return
                    }
                    if (this.$data.solutionWords.includes(word)) {
                        this.$data.solutionWords.splice(this.$data.solutionWords.indexOf(word), 1)
                        this.$data.client.resetSolutionSelection()
                    }

                    this.$data.client.sendRequest(this, Command.AddUsedWord,
                        {
                            word: word,
                        },
                        function(view, data) {
                            view.$data.game.load(data.game)
                            view.$data.usedWordsList = view.$data.game.usedWordsList()
                        }
                    )
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
                    this.$data.client.sendRequest(this, Command.StartGame,
                        {
                            initialWord: word,
                            fieldSize: 5,
                        },
                        function (view, data) {
                            console.log(`Game started!`)
                            view.$data.game.load(data.game)
                            view.$data.game.alphabet = new alphabet.Alphabet(data.alphabet)
                            view.$data.usedWordsList = view.$data.game.usedWordsList()
                            view.$data.client.resetSolutions()
                            view.$data.currentPage = PageGame
                        }
                    )
                },
                solve: function() {
                    console.log(`solve...`)
                    this.$data.client.solve()
                    this.$data.client.resetSolutionSelection()
                },
                selectSolution: function(index) {
                    this.$data.selectedSolutionIndex = index
                    this.$data.selectedVariantIndex = -1
                    this.$data.client.sendRequest(this, Command.GetSolutionVariants,
                        {
                            word: this.$data.solutionWords[index]
                        },
                        function(view, data) {
                            view.$data.solutionVariants = data.variants
                            if (data.variants.length > 0)
                                view.$data.selectedVariantIndex = 0
                        }
                    )
                },
                selectVariant: function(index) {
                    this.$data.selectedVariantIndex = index
                },
                getSolutionVariantDescription: function(index) {
                    let variant = this.$data.solutionVariants[index]
                    const string = `(${variant.cell.x}:${variant.cell.y})`
                    return string
                },
                applyVariant: function(index) {
                    let variant = this.$data.solutionVariants[index]
                    this.$data.client.sendRequest(this, Command.AddWord,
                        {
                            letter: variant.letter,
                            cell: { x: variant.cell.x, y: variant.cell.y },
                            word: this.$data.solutionWords[this.$data.selectedSolutionIndex],
                        },
                        function(view, data) {
                            view.$data.game.load(data.game)
                            view.$data.usedWordsList = view.$data.game.usedWordsList()
                            view.$data.client.resetSolutions()
                        }
                    )
                },
                getNextStepInfo: function(index) {
                    let variant = this.$data.solutionVariants[index]
                    this.$data.client.sendRequest(this, Command.GetNextStepInfo,
                        {
                            letter: variant.letter,
                            cell: { x: variant.cell.x, y: variant.cell.y },
                            word: this.$data.solutionWords[this.$data.selectedSolutionIndex],
                        },
                        function(view, data) {
                            view.$data.solutionVariants[index].nextStepInfo = data
                        }
                    )
                },
                getShortNextStepDescription: function(index) {
                    const data = this.$data.solutionVariants[index].nextStepInfo
                    if (!data)
                        return ''
                    
                    const maxLength = data.maxWordLength
                    return `Next: ${maxLength} (${data.longestWords.filter(word => word.length == maxLength).length})`
                },
                getLongNextStepDescription: function(index) {
                    const data = this.$data.solutionVariants[index].nextStepInfo
                    if (!data)
                        return ''
                    
                    return `${data.longestWords.join(', ')}`
                },
            }
        })
    }

    resetSolutionSelection() {
        this.resetVariants()
        this.data.selectedSolutionIndex = -1
        this.data.hoveredSolutionIndex = -1
    }

    resetVariantSelection() {
        this.data.selectedVariantIndex = -1
        this.data.hoveredVariantIndex = -1
    }

    resetSolutions() {
        this.resetVariants()
        this.resetSolutionSelection()
        this.data.solutionWords = []
    }

    resetVariants() {
        this.resetVariantSelection()
        this.data.solutionVariants = []
        this.data.solutionVariantsNextSteps = []
    }

    updateFieldViewHack() {
        // dirty hack to update view cell value
        let old = this.data.currentCell
        this.data.currentCell = { x: 0, y: 0 }
        this.data.currentCell = old
    }

    moveSelection(xDelta, yDelta) {
        const newX = clamp(0, this.data.currentCell.x + xDelta, this.data.game.field.size - 1)
        const newY = clamp(0, this.data.currentCell.y + yDelta, this.data.game.field.size - 1)
        this.data.currentCell = { x: newX, y: newY }
    }

    setFieldLetter(letter) {
        this.data.game.field.set(this.data.currentCell.x, this.data.currentCell.y, letter)
        this.updateFieldViewHack()
        this.sendRequest(
            this.view,
            Command.SetLetter,
            {
                cell: this.data.currentCell,
                letter: letter,
            },
            function (view, data) {
                console.log('Letter set!')
            }
        )
    }

    solve() {
        this.sendRequest(this.view, Command.Solve,
            {},
            function (view, data) {
                console.log(`Solved!`)
                view.$data.solutionWords = data.words.slice(0, 10)
            }
        )
    }

    sendRequest(view, command, data, callback) {
        $.get(
            serverUrl,
            {
                id: this.id,
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
            console.error(`Request error:`, error)
        })
    }

    handleKeyboardEvent(event) {
        console.log(`handleKeyboardEvent`, client.data.currentPage, event)
        if (client.data.currentPage != PageGame)
            return

        event = event || window.event
        console.log(`${event.key} ${event.code} pressed`)
    
        if (client.data.game.alphabet.containsLetter(event.key)) {
            client.setFieldLetter(event.key)
        } else if (event.code == 'Space') {
            client.setFieldLetter(alphabet.EmptySymbol)
        } else if (event.code == 'ArrowLeft') {
            client.moveSelection(0, -1)
        } else if (event.code == 'ArrowRight') {
            client.moveSelection(0, 1)
        } else if (event.code == 'ArrowUp') {
            client.moveSelection(-1, 0)
        } else if (event.code == 'ArrowDown') {
            client.moveSelection(1, 0)
        } else if (event.code == 'Enter') {
            client.solve()
        }
    }
}

let client = new Client()
document.onkeydown = client.handleKeyboardEvent
client.setupView()
