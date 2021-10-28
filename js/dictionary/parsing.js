"use strict"

import * as fsRegular from 'fs'
import * as fs from 'fs/promises'
import * as readline from 'readline'

import * as utils from '../utils.js'
import * as serverUtils from '../server/utils.js'
import * as alphabet from './alphabet.js'

async function forEachFileLine(inputPath, filterFunction, processorFunction) {
    const fileStream = fsRegular.createReadStream(inputPath)
  
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    })
   
    for await (const line of rl)
        if (filterFunction(line))
            processorFunction(line)
}

function removeBlankLines(inPath, outPath)
{
    let outFile = fs.openSync(outputPath, 'w')
    forEachFileLine(
        inPath,
        line => line.length,
        line => {
            fs.writeFileSync(outFile, line)
            fs.writeFileSync(outFile, '\n')
        }
    )
    fs.closeSync(outFile)
}

// removeBlankLines(
//     "../../dictionaries/raw/nouns.txt",
//     "../../dictionaries/processed/nouns.txt"
// )

class Dictionary {

    constructor(alphabet) {
        this.alphabet = alphabet
        this.words = []
        this.parsingLog = []
    }

    addWord(word) {
        if (!this.words.length)
        {
            this.words.push(word)
            return
        }

        let i = this.words.length - 1
        for (; i >= 0; --i) {
            if (word == this.words[i]) {
                this.parsingLog.push(`Duplicated word ignored: ${word}`)
                return
            }

            if (word > this.words[i])
                break;
        }
        this.words.splice(i + 1, 0, word)
    }

    removeWord(word) {
        const index = this.words.indexOf(word)
        if (index >= 0)
            this.words.splice(index, 1)
    }

    validateWord(word) {
        return this.alphabet.containsWord(word)
    }

    async save(filePath) {
        const outFile = await fs.open(filePath, 'w')
        this.words.forEach(async word => {
            await fs.writeFile(outFile, word)
            await fs.writeFile(outFile, '\n')
        })
        await fs.close(outFile)
    }

    async load(filePath) {
        this.parsingLog = []
        this.words = []
        const lines = await serverUtils.loadStrings(filePath)
        lines.filter(line => {
                const valid = this.validateWord(line)
                if (!valid) this.parsingLog.push(`Invalid word skipped: ${line}`)
                return valid
            })
            .forEach(line => this.addWord(line))
    }
}

export {
    Dictionary
}