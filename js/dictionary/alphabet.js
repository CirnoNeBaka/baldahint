"use strict"

import * as utils from '../utils.js'

const EmptySymbol = "."

const russianLetters = 'абвгдежзийклмнопрстуфхцчшщьыъэюя'
const englishLetters = 'abcdefghijklmnopqrstuvwxyz'

const RussianID = 'russian'
const EnglishID = 'english'

const alphabetLetters = {
    [RussianID]: russianLetters,
    [EnglishID]: englishLetters,
}

function getAlphabetLetters(id) {
    if (!alphabetLetters.hasOwnProperty(id))
        throw new Error(`Unknown alphabet: ${id}`)

    return alphabetLetters[id]
}

class Alphabet {
    constructor(id) {
        this.id = id
        this.letters = utils.lettersOf(getAlphabetLetters(id))
    }

    containsLetter(letter) {
        return this.letters.includes(letter)
    }

    containsWord(word) {
        const letters = Array.isArray(word) ? word : utils.lettersOf(word)
        return letters.every(letter => this.containsLetter(letter))
    }

    save() {
        return this.id;
    }

    load(data) {
        this.id = data
        this.letters = utils.lettersOf(getAlphabetLetters(this.id))
    }
}

// const Russian = new Alphabet(russianLetters)
// const English = new Alphabet(englishLetters)

export {
    EmptySymbol,
    Alphabet,
    RussianID,
    EnglishID,
}
