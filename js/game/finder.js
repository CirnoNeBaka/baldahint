"use strict"

const utils = require('../utils.js')
const alphabet = require('../dictionary/alphabet.js')
const Dictionary = require('../dictionary/parsing.js')
const DictionaryIndex = require('../dictionary/index.js')
const Field = require('./field.js')
const Game = require('./game.js')

const NotVisited = -1
const HardWordLengthLimit = 12
const EnableDebug = false

function log(message) {
    if (EnableDebug)
        console.log(message)
}

class Step {
    constructor() {
        this.field = undefined
        this.stepIndex = 0
        this.currentCell = {}
        this.currentLetters = []
    }

    init(field, initialCell, stepIndex) {
        this.field = field
        this.stepIndex = stepIndex
        this.currentCell = initialCell
        this.currentLetters = [ field.get(initialCell.x, initialCell.y) ]

        this.visitMask = new Field()
        this.visitMask.reset(field.size, NotVisited)
        this.visitMask.set(initialCell.x, initialCell.y, stepIndex)
    }

    cloneFrom(other) {
        this.field = new Field()
        this.field.cloneFrom(other.field)
        this.stepIndex = other.stepIndex
        this.currentCell = { x: other.currentCell.x, y: other.currentCell.y }
        this.currentLetters = other.currentLetters.slice(0)

        this.visitMask = new Field()
        this.visitMask.cloneFrom(other.visitMask)
    }

    currentWord() {
        return this.currentLetters.join("")
    }

    print() {
        let result = ""
        for (let i = 0; i < this.field.size; ++i) {
            let letters = ""
            let mask = ""
            let cell = ""
            for (let j = 0; j < this.field.size; ++j) {
                const symbol = this.field.get(i, j)
                const flag = this.visitMask.get(i, j)
                letters += symbol == alphabet.EmptySymbol ? "." : symbol
                mask += flag == NotVisited ? "." : flag
            }
            result += `${letters} ${mask}\n`
        }
        result += `(${this.currentCell.x}:${this.currentCell.y}) stepIndex=${this.stepIndex}\n`
        log(result)
    }
}

class Finder {
    constructor(game, dictionary, index) {
        this.game = game
        this.dictionary = dictionary
        this.dictionaryIndex = index
        this.solutions = {}
    }

    maxWordLength() {
        return Math.min(HardWordLengthLimit, Math.min(this.game.letterCount + 1, this.game.field.size * this.game.field.size))
    }

    hasAdjacentLetters(field, x, y) {
        let result = false
        field.forEachAdjacentCell(x, y, (value, x, y) => {
            if (value !== alphabet.EmptySymbol)
                result = true
        })
        return result
    }

    // Генерирует все возможные варианты постановки новой буквы на игровое поле.
    // Результирующие шаги все начинаются с новой буквы.
    generatePossibleFirstSteps() {
        let steps = []
        this.game.field.forEachCell((value, i, j) => {
            if (this.game.field.get(i, j) === alphabet.EmptySymbol && this.hasAdjacentLetters(this.game.field, i, j)) {
                this.dictionary.alphabet.letters.forEach(letter => {
                    let nextField = new Field()
                    nextField.cloneFrom(this.game.field)
                    nextField.set(i, j, letter)
                    
                    let nextStep = new Step()
                    nextStep.init(nextField, {x: i, y: j}, 0)
                    steps.push(nextStep)
                })
            }
        })
        return steps
    }

    // Генерирует все возможные шаги, в которых новая буква стоит в середине слова.
    generatePrefixChains(firstSteps) {
        let chains = []
        const maxLength = this.maxWordLength()
        firstSteps.forEach(step => {
            for (let newLetterIndex = 1; newLetterIndex < maxLength; ++newLetterIndex)
            {
                const originalCell = step.currentCell
                let intermediateStep = new Step()
                intermediateStep.cloneFrom(step)
                intermediateStep.stepIndex = newLetterIndex
                log(`Generating words that have ${step.currentLetters[0]} at index ${newLetterIndex}...`)
                this.nextPrefix(intermediateStep, chains, originalCell, newLetterIndex)
            }
        })
        return chains
    }

    nextPrefix(step, chains, originalCell, newLetterIndex) {
        log(`Trying prefix ${step.currentWord()} ${step.stepIndex} ${step.currentCell.x}:${step.currentCell.y}`)

        step.visitMask.set(step.currentCell.x, step.currentCell.y, step.stepIndex)
        step.print()

        do
        {
            if (step.stepIndex === 0) {
                if (!this.dictionaryIndex.containsPrefix(step.currentLetters))
                {
                    log("No such prefix exists in index")
                    break
                }
                let newStep = new Step()
                newStep.cloneFrom(step)
                newStep.currentCell = { x: originalCell.x, y: originalCell.y }
                newStep.stepIndex = newLetterIndex 
                chains.push(newStep)

                log(`Prefix added ${step.currentWord()}`)
                newStep.print()
                break
            }

            step.field.forEachAdjacentCell(step.currentCell.x, step.currentCell.y, (letter, x, y) => {
                if (false
                    || letter === alphabet.EmptySymbol
                    || step.visitMask.get(x, y) !== NotVisited
                ){
                    return
                }

                const oldCell = { x: step.currentCell.x, y: step.currentCell.y }

                step.stepIndex--
                step.currentCell = { x: x, y: y }
                step.currentLetters.unshift(letter)

                this.nextPrefix(step, chains, originalCell, newLetterIndex)

                step.stepIndex++
                step.currentCell = oldCell
                step.currentLetters.shift()

            })
        } while (false);

        step.visitMask.set(step.currentCell.x, step.currentCell.y, NotVisited)
    }

    nextPostfix(step) {
        log(`Trying word: ${step.currentWord()}`)

        if (this.dictionaryIndex.indexOf(step.currentLetters) !== -1)
        {
            const word = step.currentWord()
            if (!this.game.usedWords.hasOwnProperty(word))
                this.solutions[word] = true
        }

        if (step.currentLetters.length + 1 > this.maxWordLength())
            return

        step.visitMask.set(step.currentCell.x, step.currentCell.y, step.stepIndex)
        step.print()

        step.field.forEachAdjacentCell(step.currentCell.x, step.currentCell.y, (letter, x, y) => {
            if (false
                || letter === alphabet.EmptySymbol
                || step.visitMask.get(x, y) !== NotVisited
            ){
                return
            }

            const oldCell = { x: step.currentCell.x, y: step.currentCell.y }

            step.stepIndex++
            step.currentCell = { x: x, y: y }
            step.currentLetters.push(letter)

            this.nextPostfix(step)

            step.stepIndex--
            step.currentCell = oldCell
            step.currentLetters.pop()
        })

        step.visitMask.set(step.currentCell.x, step.currentCell.y, NotVisited)
    }

    // longestChainLength() {
    //     let firstNonEmptyCell = null
    //     this.game.field.forEachCell((value, x, y) => { if (!firstNonEmptyCell) firstNonEmptyCell = { x: x, y: y} })

    //     let mask = new Field()
    //     mask.reset(this.game.field.size, 0)
    //     let mark = (x, y) => {
            
    //     }
    // }

    generateWords() {
        this.solutions = {}
        const firstSteps = this.generatePossibleFirstSteps()
        const prefixChains = this.generatePrefixChains(firstSteps)
        console.log(`first steps: ${firstSteps.length}, prefix chains: ${prefixChains.length}`)
        firstSteps.concat(prefixChains).forEach(step => {
            log(`--- Step: ${step.currentWord()}`)
            this.nextPostfix(step)
        })
    }

    getSolutions() {
        return Object.getOwnPropertyNames(this.solutions)
    }
}

module.exports = Finder
