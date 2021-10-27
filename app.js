"use strict"

const utils = require("./js/utils.js")
const alphabet = require("./js/dictionary/alphabet.js")
const Dictionary = require("./js/dictionary/parsing.js")
const DictionaryIndex = require("./js/dictionary/index.js")
const Game = require("./js/game/game.js")

const Finder = require("./js/game/finder.js").Finder
const Solution = require("./js/game/finder.js").Solution

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

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        })

        readline.question(`Pick a word...`, indexStr => {
            const index = Number.parseInt(indexStr)
            console.log(`index=${index} ${bestWords.length}`)
            if (index >= 0 && index < bestWords.length)
            {   
                const word = bestWords[index]
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
