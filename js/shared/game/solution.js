import * as utils from '../utils.js'
import * as alphabet from '../dictionary/alphabet.js'

import { Field } from './field.js'

export class Solution {
    constructor() {
        this.field = new Field()
        this.newLetterCell = { x: 0, y: 0 }
        this.newLetter = alphabet.EmptySymbol
        this.words = []
    }

    addWord(word, cell, letter) {
        let i = 0
        for (; i < this.words.length; ++i) {
            const w = this.words[i]
            if (word == w)
                return
            else if (word.length >= w.length)
                break
        }
        this.words.splice(i, 0, word)
    }

    bestWord() {
        return this.words.length ? this.words[0] : ""
    }

    compare(other) {
        if (this.bestWord().length > other.bestWord().length)
            return -1
        return other.words.length - this.words.length
    }

    toString() {
        let buffer = ""
        buffer += this.field.toString()
        this.words.forEach(word => buffer += `${word} ${word.length}\n`)
        return buffer
    }

    hash() {
        return `${this.newLetter} ${this.newLetterCell.x}:${this.newLetterCell.y}`
    }

    save() {
        return {
            letter: this.newLetter,
            cell: this.newLetterCell,
            words: this.words,
            //field: this.field.save(),
        }
    }

    load(data) {
        this.newLetter = data.letter
        this.newLetterCell = { x: parseInt(data.cell.x), y: parseInt(data.cell.y) }
        this.words = data.words
        //this.field.load(data.field)
    }
}
