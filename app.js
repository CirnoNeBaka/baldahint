"use strict"

import * as readline from 'readline'
import * as jsUtil from 'util'

import * as utils from './js/utils.js'
import * as serverUtils from './js/server/utils.js'
import * as alphabet from './js/dictionary/alphabet.js'
import { Dictionary } from './js/dictionary/parsing.js'
import { DictionaryIndex } from './js/dictionary/index.js'
import { Game } from './js/game/game.js'

import { Finder, Solution } from './js/game/finder.js'

const dictionary = new Dictionary(alphabet.Russian)

async function loadDictionary() {
    console.log("Loading dictionary...")
    console.time("load-dictionary")
    await dictionary.load("./dictionaries/processed/nouns.txt")
    console.timeEnd("load-dictionary")
    console.log(`${dictionary.words.length} words in dictionary.\n`)

    console.log("Building dictionary index...")
    console.time("build-index")
    const dictionaryIndex = new DictionaryIndex(dictionary.words)
    console.timeEnd("build-index")
    return dictionaryIndex
}

async function promptInt(prompt) {
    const reader = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    let result = 0
    const question = jsUtil.promisify(reader.question).bind(reader)
    await question(prompt, str => {
        result = Number.parseInt(str)
        reader.close()
    })
    return result
} 

async function startGame() {
    const dictionaryIndex = await loadDictionary()

    const fieldSize = 5
    let game = new Game(alphabet.Russian, fieldSize)
    try {
        game.load(await serverUtils.loadObject('./saves/state.json'))
    } catch (error) {
        console.error("Failed to load game:", error)
        return
    }

    console.log("Game loaded!", game.field.toString())

    let finder = new Finder(game, dictionary, dictionaryIndex)
    console.time("generate-solutions")
    finder.generateWords()
    console.timeEnd("generate-solutions")

    const solutions = finder.getSolutions()
    if (!solutions.length)
    {
        console.log("No solutions!")
        return
    }

    console.log(`${solutions.length} soultions found.`)
    solutions.sort((a, b) => a.compare(b))

    const longestSolutionLength = solutions[0].bestWord().length
    const minShownSolutions = 5
    const maxShownSolutions = 10
    
    // const bestSolutions = solutions.filter((solution, index) =>
    //     (index < minShownSolutions || solution.bestWord().length > longestSolutionLength - 2) && index < maxShownSolutions
    // )
    // console.log(`${bestSolutions.length}/${solutions.length} best soultions shown.`)
    // bestSolutions.forEach((solution, index) => console.log(`----${index}-----\n${solution.toString()}`))

    const bestWords0 = solutions.reduce(
        (acc, s) => {
            s.words.forEach(word => {
                acc[word] = true
            })
            return acc
        },
        new Object()
    )
    console.log("Best words:")
    const bestWords = Object.getOwnPropertyNames(bestWords0)
        .sort(utils.longStringsFirstComparator)
        .filter((_, index) => index < maxShownSolutions)
    
    bestWords.forEach((word, index) => console.log(`${index}: ${word} ${word.length}`))

    const index = await promptInt('Pick a word...\n')
    if (!Number.isInteger(index) || index < 0 || index >= bestWords.length)
        return

    const word = bestWords[index]
    console.log(`Picked ${word}!`)
    game.addUsedWord(word)

    await serverUtils.saveObject(game.save(), './saves/state.json')
    return
}

await startGame()
process.exit(0)
