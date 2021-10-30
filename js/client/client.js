"use strict"

import * as alphabet from '../dictionary/alphabet.js'
import * as Command from '../game/protocol.js'
import { Game } from '../game/game.js'
import { Solution } from '../game/finder.js'
import { FutureSeer } from './seer.js'

function clamp(min, x, max) {
    return Math.min(max, Math.max(x, min))
}

const serverUrl = 'http://localhost:3000'
const clientID = 'test'
const clientVersion = '1.0.0'

const PageStart = 'start'
const PageGame = 'game'

class Client {
    constructor() {
        this.id = clientID
        this.data = {}
        this.view = null
        this.solutions = []
        this.seer = new FutureSeer(this)
        this.reset()
    }

    reset() {
        this.data = {
            client: this,
            savedGameExists: false,
            profiles: [],
            selectedProfile: '',
            alphabet: new alphabet.Alphabet(alphabet.RussianID),
            game: new Game(5),
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
            waitingForServerResponse: false,
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
                    return variant.newLetterCell.x == x && variant.newLetterCell.y == y
                },
                selectCell: function(x, y) {
                    this.$data.currentCell = { x: x, y: y }
                },
                getCellValue: function(x, y) {
                    if (this.$data.selectedVariantIndex != -1)
                    {
                        let variant = this.$data.solutionVariants[this.$data.selectedVariantIndex]
                        if (x == variant.newLetterCell.x && y == variant.newLetterCell.y)
                            return variant.newLetter.toUpperCase()
                    }
                    const value = this.$data.game.field.get(x, y)
                    return value != alphabet.EmptySymbol ? value.toUpperCase() : ' '
                },
                addUsedWord: function() {
                    const word = prompt('Add used word:', '')
                    if (!word)
                        return
                    if (!this.$data.alphabet.containsWord(word)) {
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
                    this.$data.client.sendRequest(this, Command.AddToWhitelist, { word: word }, function(view, data) {})
                },
                addToBlacklist: function(word) {
                    this.$data.client.sendRequest(this, Command.AddToBlacklist, { word: word }, function(view, data) {
                        const solutionIndex = view.$data.solutionWords.indexOf(word)
                        if (solutionIndex >= 0)
                            view.$data.solutionWords.splice(solutionIndex, 1)

                        const usedWordsIndex = view.$data.usedWordsList.indexOf(word)
                        if (usedWordsIndex >= 0)
                            view.$data.usedWordsList.splice(usedWordsIndex, 1)
                    })
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
                            profile: this.$data.selectedProfile,
                            initialWord: word,
                            fieldSize: 5,
                        },
                        function (view, data) {
                            console.log(`Game started!`)
                            view.$data.alphabet.load(data.alphabet)
                            view.$data.game.load(data.game)
                            view.$data.usedWordsList = view.$data.game.usedWordsList()
                            view.$data.client.resetSolutions()
                            view.$data.client.seer.stop()
                            view.$data.currentPage = PageGame
                        }
                    )
                },
                loadGame: function() {
                    this.$data.client.sendRequest(this, Command.LoadGame, {},
                        function (view, data) {
                            console.log(`Game loaded!`)
                            view.$data.alphabet.load(data.alphabet)
                            view.$data.game.load(data.game)
                            view.$data.usedWordsList = view.$data.game.usedWordsList()
                            view.$data.client.resetSolutions()
                            view.$data.client.seer.stop()
                            view.$data.currentPage = PageGame
                        }
                    )
                },
                exitGame: function() {
                    if (!confirm('Do you REALLY want to EXIT the game?'))
                        return

                    this.$data.client.sendRequest(this, Command.ExitGame, { saveGame: true },
                        function (view, data) {
                            console.log(`Game exited!`)
                            view.$data.game.reset()
                            view.$data.usedWordsList = []
                            view.$data.client.resetSolutions()
                            view.$data.client.seer.stop()
                            view.$data.currentPage = PageStart
                        }
                    )
                },
                solve: function() {
                    this.$data.solutionWords = [ 'Waiting...' ]
                    this.$data.client.solve()
                    this.$data.client.resetSolutionSelection()
                },
                selectSolution: function(index) {
                    this.$data.selectedSolutionIndex = index
                    this.$data.selectedVariantIndex = -1
                    const word = this.$data.solutionWords[index]
                    this.$data.solutionVariants = this.$data.client.getSolutionVariants(word)
                    if (this.$data.solutionVariants.length > 0)
                        this.$data.selectedVariantIndex = 0

                    // this.$data.client.sendRequest(this, Command.GetSolutionVariants,
                    //     {
                    //         word: this.$data.solutionWords[index]
                    //     },
                    //     function(view, data) {
                    //         view.$data.solutionVariants = data.variants
                    //         if (data.variants.length > 0)
                    //             view.$data.selectedVariantIndex = 0
                    //     }
                    // )
                },
                selectVariant: function(index) {
                    this.$data.selectedVariantIndex = index
                },
                getSolutionVariantDescription: function(index) {
                    let variant = this.$data.solutionVariants[index]
                    const string = `(${variant.newLetterCell.x}:${variant.newLetterCell.y})`
                    return string
                },
                applyVariant: function(index) {
                    let variant = this.$data.solutionVariants[index]
                    this.$data.client.sendRequest(this, Command.AddWord,
                        {
                            letter: variant.newLetter,
                            cell: { x: variant.newLetterCell.x, y: variant.newLetterCell.y },
                            word: this.$data.solutionWords[this.$data.selectedSolutionIndex],
                        },
                        function(view, data) {
                            view.$data.game.load(data.game)
                            view.$data.usedWordsList = view.$data.game.usedWordsList()
                            view.$data.client.resetSolutions()
                            view.$data.client.seer.stop()
                        }
                    )
                },
                hasNextStepInfo: function(index) {
                    let variant = this.$data.solutionVariants[index]
                    return !!variant.nextStepInfo || this.$data.client.seer.getInfo(variant)
                },
                getNextStepInfo: function(index) {
                    let variant = this.$data.solutionVariants[index]
                    if (this.$data.seer.getInfo(variant))
                        return
                    
                    this.$data.client.sendRequest(this, Command.GetNextStepInfo,
                        {
                            letter: variant.newLetter,
                            cell: { x: variant.newLetterCell.x, y: variant.newLetterCell.y },
                            word: this.$data.solutionWords[this.$data.selectedSolutionIndex],
                        },
                        function(view, data) {
                            view.$data.solutionVariants[index].nextStepInfo = data
                        }
                    )
                },
                getShortNextStepDescription: function(index) {
                    const variant = this.$data.solutionVariants[index]
                    const data = this.$data.client.getNextStepInfo(variant)
                    if (!data)
                        return ''
                    
                    const maxLength = data.maxWordLength
                    return `Next: ${maxLength} (${data.longestWords.filter(word => word.length == maxLength).length})`
                },
                getLongNextStepDescription: function(index) {
                    const variant = this.$data.solutionVariants[index]
                    const data = this.$data.client.getNextStepInfo(variant)
                    if (!data)
                        return ''
                    
                    return `${data.longestWords.join(', ')}`
                },
            }
        })
    }

    sayHello() {
        this.sendRequest(this.view, Command.Hello, { version: clientVersion }, function(view, data){
            console.log(`Server version: ${data.version} (game exists = ${data.gameExists})`)
            view.$data.savedGameExists = data.gameExists

            const serverVersion = data.version
            if (serverVersion != clientVersion)
                console.warn(`Client version ${clientVersion} differs from server version ${serverVersion}! This might be a problem.`)
        })
    }

    getProfiles() {
        this.sendRequest(this.view, Command.GetProfiles, {}, function(view, data){
            view.$data.profiles = data.profiles
            if (data.profiles.length)
                view.$data.selectedProfile = data.profiles[0]
            console.log(`Profiles:`, data.profiles)
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
        this.solutions = []
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
        this.seer.stop()
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
        this.seer.stop()
        this.sendRequest(this.view, Command.Solve,
            {},
            function (view, data) {
                console.log(`Solved!`)
                view.$data.solutionWords = data.words.slice(0, 30)

                view.$data.client.solutions = data.solutions.map(solutionData => {
                    let solution = new Solution()
                    solution.load(solutionData)
                    return solution
                })

                view.$data.client.seer.start()
            }
        )
    }

    getSolutionVariants(word) {
        return this.solutions.filter(solution => solution.words.includes(word))
    }

    getNextStepInfo(variant) {
        if (!!variant.nextStepInfo)
            return variant.nextStepInfo

        return this.seer.getInfo(variant)
    }

    sendRequest(view, command, data, callback) {
        if (command != Command.GetNextStepInfo)
            view.$data.waitingForServerResponse = true

        $.get(
            serverUrl,
            {
                id: this.id,
                command: command,
                data: data,
            },
            function(rawData) {
                view.$data.waitingForServerResponse = false
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
            view.$data.waitingForServerResponse = false
        })
    }

    handleKeyboardEvent(event) {
        console.log(`handleKeyboardEvent`, client.data.currentPage, event)
        if (client.data.currentPage != PageGame)
            return

        event = event || window.event
        console.log(`${event.key} ${event.code} pressed`)
    
        if (client.data.alphabet.containsLetter(event.key)) {
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
client.sayHello()
client.getProfiles()