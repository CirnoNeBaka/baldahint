"use strict"

import * as utils from '../utils.js'
import * as alphabet from '../dictionary/alphabet.js'
import { Field } from './field.js'

class Game {
    constructor(alphabet, fieldSize) {
        this.alphabet = alphabet
        this.field = new Field()
        this.field.reset(fieldSize)
        this.usedWords = {}
        this.letterCount = 0
    }

    setInitialWord(word) {
        if (word.length != this.field.size)
            throw new Error(`Initial word doesn't fit the field!`)

        const middleRow = Math.floor(this.field.size / 2)
        for (let i = 0; i < this.field.size; ++i)
            this.field.set(middleRow, i, utils.letter(word, i))

        this.letterCount = this.field.size
        this.addUsedWord(word)
    }

    setLetter(x, y, letter) {
        this.field.set(x, y, letter)
        this.updateLetterCount()
    }

    addUsedWord(word) {
        this.usedWords[word] = true
    }

    usedWordsList() {
        return Object.getOwnPropertyNames(this.usedWords).filter(word => this.alphabet.containsWord(word))
    }

    updateLetterCount() {
        this.letterCount = 0
        this.field.forEachCell(value => { if (value != alphabet.EmptySymbol) this.letterCount++ })
    }

    isWordUsed(word) {
        return this.usedWords.hasOwnProperty(word)
    }

    reset() {
        this.usedWords = {}
        this.letterCount = 0
        this.field.reset(this.field.size)
    }

    save() {
        return {
            field: this.field.save(),
            words: Object.getOwnPropertyNames(this.usedWords).filter(prop => prop != "length")
        }
    }

    load(data) {
        if (!data || !data.hasOwnProperty('field') || !data.hasOwnProperty('words'))
            throw new Error('Game: invalid load data:', data)
        
        this.field.load(data.field)
        this.usedWords = data.words.reduce((acc, word) => { acc[word] = true; return acc }, {})
        this.updateLetterCount()
    }
}

export {
    Game
}
