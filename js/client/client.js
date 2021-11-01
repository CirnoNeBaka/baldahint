"use strict"

import * as alphabet from '../shared/dictionary/alphabet.js'
import * as Command from '../shared/protocol.js'
import { Game } from '../shared/game/game.js'
import { Solution } from '../shared/game/solution.js'
import { FutureSeer } from './seer.js'
import { WordItemFormatter, SolutionItemFormatter } from './vue/itemFormatter.js'

function clamp(min, x, max) {
    return Math.min(max, Math.max(x, min))
}

const serverUrl = 'http://localhost:3000'
const clientID = 'test'
const clientVersion = '1.0.0'

const PageStart = 'start'
const PageGame = 'game'

export class Client {
    constructor() {
        this.id = clientID
        this.data = {}
        this.view = null
        this.solutions = []
        this.seer = new FutureSeer(this)
        this.progressChecker = null
        this.reset()
    }

    reset() {
        this.data = {
            client: this,
            isConnectedToServer: false,
            errorMessage: '',
            savedGameExists: false,
            profiles: [],
            selectedProfile: '',
            alphabet: new alphabet.Alphabet(alphabet.RussianID),
            game: new Game(5),
            currentPage: PageStart,
            currentCell: { x: 0, y: 0 },
            usedWordsList: [],
            solutionWords: [],
            solutionVariants: [],
            solutionVariantsNextSteps: [],
            waitingForServerResponse: false,
            solutionProgress: 0.0,
            usedWordsHeaderButtons: [
                { title: '➕', action: this.addUsedWordManually.bind(this) },   
            ],
            usedWordsItemButtons: [
                { title: '❌', action: this.addToBlacklist.bind(this) },
                { title: '➖', action: this.removeUsedWord.bind(this) },
                { title: '➕', action: this.addToWhitelist.bind(this) },
            ],
            solutionWordsItemButtons: [
                { title: '❌', action: this.addToBlacklist.bind(this) },
            ],
            solutionVariantsItemButtons: [
                { title: '✔️', action: this.applyVariant.bind(this) },
                {
                    title: '❔',
                    action: this.getNextStepInfo.bind(this),
                    isVisible: (function(variant) { return !this.hasNextStepInfo(variant) }).bind(this)
                },
            ],
            solutionWordSelectionHandler: this.selectSolutionWord.bind(this),
            variantSelectionHandler: this.selectVariant.bind(this),
            wordItemFormatter: new WordItemFormatter(),
            solutionItemFormatter: new SolutionItemFormatter(),
            selectedSolutionWord: '',
            selectedVariant: null,
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
                    const variant = this.$data.selectedVariant
                    return variant && variant.newLetterCell.x == x && variant.newLetterCell.y == y
                },
                selectCell: function(x, y) {
                    this.$data.currentCell = { x: x, y: y }
                },
                getCellValue: function(x, y) {
                    const variant = this.$data.selectedVariant
                    if (variant
                        && x == variant.newLetterCell.x
                        && y == variant.newLetterCell.y
                    ){
                        return variant.newLetter.toUpperCase()
                    }
                    const value = this.$data.game.field.get(x, y)
                    return value != alphabet.EmptySymbol ? value.toUpperCase() : ' '
                },
                startNewGame: function() {
                    this.$data.client.startNewGame()
                },
                loadGame: function() {
                    this.$data.client.loadGame()
                },
                exitGame: function() {
                    this.$data.client.exitGame()
                },
                solve: function() {
                    this.$data.solutionWords = [ 'Waiting...' ]
                    this.$data.client.solve()
                    this.$data.client.resetSolutionSelection()
                },
            }
        })
    }

    sayHello() {
        this.sendRequest(this, Command.Hello, { version: clientVersion }, function(client, data){
            console.log(`Server version: ${data.version} (game exists = ${data.gameExists})`)
            client.data.savedGameExists = data.gameExists

            const serverVersion = data.version
            if (serverVersion != clientVersion)
                console.warn(`Client version ${clientVersion} differs from server version ${serverVersion}! This might be a problem.`)
        })
    }

    getProfiles() {
        this.sendRequest(this, Command.GetProfiles, {}, function(client, data){
            client.data.profiles = data.profiles
            if (data.profiles.length)
                client.data.selectedProfile = data.profiles[0]
            console.log(`Profiles:`, data.profiles)
        })
    }

    startNewGame() {
        const word = prompt('Enter initial word:', 'жмудь')
        if (!word || word.length != 5)
        {
            alert('You need to enter a word that is 5 letters long!')
            return
        }
        this.sendRequest(this, Command.StartGame,
            {
                profile: this.data.selectedProfile,
                initialWord: word,
                fieldSize: 5,
            },
            function (client, data) {
                console.log(`Game started!`)
                client.data.alphabet.load(data.alphabet)
                client.data.game.load(data.game)
                client.data.usedWordsList = client.data.game.usedWordsList()
                client.resetSolutions()
                client.seer.stop()
                client.data.currentPage = PageGame
            }
        )
    }

    loadGame() {
        this.sendRequest(this, Command.LoadGame, {},
            function (client, data) {
                console.log(`Game loaded!`)
                client.data.alphabet.load(data.alphabet)
                client.data.game.load(data.game)
                client.data.usedWordsList = view.$data.game.usedWordsList()
                client.resetSolutions()
                client.seer.stop()
                clientw.data.currentPage = PageGame
            }
        )
    }

    exitGame() {
        if (!confirm('Do you REALLY want to EXIT the game?'))
            return

        this.sendRequest(this, Command.ExitGame, { saveGame: true },
            function (client, data) {
                console.log(`Game exited!`)
                client.data.game.reset()
                client.data.usedWordsList = []
                client.resetSolutions()
                client.seer.stop()
                client.data.currentPage = PageStart
            }
        )
    }

    resetSolutionSelection() {
        this.data.selectedSolutionWord = null
        this.view.$refs.solutions.resetSelection()
        this.resetVariants()
    }

    resetVariantSelection() {
        this.data.selectedVariant = null
        this.view.$refs.variants.resetSelection()
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
        this.resetVariantSelection()
        this.seer.stop()
        this.data.game.field.set(this.data.currentCell.x, this.data.currentCell.y, letter)
        this.updateFieldViewHack()
        this.sendRequest(
            this,
            Command.SetLetter,
            {
                cell: this.data.currentCell,
                letter: letter,
            },
            function (client, data) {
                console.log('Letter set!')
            }
        )
    }

    solve() {
        this.seer.stop()
        this.sendRequest(this, Command.Solve,
            {},
            function (client, data) {
                console.log(`Solved!`)
                clearInterval(client.updateChecker)
                client.data.solutionWords = data.words.slice(0, 30)

                client.solutions = data.solutions.map(solutionData => {
                    let solution = new Solution()
                    solution.load(solutionData)
                    return solution
                })

                client.seer.start()
                client.updateChecker = setInterval(client.updateProgress.bind(client), 500)
            }
        )
    }

    addUsedWordManually() {
        const word = prompt('Add used word:', '')
        if (!word)
            return

        if (!this.data.alphabet.containsWord(word)) {
            alert(`Invalid word: ${word}`)
            return
        }

        if (this.data.solutionWords.includes(word)) {
            this.data.solutionWords.splice(this.data.solutionWords.indexOf(word), 1)
            this.resetSolutionSelection()
        }

        this.sendRequest(this, Command.AddUsedWord,
            {
                word: word,
            },
            function(client, data) {
                client.data.game.load(data.game)
                client.data.usedWordsList = client.data.game.usedWordsList()
            }
        )
    }

    removeUsedWord(word) {
        const index = this.data.usedWordsList.indexOf(word)
        if (index >= 0)
            this.data.usedWordsList.splice(index, 1)
    }

    addToWhitelist(word) {
        this.sendRequest(this, Command.AddToWhitelist, { word: word }, function(client, data) {})
    }

    addToBlacklist(word) {
        this.sendRequest(this, Command.AddToBlacklist, { word: word }, function(client, data) {
            const solutionIndex = client.data.solutionWords.indexOf(word)
            if (solutionIndex >= 0) {
                client.resetSolutionSelection()
                client.data.solutionWords.splice(solutionIndex, 1)
            }

            const usedWordsIndex = client.data.usedWordsList.indexOf(word)
            if (usedWordsIndex >= 0)
                client.data.usedWordsList.splice(usedWordsIndex, 1)
        })
    }

    selectSolutionWord(word) {
        this.data.selectedSolutionWord = word
        this.data.solutionVariants = this.getSolutionVariants(word)
        if (this.data.solutionVariants.length > 0) {
            const firstVariant = this.data.solutionVariants[0]
            this.view.$refs.variants.selectItem(firstVariant)
            this.data.selectedVariant = firstVariant
        }
    }

    selectVariant(variant) {
        console.log(`selectVariant ${variant.hash()}`)
        this.data.selectedVariant = variant
    }

    applyVariant(variant) {
        const word = this.view.$refs.solutions.$data.selectedItem
        this.sendRequest(this, Command.AddWord,
            {
                letter: variant.newLetter,
                cell: { x: variant.newLetterCell.x, y: variant.newLetterCell.y },
                word: word,
            },
            function(client, data) {
                client.data.game.load(data.game)
                client.data.usedWordsList = client.data.game.usedWordsList()
                client.resetSolutions()
                client.seer.stop()
            }
        )
    }

    updateProgress() {
        // todo: progress updates require asynchronous solution finding
    }

    getSolutionVariants(word) {
        return this.solutions.filter(solution => solution.words.includes(word))
    }

    hasNextStepInfo(variant) {
        return !!variant.nextStepInfo || !!this.seer.getInfo(variant)
    }

    getNextStepInfo(variant) {
        if (!!variant.nextStepInfo)
            return variant.nextStepInfo

        const cachedInfo = this.seer.getInfo(variant)
        if (cachedInfo) {
            variant.nextStepInfo = cachedInfo
            return cachedInfo
        }

        const word = this.view.$refs.solutions.$data.selectedItem
        this.sendRequest(this, Command.GetNextStepInfo,
            {
                letter: variant.newLetter,
                cell: { x: variant.newLetterCell.x, y: variant.newLetterCell.y },
                word: word,
            },
            function(client, data) {
                variant.nextStepInfo = data
                client.seer.cacheInfo(variant, data)
            }
        )
    }

    sendRequest(client, command, data, callback) {
        console.log(`send request: ${command}`, data)
        if (command != Command.GetNextStepInfo)
            client.data.waitingForServerResponse = true

        $.get(
            serverUrl,
            {
                id: this.id,
                command: command,
                data: data,
            },
            function(rawData) {
                client.data.waitingForServerResponse = false
                client.data.isConnectedToServer = true
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
                callback(client, data.data)
            }
        ).catch(function (error) {
            console.error(`Request error:`, error)
            client.data.waitingForServerResponse = false
            client.data.isConnectedToServer = false
            client.data.errorMessage = 'Server connection lost'
        })
    }

    handleKeyboardEvent(event) {
        console.log(`handleKeyboardEvent`, this.data.currentPage, event)
        if (this.data.currentPage != PageGame)
            return

        event = event || window.event
        console.log(`${event.key} ${event.code} pressed`)
    
        if (this.data.alphabet.containsLetter(event.key)) {
            this.setFieldLetter(event.key)
        } else if (event.code == 'Space' || event.code == 'Backspace' || event.code == 'Delete') {
            this.setFieldLetter(alphabet.EmptySymbol)
        } else if (event.code == 'ArrowLeft') {
            this.moveSelection(0, -1)
        } else if (event.code == 'ArrowRight') {
            this.moveSelection(0, 1)
        } else if (event.code == 'ArrowUp') {
            this.moveSelection(-1, 0)
        } else if (event.code == 'ArrowDown') {
            this.moveSelection(1, 0)
        } else if (event.code == 'Enter') {
            this.solve()
        }
    }
}