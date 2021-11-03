"use strict"

import * as fsRegular from 'fs'
import * as fs from 'fs/promises'
import * as readline from 'readline'

import * as utils from '../../shared/utils.js'
import * as serverUtils from '../utils.js'
import * as alphabet from '../../shared/dictionary/alphabet.js'
import { Profile } from '../../shared/dictionary/profile.js'

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

class Dictionary {
    constructor(profile) {
        this.profile = profile
        this.words = []
        this.parsingLog = []
    }

    addWord(word) {
        // if (this.profile.isBlacklisted(word))
        //     return

        let i = this.words.length
        for (; i > 0; --i) {
            if (word == this.words[i - 1]) {
                this.parsingLog.push(`Duplicated word ignored: ${word}`)
                return
            }

            if (word > this.words[i - 1])
                break;
        }
        this.words.splice(i, 0, word)
    }

    removeWord(word) {
        const index = this.words.indexOf(word)
        if (index >= 0)
            this.words.splice(index, 1)
    }

    validateWord(word) {
        return this.profile.alphabet.containsWord(word)
    }

    // async save(filePath) {
    //     // const outFile = await fs.open(filePath, 'w')
    //     // this.words.forEach(async word => {
    //     //     await fs.writeFile(outFile, word)
    //     //     await fs.writeFile(outFile, '\n')
    //     // })
    //     // await fs.close(outFile)
    // }

    // async load(filePath) {
    //     return this.loadSync(filePath)
    //     // this.parsingLog = []
    //     // this.words = []
    //     // const lines = await serverUtils.loadStrings(filePath)
    //     // lines.filter(line => {
    //     //         const valid = this.validateWord(line)
    //     //         if (!valid) this.parsingLog.push(`Invalid word skipped: ${line}`)
    //     //         return valid
    //     //     })
    //     //     .forEach(line => this.addWord(line))
    // }

    loadSync(filePath) {
        if (!fsRegular.existsSync(filePath))
            throw new Error(`Missing words file: ${filePath}!`)

        this.parsingLog = []
        this.words = []
        const lines = serverUtils.loadStringsSync(filePath)
        lines.filter(word => {
                const valid = this.validateWord(word)
                if (!valid)
                    this.parsingLog.push(`Invalid word skipped: ${word}`)
                
                const blacklisted = this.profile.isBlacklisted(word)
                if (blacklisted)
                    this.parsingLog.push(`Blacklisted word skipped: ${word}`)

                return valid && !blacklisted
            })
            .forEach(line => this.addWord(line))
        
        this.profile.getWhitelist().forEach(word => this.addWord(word))
    }

    load() {
        const wordsFilePath = `dictionaries/words/${this.profile.alphabet.id}.txt`
        this.loadSync(wordsFilePath)
    }
}

export {
    Dictionary
}