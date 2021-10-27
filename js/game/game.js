"use strict"

const fs = require('fs/promises')

const utils = require("../utils.js")
const alphabet = require("../dictionary/alphabet.js")
const Field = require("./field.js")

class Game {
    constructor(fieldSize) {
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

    addLetter(x, y, letter) {
        this.field.set(x, y, letter)
        this.letterCount++
    }

    addUsedWord(word) {
        this.usedWords[word] = true
    }

    isWordUsed(word) {
        return this.usedWords.hasOwnProperty(word)
    }

    reset() {
        this.usedWords = {}
        this.letterCount = 0
        this.field.reset(this.field.size)
    }

    async save(filePath) {
        const file = await fs.open(filePath, 'w')
        if (!file)
            throw new Error("Failed to save game to file", filePath)

        const data = {
            field: this.field.save(),
            usedWords: this.usedWords,
            letterCount: this.letterCount
        }
        await file.write(JSON.stringify(data, null, "\t"))
        await file.close()
    }

    async load(filePath) {
        const file = await fs.open(filePath, 'r')
        if (!file)
            throw new Error("Failed to load game from file", filePath)

        const json = await file.read()
        await file.close()

        const data = JSON.parse(json)
        if (!data.hasOwnProperty("usedWords") || !data.hasOwnProperty("field"))
            throw new Error("Missing data trying to load game")

        this.usedWords = data.usedWords
        this.letterCount = data.letterCount
        this.field.load(data.field)
    }

    loadFromStrings(strings) {
        this.usedWords = []
        this.field.fromStringArray(strings)

        const middleLine = Math.floor(strings.length / 2)
        console.log(`middleLine=${middleLine}`)
        this.addUsedWord(strings[middleLine])

        this.letterCount = 0
        this.field.forEachCell((value, x, y) => { if (value !== alphabet.EmptySymbol) this.letterCount++ })
    }
}

module.exports = Game
