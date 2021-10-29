"use strict"

import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as readline from 'readline'

async function saveStrings(strings, filePath) {
    const file = await fsp.open(filePath, 'w')
    for (let i = 0; i < strings.length; ++i)
        await file.write(strings[i] + "\n")
    await file.close()
}

function saveStringsSync(strings, filePath) {
    const file = fs.openSync(filePath, 'w')
    for (let i = 0; i < strings.length; ++i)
        fs.appendFileSync(file, strings[i] + "\n")
    fs.closeSync(file)
}

async function loadStrings(filePath) {
    const fileStream = fs.createReadStream(filePath)
  
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    })
   
    let strings = []
    for await (const line of rl)
        strings.push(line)
    return strings
}

function loadStringsSync(filePath) {
    const file = fs.openSync(filePath, 'r')
    const data = fs.readFileSync(file).toString()
    return data.split('\n')
}

async function saveObject(obj, filePath) {
    const file = await fsp.open(filePath, 'w')
    await file.write(JSON.stringify(obj, null, "\t"))
    await file.close()
}

async function loadObject(filePath) {
    const file = await fsp.open(filePath, 'r')
    const data = await file.readFile()
    const obj = JSON.parse(data)
    await file.close()
    return obj
}

export {
    saveStrings,
    saveStringsSync,
    loadStrings,
    loadStringsSync,
    saveObject,
    loadObject,
}