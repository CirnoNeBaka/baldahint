"use strict"

import * as utils from '../../shared/utils.js'

const example = [
    // "абак",
    // "абоба",
    // "абъебос",
    // "анонимус",
    // "баба",
    // "бабай",
    // "бабайка",
    // "вася",
    // "василий",
    "a",
    "aa",
    "aba",
    "abc",
    "ba",
    "bb",
    "cab"
]

const referenceIndex = {
    index: -1,
    "a": {
        index: 0,
        word: true,
        "a": {
            index: 1,
            word: true
        },
        "b": {
            index: 2,
            "a": {
                index: 2,
                word: true
            },
            "c": {
                index: 3,
                word: true
            }
        }
    },
    "b": {
        index: 4,
        "a": {
            index: 4,
            word: true
        },
        "b": {
            index: 5,
            word: true
        }
    },
    "c": {
        index: 6,
        "a": {
            index: 6,
            "b": {
                index: 6,
                word: true
            }
        }
    }
}

class DictionaryIndex {

    constructor(dictionary) {
        this.root = {}
        dictionary.forEach((word, wordIndex) => {
            let node = this.root
            utils.forEachLetter(word, (letter, letterIndex) => {
                if (!node.hasOwnProperty(letter))
                    node[letter] = { index: wordIndex }

                let letterNode = node[letter]
                if (letterIndex === word.length - 1)
                    letterNode.word = true
                
                node = letterNode
            })
        })
        
        utils.deepFreeze(this.root)
    }

    indexOf(word) {
        let letters = Array.isArray(word) ? word : utils.lettersOf(word)
        let node = this.root

        for (let i = 0; i < letters.length; ++i) {
            const letter = letters[i]
            if (!node.hasOwnProperty(letter))
                return -1

            let letterNode = node[letter]
            if (i === letters.length - 1 && letterNode.word)
                return letterNode.index

            node = letterNode
        }

        return -1
    }

    containsPrefix(prefix) {
        let letters = Array.isArray(prefix) ? prefix : utils.lettersOf(prefix)
        let node = this.root
        for (let i = 0; i < letters.length; ++i) {
            const letter = letters[i]
            if (!node.hasOwnProperty(letter))
                return false

            node = node[letter]
        }
        return true
    }
}

export {
    DictionaryIndex
}