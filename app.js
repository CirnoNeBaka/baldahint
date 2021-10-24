"use strict"

const utils = require("./js/utils.js")
const alphabet = require("./js/dictionary/alphabet.js")
const Dictionary = require("./js/dictionary/parsing.js")
const DictionaryIndex = require("./js/dictionary/index.js")
const Game = require("./js/game/game.js")
const Finder = require("./js/game/finder.js")

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

const fieldData = [
    ".....",
    "ш....",
    "кляча",
    "ауп..",
    "п.ш..",
]

async function startGame() {
    const dictionaryIndex = await loadDictionary()

    const fieldSize = 5
    let game = new Game(fieldSize)

    const state = await utils.loadObject('./saves/state.json')
    game.loadFromStrings(state.field)
    state.words.forEach(word => game.addUsedWord(word))

    console.log(game.field.toString())

    let finder = new Finder(game, dictionary, dictionaryIndex)

    console.time("generate-solutions")
    finder.generateWords()
    console.timeEnd("generate-solutions")
    const solutions = finder.getSolutions()
    if (!solutions.length)
    {
        console.log("No solutions!")
    }
    else
    {
        console.log(`${solutions.length} soultions found.`)
        solutions.sort(utils.longStringsFirstComparator)
        const longestSolutionLength = solutions[0].length
        const minShownSolutions = 20
        const bestSolutions = solutions.filter((word, index) => index < minShownSolutions || word.length > longestSolutionLength - 2)
        console.log(`${bestSolutions.length}/${solutions.length} best soultions shown.`)
        bestSolutions.forEach((word, index) => console.log(`${index}: ${word}`))

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        })

        readline.question(`Pick a word...`, indexStr => {
            const index = Number.parseInt(indexStr)
            console.log(`index=${index}`)
            if (index >= 0 && index < bestSolutions.length)
            {   
                const word = bestSolutions[index]
                console.log(`Picked ${word}!`)
                game.addUsedWord(word)   
            }
            readline.close()

            const state = {
                field: game.field.toStringArray(),
                words: Object.getOwnPropertyNames(game.usedWords).filter(prop => prop != "length")
            }
            utils.saveObject(state, './saves/state.json')
        })
    }

    //await game.save('./saves/autosave.json')
}

startGame()
